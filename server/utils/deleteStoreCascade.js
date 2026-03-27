/**
 * Hard-delete one outlet (Store) and all database records scoped to that store.
 * Used when an owner deletes an outlet (Premium) and for full shop teardown (superadmin).
 *
 * Order matters: remove staff users from chats, clear references, delete Staff rows
 * before deleting User accounts; then delete store-scoped collections; finally the Store.
 */

const mongoose = require('mongoose');
const Store = require('../models/Store');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const Sale = require('../models/Sale');
const Inventory = require('../models/Inventory');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Purchase = require('../models/Purchase');
const KhataTransaction = require('../models/KhataTransaction');
const Notification = require('../models/Notification');

/**
 * @param {import('mongoose').Types.ObjectId|string} storeId
 * @param {object} [options]
 * @param {import('mongoose').Types.ObjectId|string} [options.ownerId] - Owner user id (default: from Store)
 * @returns {Promise<{ storeName: string, deletedCounts: object }>}
 */
async function deleteStoreCascade(storeId, options = {}) {
    const storeObjectId = mongoose.Types.ObjectId.isValid(storeId)
        ? new mongoose.Types.ObjectId(storeId)
        : storeId;
    const sidStr = storeObjectId.toString();

    const store = await Store.findById(storeObjectId).select('ownerId name').lean();
    if (!store) {
        const err = new Error('Store not found');
        err.code = 'STORE_NOT_FOUND';
        throw err;
    }

    const ownerId = options.ownerId || store.ownerId;
    const ownerObjectId = ownerId instanceof mongoose.Types.ObjectId ? ownerId : new mongoose.Types.ObjectId(ownerId);

    const staffMembers = await Staff.find({ storeId: storeObjectId }).select('userId').lean();
    const staffUserIds = staffMembers.map((s) => s.userId).filter(Boolean);

    // 1) Remove deleted staff from group chats (e.g. "All Outlet Staffs" with outletId: null)
    if (staffUserIds.length > 0) {
        await Chat.updateMany(
            { participants: { $in: staffUserIds } },
            { $pullAll: { participants: staffUserIds } }
        );
    }

    // 2) Remove per-store "recent sales read" badge key for owner and staff
    await User.updateMany(
        {
            $or: [
                { _id: ownerObjectId },
                { shopId: ownerObjectId },
                { _id: { $in: staffUserIds } },
            ],
        },
        { $unset: { [`salesLastReadAt.${sidStr}`]: '' } }
    );

    // 3) Anyone still pointing at this store as active context
    await User.updateMany(
        { activeStoreId: storeObjectId },
        { $unset: { activeStoreId: '' } }
    );

    // 4) Staff collection before User accounts (avoid orphan Staff rows)
    const staffRecordsDeleted = await Staff.deleteMany({ storeId: storeObjectId });

    const staffUsersDeleted = staffUserIds.length
        ? await User.deleteMany({ _id: { $in: staffUserIds } })
        : { deletedCount: 0 };

    // 5) All store-scoped collections in parallel
    const [
        attendanceRes,
        salesRes,
        inventoryRes,
        customersRes,
        suppliersRes,
        purchasesRes,
        khataRes,
        notificationsRes,
        chatsRes,
    ] = await Promise.all([
        Attendance.deleteMany({ storeId: storeObjectId }),
        Sale.deleteMany({ storeId: storeObjectId }),
        Inventory.deleteMany({ storeId: storeObjectId }),
        Customer.deleteMany({ storeId: storeObjectId }),
        Supplier.deleteMany({ storeId: storeObjectId }),
        Purchase.deleteMany({ storeId: storeObjectId }),
        KhataTransaction.deleteMany({ storeId: storeObjectId }),
        Notification.deleteMany({ storeId: storeObjectId }),
        Chat.deleteMany({ outletId: storeObjectId }),
    ]);

    await Store.findByIdAndDelete(storeObjectId);

    return {
        storeName: store.name,
        deletedCounts: {
            staffUserAccounts: staffUsersDeleted.deletedCount || 0,
            staffRecords: staffRecordsDeleted.deletedCount || 0,
            attendance: attendanceRes.deletedCount || 0,
            sales: salesRes.deletedCount || 0,
            inventory: inventoryRes.deletedCount || 0,
            customers: customersRes.deletedCount || 0,
            suppliers: suppliersRes.deletedCount || 0,
            purchases: purchasesRes.deletedCount || 0,
            khataTransactions: khataRes.deletedCount || 0,
            notifications: notificationsRes.deletedCount || 0,
            chats: chatsRes.deletedCount || 0,
        },
    };
}

module.exports = { deleteStoreCascade };

const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');
const Staff = require('../models/Staff');
const Store = require('../models/Store');
const User = require('../models/User');
const { sendPushNotification } = require('../services/firebaseAdmin');

const router = express.Router();

/**
 * UTILITY: emitAlert
 * Saves the alert to the DB first for persistence, then pushes via Socket for real-time.
 * UPDATED: Smart notification targeting - excludes the actor from their own action notifications.
 * Only sends notifications to managers and cashiers (excluding the person who performed the action).
 */
const emitAlert = async (req, storeId, type, data) => {
    const io = req.app.get('socketio');
    let title = '';
    let category = 'Info';
    let message = '';
    let metadata = {};
    const storeIdStr = storeId.toString();
    const actorId = req.user._id; // Track who performed the action
    const pushTraceId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[Push][${pushTraceId}] emitAlert start type=${type} store=${storeIdStr} actor=${actorId?.toString?.() || 'unknown'} role=${req.user?.role || 'unknown'}`);
    
    // Always get ownerId from the store to ensure accuracy (especially for staff actions)
    // This will be set after we fetch the store below

    switch (type) {
        case 'inventory_low':
            title = 'Low Stock Alert';
            category = 'Critical';
            message = `Low stock alert: ${data.name} (${data.quantity} remaining)`;
            metadata = { 
                itemId: data._id,
                variantId: data.variantId || null
            };
            break;
        case 'credit_exceeded':
            title = 'Credit Limit Reached';
            category = 'Urgent';
            message = data.message || `${data.customerName || data.name || 'Customer'} has reached their credit limit.`;
            metadata = { customerId: data._id || data.customerId };
            break;
        case 'inventory_added':
            title = 'Inventory Added';
            category = 'Info';
            message = data.message || `${data.name || 'Item'} added to inventory.`;
            metadata = data._id ? { itemId: data._id } : {};
            break;
        case 'inventory_updated':
            title = 'Inventory Updated';
            category = 'Info';
            message = data.message || `${data.name || 'Item'} updated in inventory.`;
            metadata = data._id ? { itemId: data._id } : {};
            break;
        case 'inventory_price_updated':
            title = 'Price Updated';
            category = 'Info';
            message = data.message || `${data.name || 'Item'} price was updated.`;
            metadata = {
                ...(data._id ? { itemId: data._id } : {}),
                oldPrice: data.oldPrice ?? null,
                newPrice: data.newPrice ?? null
            };
            break;
        case 'inventory_deleted':
            title = 'Inventory Deleted';
            category = 'Info';
            message = data.message || `${data.name || 'Item'} deleted from inventory.`;
            metadata = data._id ? { itemId: data._id } : {};
            break;
        case 'purchase_recorded':
            title = 'Purchase Recorded';
            category = 'Info';
            message = data.message || `New purchase recorded: ${data.productName || 'Product'}`;
            metadata = { 
                purchaseId: data.purchaseId || null,
                itemId: data.itemId || null
            };
            break;
        case 'ledger_payment':
            title = 'Payment Received';
            category = 'Info';
            message = data.message || `Payment of ₹${data.amount || 0} received from ${data.customerName || 'Customer'}.`;
            metadata = { 
                customerId: data.customerId || null,
                transactionId: data.transactionId || null
            };
            break;
        case 'ledger_credit':
            title = 'Credit Given';
            category = 'Info';
            message = data.message || `Credit of ₹${data.amount || 0} given to ${data.customerName || 'Customer'}.`;
            metadata = { 
                customerId: data.customerId || null,
                transactionId: data.transactionId || null
            };
            break;
        case 'credit_sale':
            title = 'Credit Sale';
            category = 'Info';
            message = data.message || `Credit sale of ₹${(data.amount || 0).toFixed(2)} to ${data.customerName || 'Customer'}.`;
            metadata = { 
                customerId: data.customerId || null,
                saleId: data.saleId || data.transactionId || null,
                amount: data.amount || null
            };
            break;
        case 'success':
            title = 'Stock Updated';
            category = 'Info';
            message = data.message || 'Operation successful.';
            metadata = data._id ? { itemId: data._id } : {};
            break;
        case 'profile_updated':
            title = 'Business Info Updated';
            category = 'Info';
            message = data.message || 'Store business information was updated by a manager.';
            metadata = data.storeId ? { storeId: data.storeId } : {};
            break;
        case 'customer_added':
            title = 'New Customer Added';
            category = 'Info';
            message = data.message || 'A new customer was added to the ledger.';
            metadata = data.customerId ? { customerId: data.customerId } : {};
            break;
        case 'inventory_bulk_upload':
            title = 'Inventory Bulk Upload';
            category = 'Info';
            message = data.message || `${data.count ?? 0} items were added to inventory via bulk upload.`;
            metadata = data.count != null ? { count: data.count } : {};
            break;
        case 'credit_limit_updated':
            title = 'Credit Limit Updated';
            category = 'Info';
            message = data.message || `Credit limit for ${data.customerName || 'customer'} updated to ₹${(data.newLimit ?? 0).toLocaleString('en-IN')} by ${data.actorName || 'user'}.`;
            metadata = data.customerId ? { customerId: data.customerId } : {};
            break;
        case 'attendance_punch_in':
            title = 'Attendance Update';
            category = 'Info';
            message = data.message || `${data.staffName || 'Staff'} punched in.`;
            metadata = {
                attendanceId: data.attendanceId || null,
                staffId: data.staffId || null
            };
            break;
        case 'attendance_break_start':
            title = 'Attendance Update';
            category = 'Info';
            message = data.message || `${data.staffName || 'Staff'} started a break.`;
            metadata = {
                attendanceId: data.attendanceId || null,
                staffId: data.staffId || null
            };
            break;
        case 'attendance_break_end':
            title = 'Attendance Update';
            category = 'Info';
            message = data.message || `${data.staffName || 'Staff'} ended break.`;
            metadata = {
                attendanceId: data.attendanceId || null,
                staffId: data.staffId || null,
                breakMinutes: data.breakMinutes ?? null
            };
            break;
        case 'attendance_punch_out':
            title = 'Attendance Update';
            category = 'Info';
            message = data.message || `${data.staffName || 'Staff'} punched out.`;
            metadata = {
                attendanceId: data.attendanceId || null,
                staffId: data.staffId || null,
                workingMinutes: data.workingMinutes ?? null
            };
            break;
        default:
            title = 'System Notification';
            category = 'Info';
            message = data.message || 'New system update.';
    }

    try {
        // Get store name and ownerId to include in notification
        const store = await Store.findById(storeIdStr).select('name ownerId').lean();
        if (!store || !store.ownerId) {
            console.error(`❌ Store not found or has no ownerId for storeId: ${storeIdStr}`);
            return null;
        }
        
        const storeName = store.name || 'Store';
        const ownerId = store.ownerId; // Always use ownerId from store (most accurate)

        // Only prefix [Store Name] for Premium plan (multiple outlets); Basic/Pro have one store, no need to specify
        let finalMessage = message;
        const owner = await User.findById(ownerId).select('plan').lean();
        const isPremium = (owner?.plan || '').toUpperCase() === 'PREMIUM';
        if (isPremium && storeName && storeName !== 'Store') {
            finalMessage = `[${storeName}] ${message}`;
        }
        
        const newNotification = await Notification.create({
            storeId: storeIdStr,
            ownerId: ownerId, // Use ownerId from store (always correct)
            actorId: actorId, // Store who performed the action
            type,
            category,
            title,
            message: finalMessage, // Include store name in message
            metadata,
            readBy: [], // Ensure this is initialized as empty
            createdAt: new Date()
        });

        if (io) {
            // Smart notification targeting: Only send to relevant users, excluding the actor
            try {
                const actorIdStr = actorId.toString();
                const actorRole = req.user.role || null; // 'owner', 'Manager', 'Cashier'

                // Ledger payment: notify owner + all active staff
                const isLedgerPayment = type === 'ledger_payment';
                // Credit sale: notify only owner and manager(s), not cashiers
                const isCreditSale = type === 'credit_sale';
                const isBulkUpload = type === 'inventory_bulk_upload';
                const isCreditLimitUpdated = type === 'credit_limit_updated';
                const isInventoryPriceUpdated = type === 'inventory_price_updated';
                const isInventoryFieldUpdate = type === 'inventory_updated' || type === 'inventory_price_updated';
                const isAttendanceEvent = [
                    'attendance_punch_in',
                    'attendance_break_start',
                    'attendance_break_end',
                    'attendance_punch_out'
                ].includes(type);
                const actorRoleLower = (actorRole || '').toLowerCase();

                // Get all managers and cashiers for this store (needed for default and cashier-reported)
                const staffMembers = await Staff.find({
                    storeId: storeIdStr,
                    role: { $in: ['Manager', 'Cashier'] },
                    active: true
                }).select('userId role').lean();

                const targetUserIds = new Set();
                const isLowStockAlert = type === 'inventory_low';

                // Low stock: notify ALL users including the actor (person who added/updated should also be informed)
                if (isLowStockAlert) {
                    if (store && store.ownerId) targetUserIds.add(store.ownerId.toString());
                    staffMembers.forEach(staff => {
                        if (staff.userId) targetUserIds.add(staff.userId.toString());
                    });
                }

                // Price update: notify owner + all managers, including actor (owner/manager).
                if (!isLowStockAlert && isInventoryPriceUpdated && store && store.ownerId) {
                    targetUserIds.add(store.ownerId.toString());
                    staffMembers.forEach(staff => {
                        if (staff.role === 'Manager' && staff.userId) {
                            targetUserIds.add(staff.userId.toString());
                        }
                    });
                }

                // Inventory field updates (price/reorder/stock): always notify owner + all staff.
                if (!isLowStockAlert && isInventoryFieldUpdate && store && store.ownerId) {
                    targetUserIds.add(store.ownerId.toString());
                    staffMembers.forEach(staff => {
                        if (staff.userId) targetUserIds.add(staff.userId.toString());
                    });
                }

                // Bulk upload: Manager/Cashier → notify owner only; Owner → notify managers and cashiers
                if (!isLowStockAlert && isBulkUpload) {
                    const ownerIdStr = store?.ownerId?.toString();
                    if (actorRoleLower === 'owner') {
                        staffMembers.forEach(staff => {
                            if (staff.userId) targetUserIds.add(staff.userId.toString());
                        });
                    } else {
                        if (ownerIdStr && ownerIdStr !== actorIdStr) targetUserIds.add(ownerIdStr);
                    }
                }

                // Credit limit updated (ledger limit): Owner → Manager+Cashier; Manager → Owner+Cashier; Cashier → Owner+Manager
                if (!isLowStockAlert && isCreditLimitUpdated && store && store.ownerId) {
                    const ownerIdStr = store.ownerId.toString();
                    if (actorRoleLower === 'owner') {
                        // Owner updated: notify all staff (managers and cashiers)
                        staffMembers.forEach(staff => {
                            if (staff.userId) targetUserIds.add(staff.userId.toString());
                        });
                    } else if ((actorRole || '').toLowerCase() === 'manager') {
                        // Manager updated: notify owner and all cashiers
                        if (ownerIdStr !== actorIdStr) targetUserIds.add(ownerIdStr);
                        staffMembers.forEach(staff => {
                            if (staff.role === 'Cashier' && staff.userId && staff.userId.toString() !== actorIdStr) targetUserIds.add(staff.userId.toString());
                        });
                    } else if ((actorRole || '').toLowerCase() === 'cashier') {
                        // Cashier updated: notify owner and all managers
                        if (ownerIdStr !== actorIdStr) targetUserIds.add(ownerIdStr);
                        staffMembers.forEach(staff => {
                            if (staff.role === 'Manager' && staff.userId && staff.userId.toString() !== actorIdStr) targetUserIds.add(staff.userId.toString());
                        });
                    }
                }

                // Owner default targeting (ledger payments handled separately).
                if (!isLowStockAlert && !isBulkUpload && !isCreditLimitUpdated && !isInventoryPriceUpdated && store && store.ownerId) {
                    const ownerIdStr = store.ownerId.toString();
                    if (isLedgerPayment || ownerIdStr !== actorIdStr) {
                        targetUserIds.add(ownerIdStr);
                        if (isCreditSale) {
                            console.log(`📢 Credit sale: Owner ${ownerIdStr} will receive notification.`);
                        } else {
                            console.log(`📢 Owner ${ownerIdStr} will receive notification (actor: ${actorIdStr})`);
                        }
                    } else {
                        console.log(`📢 Owner ${ownerIdStr} is the actor, skipping self-notification`);
                    }
                } else {
                    console.warn(`⚠️ Store ${storeIdStr} has no ownerId, owner will not receive notification`);
                }

                // Staff targeting:
                // - ledger_payment: notify all staff (manager + cashier)
                // - credit_sale: notify only managers (not cashiers)
                // Skip for bulk upload and credit_limit_updated (handled above).
                if (!isLowStockAlert && !isBulkUpload && !isCreditLimitUpdated && !isInventoryPriceUpdated) {
                    staffMembers.forEach(staff => {
                        if (staff.userId) {
                            const staffUserIdStr = staff.userId.toString();
                            if (isAttendanceEvent) {
                                if (staffUserIdStr !== actorIdStr) targetUserIds.add(staffUserIdStr);
                                return;
                            }
                            if (isLedgerPayment) {
                                if (staffUserIdStr !== actorIdStr) targetUserIds.add(staffUserIdStr);
                                return;
                            }
                            if (staffUserIdStr !== actorIdStr) {
                                // Credit sale: only add managers, not cashiers
                                if (isCreditSale) {
                                    if (staff.role === 'Manager') targetUserIds.add(staffUserIdStr);
                                } else {
                                    targetUserIds.add(staffUserIdStr);
                                }
                            }
                        }
                    });
                    if (isLedgerPayment) {
                        console.log('📢 Ledger payment: Owner and all active staff will receive notification.');
                    }
                    if (isAttendanceEvent) {
                        console.log('📢 Attendance event: Owner and all active staff will receive notification.');
                    }
                    if (isInventoryFieldUpdate) {
                        console.log('📢 Inventory update: Owner and all active staff will receive notification.');
                    }
                    if (isCreditSale) {
                        console.log(`📢 Credit sale: Manager(s) will receive notification.`);
                    }
                }

                // Prepare notification data with store name
                const notificationData = { 
                    ...newNotification.toObject(), 
                    isRead: false,
                    storeName: storeName // Include store name in notification data
                };
                
                if (targetUserIds.size === 0) {
                    console.log('📢 No notification recipients after actor exclusion.');
                }

                // Emit to specific user rooms instead of broadcasting to all
                targetUserIds.forEach(userId => {
                    io.to(`user_${userId}`).emit('new_notification', notificationData);
                });

                // Push notifications to target users
                if (targetUserIds.size > 0) {
                    const recipients = await User.find({ _id: { $in: [...targetUserIds] } })
                        .select('deviceTokens email role')
                        .lean();
                    const allTokens = recipients.flatMap(u => (u.deviceTokens || []).map(d => d.token));
                    const dedupedTokens = [...new Set(allTokens.filter(Boolean))];
                    const recipientSummary = recipients.map((u) => ({
                        user: u._id?.toString?.() || '',
                        role: u.role || '',
                        email: u.email || '',
                        tokenCount: Array.isArray(u.deviceTokens) ? u.deviceTokens.length : 0,
                        tokenTails: (u.deviceTokens || []).map(dt => `...${String(dt.token || '').slice(-10)}`)
                    }));
                    console.log(`[Push][${pushTraceId}] Notification targets=${targetUserIds.size} recipientDocs=${recipients.length} rawTokens=${allTokens.length} uniqueTokens=${dedupedTokens.length}`);
                    console.log(`[Push][${pushTraceId}] Recipient token map:`, recipientSummary);
                    if (allTokens.length > 0) {
                        const pushResult = await sendPushNotification(dedupedTokens, {
                            title: title || 'Pocket POS',
                            body: finalMessage?.slice(0, 120) || message?.slice(0, 120) || 'New notification',
                            data: {
                                type: 'notification',
                                link: '/notifications',
                                notificationId: newNotification._id?.toString() || '',
                                storeId: storeIdStr,
                                notificationType: type,
                                category,
                            },
                        });
                        console.log(`[Push][${pushTraceId}] Notification delivered: ${pushResult.success} ok, ${pushResult.failure} failed, firebaseTrace=${pushResult.traceId}`);
                        if (pushResult.failed?.length) {
                            console.warn(`[Push][${pushTraceId}] Failed token results:`, pushResult.failed);
                        }
                        if (pushResult.invalidTokens?.length) {
                            console.warn(`[Push][${pushTraceId}] Removing invalid tokens count=${pushResult.invalidTokens.length}`);
                            await User.updateMany(
                                { 'deviceTokens.token': { $in: pushResult.invalidTokens } },
                                { $pull: { deviceTokens: { token: { $in: pushResult.invalidTokens } } } }
                            );
                        }
                    } else {
                        console.log(`[Push][${pushTraceId}] No device tokens for notification recipients - users may need to enable notifications in the app`);
                    }
                }

                // Also emit to store room for backward compatibility (but filter on client side)
                // This ensures users who haven't refreshed still get notifications
                io.to(storeIdStr).emit('new_notification', notificationData);

                console.log(`📢 Notification sent to ${targetUserIds.size} users${isLowStockAlert ? ' (including actor)' : ` (excluding actor ${actorId})`} from store: ${storeName}`);
            } catch (targetingError) {
                console.error("❌ Error in smart notification targeting:", targetingError);
                // Fallback to broadcast if targeting fails
                const notificationData = { 
                    ...newNotification.toObject(), 
                    isRead: false,
                    storeName: storeName
                };
                io.to(storeIdStr).emit('new_notification', notificationData);
            }
        }
        return newNotification;
    } catch (error) {
        console.error("❌ Notification Emit Error:", error.message);
    }
};

/**
 * NEW UTILITY: resolveLowStockAlert
 * Call this when stock is re-added to remove old warnings automatically.
 * @param {Object} req - Express request object
 * @param {String} storeId - Store ID
 * @param {String} itemId - Item ID
 * @param {String} variantId - Optional variant ID for variant-specific resolution
 */
const resolveLowStockAlert = async (req, storeId, itemId, variantId = null) => {
    const io = req.app.get('socketio');
    const storeIdStr = storeId.toString();

    try {
        const query = {
            storeId: storeIdStr,
            type: 'inventory_low',
            'metadata.itemId': itemId
        };
        
        // If variantId is provided, only resolve alerts for that specific variant
        if (variantId) {
            query['metadata.variantId'] = variantId;
        }

        await Notification.deleteMany(query);

        if (io) {
            io.to(storeIdStr).emit('resolve_notification', { itemId, variantId });
            console.log(`🧹 Resolved alerts for item: ${itemId}${variantId ? ` (variant: ${variantId})` : ''}`);
        }
    } catch (error) {
        console.error("❌ Failed to resolve alerts:", error.message);
    }
};

/**
 * Notify all superadmins when a new shop (owner) registers.
 * Call this from auth signup after creating the new owner user.
 * @param {Object} req - Express request (for req.app.get('socketio'))
 * @param {Object} newOwner - The new User document (owner) with at least _id, shopName, email
 */
const notifySuperadminsNewShop = async (req, newOwner) => {
    const io = req.app && req.app.get ? req.app.get('socketio') : null;
    try {
        const superadmins = await User.find({ role: 'superadmin' }).select('_id deviceTokens').lean();
        if (superadmins.length === 0) return;

        const shopName = newOwner.shopName || 'Unknown';
        const email = newOwner.email || '';
        const title = 'New Shop Registered';
        const message = `"${shopName}" (${email}) just signed up.`;
        const newNotification = await Notification.create({
            storeId: newOwner._id,
            ownerId: newOwner._id,
            forSuperAdmin: true,
            type: 'new_shop_registered',
            category: 'Info',
            title,
            message,
            metadata: { shopName, email, ownerId: newOwner._id },
            readBy: [],
            createdAt: new Date()
        });

        const notificationData = { ...newNotification.toObject(), isRead: false, storeName: shopName };
        superadmins.forEach(sa => {
            if (io && sa._id) io.to(`user_${sa._id}`).emit('new_notification', notificationData);
        });

        if (superadmins.some(sa => (sa.deviceTokens || []).length > 0)) {
            const allTokens = superadmins.flatMap(u => (u.deviceTokens || []).map(d => d.token));
            if (allTokens.length > 0) {
                const { sendPushNotification } = require('../services/firebaseAdmin');
                sendPushNotification(allTokens, {
                    title: title,
                    body: message.slice(0, 120),
                    data: { type: 'notification', link: '/notifications', notificationType: 'new_shop_registered' }
                }).catch(err => console.error('[Push] Superadmin new-shop notification error:', err));
            }
        }
        console.log(`📢 Superadmin notification: new shop "${shopName}" registered; sent to ${superadmins.length} superadmin(s).`);
    } catch (err) {
        console.error('❌ notifySuperadminsNewShop error:', err.message);
    }
};

// --- API ROUTES ---

/**
 * GET /alerts
 * Fetches notifications and calculates 'isRead' specifically for the logged-in user.
 * UPDATED: Filters out notifications where the current user is the actor (they don't need to see their own actions).
 * Superadmin: returns notifications where forSuperAdmin is true.
 */
router.get('/alerts', protect, async (req, res) => {
    try {
        let filter;
        if (req.user.role === 'superadmin') {
            filter = { forSuperAdmin: true, dismissedBy: { $nin: [req.user._id] } };
        } else if (req.user.role === 'owner') {
            filter = { ownerId: req.user._id, forSuperAdmin: { $ne: true }, dismissedBy: { $nin: [req.user._id] } };
        } else if (req.user.storeId) {
            filter = { storeId: req.user.storeId, forSuperAdmin: { $ne: true }, dismissedBy: { $nin: [req.user._id] } };
        } else {
            return res.json({ count: 0, alerts: [] });
        }

        // Get notifications - for owners we fetch store names separately
        const notifications = await Notification.find(filter)
            .select('type category title message metadata storeId ownerId actorId readBy createdAt forSuperAdmin')
            .lean()
            .sort({ createdAt: -1 })
            .limit(30);

        // Filter out notifications where the current user is the actor
        // Users don't need to see notifications about their own actions
        const filteredNotifications = notifications.filter(n => {
            // If actorId exists and matches current user, exclude this notification
            if (n.actorId && n.actorId.toString() === req.user._id.toString() && n.type !== 'inventory_price_updated') {
                return false;
            }
            return true;
        });

        // For owners, fetch store names for all unique storeIds
        let storeNameMap = {};
        if (req.user.role === 'owner' && filteredNotifications.length > 0) {
            const uniqueStoreIds = [...new Set(filteredNotifications.map(n => n.storeId?.toString()).filter(Boolean))];
            if (uniqueStoreIds.length > 0) {
                const stores = await Store.find({ _id: { $in: uniqueStoreIds } })
                    .select('_id name')
                    .lean();
                stores.forEach(store => {
                    storeNameMap[store._id.toString()] = store.name;
                });
            }
        }

        // Map notifications to include an 'isRead' boolean specific to THIS user
        // Note: .lean() returns plain objects, so no need for .toObject()
        const formattedAlerts = filteredNotifications.map(n => {
            // Ensure readBy is an array (it should be from the schema)
            const readByArray = Array.isArray(n.readBy) ? n.readBy : (n.readBy ? [n.readBy] : []);
            
            const storeIdStr = n.storeId?.toString();
            let storeName = null;
            if (req.user.role === 'superadmin' && n.metadata && n.metadata.shopName) storeName = n.metadata.shopName;
            else if (req.user.role === 'owner' && storeIdStr) storeName = storeNameMap[storeIdStr] || null;
            
            return {
                ...n,
                // Check if current logged-in user ID exists in the readBy array
                isRead: readByArray.some(userId => userId.toString() === req.user._id.toString()),
                // Include store name for owners
                storeName: storeName || null
            };
        });

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json({
            count: formattedAlerts.filter(n => !n.isRead).length,
            alerts: formattedAlerts
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

/**
 * PUT /alerts/dismiss-all
 * Adds current user to dismissedBy for all their notifications so they never see them again.
 */
router.put('/alerts/dismiss-all', protect, async (req, res) => {
    try {
        let filter;
        if (req.user.role === 'superadmin') {
            filter = { forSuperAdmin: true, dismissedBy: { $nin: [req.user._id] } };
        } else if (req.user.role === 'owner') {
            filter = { ownerId: req.user._id, forSuperAdmin: { $ne: true }, dismissedBy: { $nin: [req.user._id] } };
        } else {
            filter = { storeId: req.user.storeId, forSuperAdmin: { $ne: true }, dismissedBy: { $nin: [req.user._id] } };
        }
        const result = await Notification.updateMany(
            filter,
            { $addToSet: { dismissedBy: req.user._id } }
        );
        res.json({ message: 'Success', updatedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: 'Failed to dismiss all notifications.' });
    }
});

/**
 * PUT /alerts/:id/dismiss
 * Removes the alert from the current user's account (adds user to dismissedBy).
 * Revisiting the page will not show this notification again for this user.
 */
router.put('/alerts/:id/dismiss', protect, async (req, res) => {
    try {
        const { id } = req.params;
        let filter;
        if (req.user.role === 'superadmin') {
            filter = { _id: id, forSuperAdmin: true };
        } else if (req.user.role === 'owner') {
            filter = { _id: id, ownerId: req.user._id, forSuperAdmin: { $ne: true } };
        } else {
            filter = { _id: id, storeId: req.user.storeId, forSuperAdmin: { $ne: true } };
        }
        const doc = await Notification.findOneAndUpdate(
            filter,
            { $addToSet: { dismissedBy: req.user._id } },
            { new: true }
        );
        if (!doc) {
            return res.status(404).json({ error: 'Notification not found or access denied.' });
        }
        res.json({ message: 'Dismissed', _id: doc._id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to dismiss notification.' });
    }
});

/**
 * PUT /read-all
 * Adds the current user's ID to the readBy array of all unread notifications for their shop.
 */
router.put('/read-all', protect, async (req, res) => {
    try {
        let filter;
        if (req.user.role === 'superadmin') {
            filter = { forSuperAdmin: true, readBy: { $ne: req.user._id } };
        } else if (req.user.role === 'owner') {
            filter = { ownerId: req.user._id, forSuperAdmin: { $ne: true }, readBy: { $ne: req.user._id } };
        } else {
            filter = { storeId: req.user.storeId, forSuperAdmin: { $ne: true }, readBy: { $ne: req.user._id } };
        }
        const result = await Notification.updateMany(
            filter,
            { $addToSet: { readBy: req.user._id } } // Add the user ID to the array
        );
        res.json({ message: 'Success', updatedCount: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update.' });
    }
});

module.exports = { router, emitAlert, resolveLowStockAlert, notifySuperadminsNewShop };
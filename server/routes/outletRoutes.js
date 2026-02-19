const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
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
const router = express.Router();

/**
 * @route GET /api/outlets
 * @desc Get all outlets for the current owner (Premium users only)
 * @access Private (Owner with PREMIUM plan)
 */
router.get('/', protect, authorize('owner'), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id);
        
        // Check if user has PREMIUM plan
        if (owner.plan !== 'PREMIUM') {
            return res.status(403).json({
                success: false,
                error: 'Multiple outlets feature is only available for PREMIUM plan users. Please upgrade to access this feature.'
            });
        }

        // Return only active outlets (inactive stores are deleted, not deactivated)
        const outlets = await Store.find({ 
            ownerId: req.user.id,
            isActive: true 
        })
            .select('name address phone email isActive createdAt')
            .lean()
            .sort({ createdAt: -1 });

        // Get staff counts for each outlet
        const outletIds = outlets.map(outlet => outlet._id);
        const staffCounts = await Staff.aggregate([
            {
                $match: {
                    storeId: { $in: outletIds }
                }
            },
            {
                $group: {
                    _id: '$storeId',
                    count: { $sum: 1 },
                    activeCount: {
                        $sum: {
                            $cond: [{ $eq: ['$active', true] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        // Create a map of outletId to staff count
        const staffCountMap = {};
        staffCounts.forEach(item => {
            staffCountMap[item._id.toString()] = {
                total: item.count,
                active: item.activeCount
            };
        });

        // Add staff count to each outlet
        const outletsWithStaffCount = outlets.map(outlet => ({
            ...outlet,
            staffCount: staffCountMap[outlet._id.toString()]?.total || 0,
            activeStaffCount: staffCountMap[outlet._id.toString()]?.active || 0
        }));

        res.json({
            success: true,
            data: outletsWithStaffCount,
            count: outletsWithStaffCount.length
        });
    } catch (error) {
        console.error('Get Outlets Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error retrieving outlets.'
        });
    }
});

/**
 * @route GET /api/outlets/:id
 * @desc Get a specific outlet by ID
 * @access Private (Owner with PREMIUM plan)
 */
router.get('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id);
        
        if (owner.plan !== 'PREMIUM') {
            return res.status(403).json({
                success: false,
                error: 'Multiple outlets feature is only available for PREMIUM plan users.'
            });
        }

        const outlet = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user.id
        });

        if (!outlet) {
            return res.status(404).json({
                success: false,
                error: 'Outlet not found.'
            });
        }

        res.json({
            success: true,
            data: outlet
        });
    } catch (error) {
        console.error('Get Outlet Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error retrieving outlet.'
        });
    }
});

/**
 * @route POST /api/outlets
 * @desc Create a new outlet (Premium users only)
 * @access Private (Owner with PREMIUM plan)
 */
router.post('/', protect, authorize('owner'), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id);
        
        // Check if user has PREMIUM plan
        if (owner.plan !== 'PREMIUM') {
            return res.status(403).json({
                success: false,
                error: 'Multiple outlets feature is only available for PREMIUM plan users. Please upgrade to access this feature.'
            });
        }

        // Check store limit for PREMIUM accounts (max 10 stores)
        const currentStoreCount = await Store.countDocuments({ 
            ownerId: req.user.id, 
            isActive: true 
        });

        if (currentStoreCount >= 10) {
            return res.status(403).json({
                success: false,
                error: 'Store limit reached. You can create up to 10 stores. Please delete an existing store to create a new one.'
            });
        }

        const { name, taxId, address, phone, email, settings } = req.body;

        // Validate required fields
        if (!name || name.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Outlet name is required.'
            });
        }

        // Check if outlet name already exists for this owner
        const existingOutlet = await Store.findOne({
            ownerId: req.user.id,
            name: name.trim()
        });

        if (existingOutlet) {
            return res.status(400).json({
                success: false,
                error: 'An outlet with this name already exists. Please choose a different name.'
            });
        }

        // Create new outlet
        const newOutlet = await Store.create({
            name: name.trim(),
            ownerId: req.user.id,
            taxId: taxId || '',
            address: address || '',
            phone: phone || '',
            email: email || '',
            settings: settings || {
                lowStockThreshold: 5,
                receiptFooter: 'Thank you for shopping!'
            },
            isActive: true
        });

        // Automatically create a default group for this new outlet
        const storeGroupName = `${newOutlet.name} Group`;
        const requiredPlan = owner.plan?.toUpperCase() === 'PREMIUM' ? 'PREMIUM' : 'PRO';
        
        await Chat.create({
            type: 'group',
            name: storeGroupName,
            isGroupChat: true,
            participants: [owner._id], // Start with just the owner
            createdBy: owner._id,
            isDefault: true,
            outletId: newOutlet._id,
            requiredPlan: requiredPlan
        });

        res.status(201).json({
            success: true,
            message: 'Outlet created successfully.',
            data: newOutlet
        });
    } catch (error) {
        console.error('Create Outlet Error:', error);
        
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'An outlet with this name already exists for your account.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error creating outlet.'
        });
    }
});

/**
 * @route PUT /api/outlets/:id
 * @desc Update an existing outlet
 * @access Private (Owner with PREMIUM plan)
 */
router.put('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id);
        
        if (owner.plan !== 'PREMIUM') {
            return res.status(403).json({
                success: false,
                error: 'Multiple outlets feature is only available for PREMIUM plan users.'
            });
        }

        const { name, taxId, address, phone, email, settings, isActive } = req.body;

        // Find outlet and verify ownership
        const outlet = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user.id
        });

        if (!outlet) {
            return res.status(404).json({
                success: false,
                error: 'Outlet not found.'
            });
        }

        // If name is being updated, check for duplicates
        if (name && name.trim() !== outlet.name) {
            const existingOutlet = await Store.findOne({
                ownerId: req.user.id,
                name: name.trim(),
                _id: { $ne: req.params.id }
            });

            if (existingOutlet) {
                return res.status(400).json({
                    success: false,
                    error: 'An outlet with this name already exists. Please choose a different name.'
                });
            }
        }

        // Update outlet
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (taxId !== undefined) updateData.taxId = taxId;
        if (address !== undefined) updateData.address = address;
        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;
        if (settings) updateData.settings = { ...outlet.settings, ...settings };
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedOutlet = await Store.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Outlet updated successfully.',
            data: updatedOutlet
        });
    } catch (error) {
        console.error('Update Outlet Error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'An outlet with this name already exists for your account.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error updating outlet.'
        });
    }
});

/**
 * @route DELETE /api/outlets/:id
 * @desc Hard delete an outlet and all related data
 * @access Private (Owner with PREMIUM plan)
 */
router.delete('/:id', protect, authorize('owner'), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id);
        
        if (owner.plan !== 'PREMIUM') {
            return res.status(403).json({
                success: false,
                error: 'Multiple outlets feature is only available for PREMIUM plan users.'
            });
        }

        const outlet = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user.id
        });

        if (!outlet) {
            return res.status(404).json({
                success: false,
                error: 'Outlet not found.'
            });
        }

        // Prevent deleting the currently active store
        if (owner.activeStoreId && owner.activeStoreId.toString() === req.params.id) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete the currently active store. Please switch to another store first.'
            });
        }

        const storeId = outlet._id;
        const storeName = outlet.name;

        // Delete all related data in parallel for better performance
        // First, get staff members to delete their user accounts
        const staffMembers = await Staff.find({ storeId });
        const userIds = staffMembers.map(s => s.userId).filter(Boolean);
        
        const deleteResults = await Promise.all([
            // Delete user accounts for staff (if any)
            userIds.length > 0 ? User.deleteMany({ _id: { $in: userIds } }) : Promise.resolve({ deletedCount: 0 }),
            // Delete staff records
            Staff.deleteMany({ storeId }),
            // Delete attendance records
            Attendance.deleteMany({ storeId }),
            // Delete sales records
            Sale.deleteMany({ storeId }),
            // Delete inventory items
            Inventory.deleteMany({ storeId }),
            // Delete customers
            Customer.deleteMany({ storeId }),
            // Delete suppliers
            Supplier.deleteMany({ storeId }),
            // Delete purchase records
            Purchase.deleteMany({ storeId }),
            // Delete khata transactions
            KhataTransaction.deleteMany({ storeId }),
            // Delete notifications
            Notification.deleteMany({ storeId }),
            // Delete chat groups for this outlet
            Chat.deleteMany({ outletId: storeId })
        ]);

        // Clear activeStoreId if it was set to this store
        if (owner.activeStoreId && owner.activeStoreId.toString() === storeId.toString()) {
            owner.activeStoreId = null;
            await owner.save();
        }

        // Finally, delete the store itself
        await Store.findByIdAndDelete(storeId);

        // Log deletion summary
        console.log(`Store "${storeName}" (${storeId}) deleted successfully. Cleaned up:`);
        console.log(`- Staff User Accounts: ${deleteResults[0].deletedCount || 0}`);
        console.log(`- Staff Records: ${deleteResults[1].deletedCount || 0}`);
        console.log(`- Attendance: ${deleteResults[2].deletedCount || 0}`);
        console.log(`- Sales: ${deleteResults[3].deletedCount || 0}`);
        console.log(`- Inventory: ${deleteResults[4].deletedCount || 0}`);
        console.log(`- Customers: ${deleteResults[5].deletedCount || 0}`);
        console.log(`- Suppliers: ${deleteResults[6].deletedCount || 0}`);
        console.log(`- Purchases: ${deleteResults[7].deletedCount || 0}`);
        console.log(`- Khata Transactions: ${deleteResults[8].deletedCount || 0}`);
        console.log(`- Notifications: ${deleteResults[9].deletedCount || 0}`);
        console.log(`- Chats: ${deleteResults[10].deletedCount || 0}`);

        res.json({
            success: true,
            message: `Store "${storeName}" and all associated data deleted successfully.`,
            deletedCounts: {
                staffUserAccounts: deleteResults[0].deletedCount || 0,
                staffRecords: deleteResults[1].deletedCount || 0,
                attendance: deleteResults[2].deletedCount || 0,
                sales: deleteResults[3].deletedCount || 0,
                inventory: deleteResults[4].deletedCount || 0,
                customers: deleteResults[5].deletedCount || 0,
                suppliers: deleteResults[6].deletedCount || 0,
                purchases: deleteResults[7].deletedCount || 0,
                khataTransactions: deleteResults[8].deletedCount || 0,
                notifications: deleteResults[9].deletedCount || 0,
                chats: deleteResults[10].deletedCount || 0
            }
        });
    } catch (error) {
        console.error('Delete Outlet Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error deleting outlet. Please try again.'
        });
    }
});

/**
 * @route PUT /api/outlets/:id/switch
 * @desc Switch active outlet context
 * @access Private (Owner with PREMIUM plan)
 */
router.put('/:id/switch', protect, authorize('owner'), async (req, res) => {
    try {
        const owner = await User.findById(req.user.id);
        
        if (owner.plan !== 'PREMIUM') {
            return res.status(403).json({
                success: false,
                error: 'Multiple outlets feature is only available for PREMIUM plan users.'
            });
        }

        const outlet = await Store.findOne({
            _id: req.params.id,
            ownerId: req.user.id,
            isActive: true
        });

        if (!outlet) {
            return res.status(404).json({
                success: false,
                error: 'Outlet not found or inactive.'
            });
        }

        // Update user's activeStoreId
        owner.activeStoreId = outlet._id;
        await owner.save();

        res.json({
            success: true,
            message: 'Active outlet switched successfully.',
            data: {
                outlet: outlet,
                activeStoreId: owner.activeStoreId
            }
        });
    } catch (error) {
        console.error('Switch Outlet Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error switching outlet.'
        });
    }
});

module.exports = router;


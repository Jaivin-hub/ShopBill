const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const Store = require('../models/Store');
const User = require('../models/User');
const Chat = require('../models/Chat');
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

        const outlets = await Store.find({ ownerId: req.user.id, isActive: true })
            .select('name address phone email isActive createdAt')
            .lean()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: outlets,
            count: outlets.length
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
 * @desc Delete (deactivate) an outlet
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

        // Soft delete: Set isActive to false instead of actually deleting
        outlet.isActive = false;
        await outlet.save();

        res.json({
            success: true,
            message: 'Outlet deactivated successfully.',
            data: outlet
        });
    } catch (error) {
        console.error('Delete Outlet Error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error deleting outlet.'
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


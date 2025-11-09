const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const User = require('../models/User'); // Reusing the User model for shop data (as shopId is linked)

const router = express.Router();

/**
 * Superadmin middleware wrapper:
 * 1. protect: Ensure user is logged in
 * 2. authorize('superadmin'): Ensure user role is 'superadmin'
 */
const superadminProtect = [protect, authorize('superadmin')];


// ====================================================
// --- SHOP MANAGEMENT (/api/superadmin/shops) ---
// ====================================================

/**
 * @route GET /api/superadmin/shops
 * @desc Get a list of all shops (User documents where role is 'owner')
 * @access Private (Superadmin only)
 */
router.get('/shops', superadminProtect, async (req, res) => {
    try {
        // Find all users who are owners, as in this design, the owner represents the shop entry.
        // We exclude the superadmin user from this list.
        const shops = await User.find({ role: 'owner' }).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!shops.length) {
            return res.status(200).json({ success: true, message: 'No shops registered yet.', data: [] });
        }
        
        // Enhance shop data with calculated tenure and mock performance (30D)
        const shopsWithDetails = shops.map(shop => {
            // Calculate tenure in days using the Mongoose 'createdAt' timestamp
            // --- CORE LOGIC FOR TENURE ---
            const daysActive = Math.floor((Date.now() - shop.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            // ----------------------------
            
            // Mocking Performance Trend (0: flat, 1: up, 2: down)
            const trendValue = Math.floor(Math.random() * 3); 
            let trendType = 'flat';
            if (trendValue === 1) trendType = 'up';
            else if (trendValue === 2) trendType = 'down';

            // Mock performance metric (e.g., Revenue change)
            const performanceMetric = (Math.random() * 10).toFixed(2) + '%';
            
            return {
                ...shop.toObject(), // Convert Mongoose document to plain object
                // Injecting the requested fields for the frontend table:
                dateJoined: shop.createdAt.toISOString().split('T')[0], // YYYY-MM-DD for reliable date sorting
                tenureDays: daysActive, // 🚀 This is the field the frontend needs
                performanceTrend: { metric: performanceMetric, trend: trendType },
                // Add sensible defaults for other missing fields needed by the frontend, 
                // e.g., plan, managerCount, cashierCount, location, if they aren't on the User model
                plan: 'Basic', // Default to Basic
                managerCount: 1, // Mock manager count
                cashierCount: 3, // Mock cashier count
                location: 'City, State', // Mock location
            };
        });


        res.json({ 
            success: true, 
            count: shopsWithDetails.length,
            data: shopsWithDetails
        });
        
    } catch (error) {
        console.error('Superadmin Shop List Error:', error);
        res.status(500).json({ error: 'Server error retrieving shop list.' });
    }
});


/**
 * @route GET /api/superadmin/shops/:id
 * @desc Get details for a single shop/owner
 * @access Private (Superadmin only)
 */
router.get('/shops/:id', superadminProtect, async (req, res) => {
    try {
        // Find the user by ID and ensure they have the 'owner' role
        const shop = await User.findOne({ _id: req.params.id, role: 'owner' }).select('-password -resetPasswordToken -resetPasswordExpire');

        if (!shop) {
            return res.status(404).json({ success: false, message: `Shop with ID ${req.params.id} not found or is not an owner account.` });
        }

        res.json({
            success: true,
            data: shop
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid shop ID format.' });
        }
        console.error('Superadmin Get Single Shop Error:', error);
        res.status(500).json({ success: false, error: 'Server error retrieving shop details.' });
    }
});



/**
 * @route DELETE /api/superadmin/shops/:id
 * @desc Delete a shop (deletes the owner user and associated data)
 * @access Private (Superadmin only)
 * * NOTE: In a full system, deleting the User/Owner document here should trigger 
 * a cascade operation to clean up all related Inventory, Sales, and Staff data 
 * linked to this shop ID. For this implementation, we focus on deleting the primary User/Owner document.
 */
router.delete('/shops/:id', superadminProtect, async (req, res) => {
    try {
        const shopId = req.params.id;

        // 1. Find and ensure the user exists and has the 'owner' role
        const shop = await User.findOne({ _id: shopId, role: 'owner' });

        if (!shop) {
            return res.status(404).json({ success: false, message: `Shop with ID ${shopId} not found or is not an owner account.` });
        }
        
        // 2. Perform the deletion of the owner document (representing the shop)
        await shop.deleteOne(); 

        // 3. Respond success
        res.json({ 
            success: true, 
            message: `Shop '${shop.email}' (ID: ${shopId}) and associated owner account successfully deleted.` 
        });

    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid shop ID format.' });
        }
        console.error('Superadmin Delete Shop Error:', error);
        res.status(500).json({ success: false, error: 'Server error during shop deletion.' });
    }
});



/**
 * @route POST /api/superadmin/shops
 * @desc Create a new shop (Superadmin creates the owner account)
 * @access Private (Superadmin only)
 * * NOTE: This is complex as it involves creating an owner user and linking the shop. 
 * We will keep this as a placeholder for now.
 */
router.post('/shops', superadminProtect, (req, res) => {
    res.status(501).json({ message: 'Route not implemented yet. Logic needed to create an Owner user and their Shop ID.' });
});


// ====================================================
// --- SYSTEM CONFIGURATION (/api/superadmin/config) ---
// ====================================================

/**
 * @route GET /api/superadmin/config
 * @desc Get global system configuration (e.g., plans, pricing, global features)
 * @access Private (Superadmin only)
 */
router.get('/config', superadminProtect, (req, res) => {
    // Mock system configuration data
    const config = {
        currentPlans: ['Basic', 'Pro', 'Enterprise'],
        baseCurrency: 'INR',
        taxRate: 18.0,
        featureFlags: {
            aiReports: true,
            globalNotifications: true,
        },
        lastUpdated: new Date().toISOString()
    };
    
    res.json({ 
        success: true, 
        data: config,
        message: 'Global system configuration retrieved.'
    });
});


module.exports = router;
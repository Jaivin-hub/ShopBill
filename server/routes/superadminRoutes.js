// src/routes/superadminRoutes.js

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
            return res.status(200).json({ message: 'No shops registered yet.', data: [] });
        }

        // NOTE: In a real system, you would fetch dedicated 'Shop' model data here.
        // For this mock, we are treating the Owner's User document as the Shop entry.
        res.json({ 
            success: true, 
            count: shops.length,
            data: shops
        });
        
    } catch (error) {
        console.error('Superadmin Shop List Error:', error);
        res.status(500).json({ error: 'Server error retrieving shop list.' });
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
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Store = require('../models/Store');

const router = express.Router();

/**
 * @route PUT /api/user/plan
 * @desc Update user's subscription plan (Owner only)
 * @access Private (Owner only)
 */
router.put('/plan', protect, async (req, res) => {
    try {
        // Only owners can change their plan
        if (req.user.role !== 'owner' && req.user.role !== 'Owner') {
            return res.status(403).json({ 
                success: false, 
                error: 'Only shop owners can change subscription plans.' 
            });
        }

        const { plan } = req.body;

        // Validate plan
        const validPlans = ['Basic', 'Pro', 'Enterprise', 'basic', 'pro', 'enterprise'];
        if (!plan || !validPlans.includes(plan)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid plan. Must be Basic, Pro, or Enterprise.' 
            });
        }

        // Normalize plan name (capitalize first letter)
        const normalizedPlan = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();

        // Update user's plan
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { plan: normalizedPlan },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found.' 
            });
        }

        res.json({
            success: true,
            message: `Plan successfully updated to ${normalizedPlan}.`,
            data: {
                user: updatedUser,
                plan: normalizedPlan
            }
        });
    } catch (error) {
        console.error('Plan Update Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error updating plan.' 
        });
    }
});

/**
 * @route POST /api/user/device-token
 * @desc Register FCM device token for push notifications
 * @access Private
 */
router.post('/device-token', protect, async (req, res) => {
    try {
        const { token, platform = 'web' } = req.body;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Device token is required.' });
        }
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        const deviceTokens = user.deviceTokens || [];
        const existing = deviceTokens.findIndex(d => d.token === token);
        const now = new Date();
        if (existing >= 0) {
            deviceTokens[existing].platform = platform;
            deviceTokens[existing].updatedAt = now;
        } else {
            deviceTokens.push({ token, platform, updatedAt: now });
        }
        user.deviceTokens = deviceTokens;
        await user.save();
        res.json({ success: true });
    } catch (error) {
        console.error('Device Token Error:', error);
        res.status(500).json({ error: 'Failed to register device token.' });
    }
});

/**
 * @route DELETE /api/user/device-token
 * @desc Remove FCM device token
 * @access Private
 */
router.delete('/device-token', protect, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Device token is required.' });
        }
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { deviceTokens: { token } },
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Device Token Remove Error:', error);
        res.status(500).json({ error: 'Failed to remove device token.' });
    }
});

/**
 * @route GET /api/user/plan
 * @desc Get user's current plan details
 * @access Private
 */
router.get('/plan', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found.' 
            });
        }

        // Get effective plan (owner's plan for staff, user's plan for owners)
        let effectivePlan = user.plan || 'Basic';
        if (user.role !== 'owner' && user.role !== 'superadmin') {
            // For staff, get owner's plan
            if (user.activeStoreId) {
                const store = await Store.findById(user.activeStoreId);
                if (store && store.ownerId) {
                    const owner = await User.findById(store.ownerId);
                    if (owner) {
                        effectivePlan = owner.plan || 'Basic';
                    }
                }
            } else if (user.shopId) {
                const owner = await User.findById(user.shopId);
                if (owner) {
                    effectivePlan = owner.plan || 'Basic';
                }
            }
        }

        res.json({
            success: true,
            data: {
                plan: effectivePlan,
                userId: user._id
            }
        });
    } catch (error) {
        console.error('Get Plan Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error retrieving plan.' 
        });
    }
});

module.exports = router;


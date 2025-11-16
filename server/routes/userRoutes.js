const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

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

        res.json({
            success: true,
            data: {
                plan: user.plan || 'Basic',
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


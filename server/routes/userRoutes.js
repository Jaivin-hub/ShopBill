const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Store = require('../models/Store');
const { getAdmin, sendPushNotification } = require('../services/firebaseAdmin');

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
    const ts = () => new Date().toISOString();
    console.log(`[Push] ${ts()} device-token POST hit user=${req.user?.id}`);
    try {
        const { token, platform = 'web' } = req.body;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Device token is required.' });
        }
        console.log(`[Push] ${ts()} device-token incoming platform=${platform} tokenLength=${token.length} tokenTail=...${token.slice(-12)}`);
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
        console.log(`[Push] ${ts()} Device token REGISTERED user=${req.user.id} platform=${platform} total=${deviceTokens.length} tokenTail=...${token.slice(-12)}`);
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
 * @route GET /api/user/device-token/status
 * @desc Quick push diagnostics for current user
 * @access Private
 */
router.get('/device-token/status', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('deviceTokens email role activeStoreId').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const hasFirebaseEnv = Boolean(
            process.env.FIREBASE_PROJECT_ID &&
            process.env.FIREBASE_CLIENT_EMAIL &&
            process.env.FIREBASE_PRIVATE_KEY
        );
        const fbAdmin = getAdmin();

        const tokens = (user.deviceTokens || []).map((d) => ({
            platform: d.platform || 'web',
            updatedAt: d.updatedAt || null,
            tokenTail: `...${String(d.token || '').slice(-12)}`
        }));

        res.json({
            success: true,
            diagnostics: {
                userId: String(user._id),
                email: user.email,
                role: user.role,
                activeStoreId: user.activeStoreId ? String(user.activeStoreId) : null,
                firebaseConfigured: hasFirebaseEnv,
                firebaseInitialized: !!fbAdmin,
                tokenCount: tokens.length,
                tokens
            }
        });
    } catch (error) {
        console.error('[Push] device-token/status error:', error);
        res.status(500).json({ error: 'Failed to fetch push diagnostics.' });
    }
});

/**
 * @route POST /api/user/device-token/test
 * @desc Send a direct test push to current user tokens
 * @access Private
 */
router.post('/device-token/test', protect, async (req, res) => {
    const ts = new Date().toISOString();
    try {
        const user = await User.findById(req.user.id).select('deviceTokens email role').lean();
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const tokens = [...new Set((user.deviceTokens || []).map(d => d.token).filter(Boolean))];
        if (tokens.length === 0) {
            return res.status(400).json({
                error: 'No device tokens found for this user.',
                diagnostics: { tokenCount: 0, userId: String(req.user.id) }
            });
        }

        const title = req.body?.title || 'Pocket POS Test Push';
        const body = req.body?.body || `Push test at ${ts}`;
        const link = req.body?.link || '/notifications';
        const pushResult = await sendPushNotification(tokens, {
            title,
            body,
            data: {
                type: 'notification',
                link,
                notificationType: 'push_test',
                requestedBy: String(req.user.id)
            }
        });

        if (pushResult.invalidTokens?.length) {
            await User.updateMany(
                { 'deviceTokens.token': { $in: pushResult.invalidTokens } },
                { $pull: { deviceTokens: { token: { $in: pushResult.invalidTokens } } } }
            );
        }

        return res.json({
            success: true,
            message: 'Test push attempted.',
            diagnostics: {
                userId: String(req.user.id),
                tokenCount: tokens.length,
                success: pushResult.success,
                failure: pushResult.failure,
                invalidRemoved: pushResult.invalidTokens?.length || 0,
                failed: pushResult.failed || [],
                traceId: pushResult.traceId || null
            }
        });
    } catch (error) {
        console.error('[Push] device-token/test error:', error);
        return res.status(500).json({ error: 'Failed to send test push.' });
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


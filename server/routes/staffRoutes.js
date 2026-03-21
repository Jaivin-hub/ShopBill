const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto'); // REQUIRED: For secure token generation
const Staff = require('../models/Staff');
const User = require('../models/User'); // REQUIRED: To create a login account
const Attendance = require('../models/Attendance');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/authMiddleware');
/** Mail: use sendEmail.queueSendEmail() for non-blocking staff emails — implementation lives in utils/sendEmail.js */
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

/** Structured logs for /api/staff — keep console output; do not remove (staff API debugging). */
const staffDebug = (step, payload = {}) => {
    const line = `[STAFF API ${new Date().toISOString()}] ${step}`;
    try {
        console.log(line, typeof payload === 'object' && payload !== null ? JSON.stringify(payload) : payload);
    } catch {
        console.log(line, payload);
    }
};

// Helper to check if the user is the owner
// FIX: Changed helper function name and logic to use PascalCase 'owner'
// to match the convention established in authRoutes.js and StaffSchema.
const isowner = (userRole) => userRole === 'owner';

/** Only explicit `true` counts as active — fixes legacy docs missing `active` and avoids UI showing the wrong state. */
function enrichStaffMember(staff) {
    if (!staff) return null;
    const hasInviteToken = !!(staff.userId && typeof staff.userId === 'object' && staff.userId.resetPasswordToken);
    return {
        ...staff,
        active: staff.active === true,
        passwordSetupStatus: hasInviteToken ? 'pending' : 'completed',
    };
}

async function enrichStaffById(staffId) {
    const staff = await Staff.findById(staffId)
        .select('name email role phone active storeId userId')
        .populate('userId', 'resetPasswordToken')
        .lean();
    return enrichStaffMember(staff);
}

/**
 * Idempotent set Staff.active + User.isActive (or revoke pending invite). Avoids toggle double-requests flipping state back to active.
 */
async function applyStaffActiveState(res, { staffMember, linkedUser, targetActive, staffName }) {
    const staffId = staffMember._id;
    const currentlyActive = staffMember.active === true;
    const isPendingInvite = !!linkedUser.resetPasswordToken && !currentlyActive;

    if (targetActive === false) {
        if (isPendingInvite) {
            await User.findByIdAndUpdate(linkedUser._id, {
                $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 },
                isActive: false,
            });
            staffDebug('PUT staff active=false: revoked pending invite', { staffId: String(staffId) });
            const enriched = await enrichStaffById(staffId);
            console.log('[staffRoutes] ROUTE DONE applyStaffActive → 200 revoke pending', { staffId: String(staffId) });
            return res.json({
                message: `${staffName}: activation invitation revoked. The setup link no longer works. You can delete this member or add them again with the same email to send a new invite.`,
                staff: enriched,
                revokedPending: true,
            });
        }
        await Staff.findByIdAndUpdate(staffId, { active: false }, { new: true, runValidators: true });
        await User.findByIdAndUpdate(linkedUser._id, { isActive: false }, { new: true, runValidators: true });
        staffDebug('PUT staff active=false: deactivated', { staffId: String(staffId) });
        const enriched = await enrichStaffById(staffId);
        console.log('[staffRoutes] ROUTE DONE applyStaffActive → 200 deactivated', { staffId: String(staffId) });
        return res.json({
            message: `${staffName} is now inactive.`,
            staff: enriched,
        });
    }

    // targetActive === true — never enable staff login without a real password
    const hasPassword = !!(linkedUser.password && String(linkedUser.password).length > 0);
    if (!hasPassword) {
        if (linkedUser.resetPasswordToken) {
            console.log('[staffRoutes] applyStaffActive → 400 activate blocked (pending setup)', { staffId: String(staffId) });
            return res.status(400).json({
                error: 'This member must finish the activation link and set a password before their account can be activated.',
            });
        }
        console.log('[staffRoutes] applyStaffActive → 400 activate blocked (no password)', { staffId: String(staffId) });
        return res.status(400).json({
            error: 'This member never completed password setup and has no pending invite. Remove them from the team and add them again to send a new activation email.',
        });
    }

    await Staff.findByIdAndUpdate(staffId, { active: true }, { new: true, runValidators: true });
    await User.findByIdAndUpdate(linkedUser._id, { isActive: true }, { new: true, runValidators: true });
    staffDebug('PUT staff active=true', { staffId: String(staffId) });
    const enriched = await enrichStaffById(staffId);
    console.log('[staffRoutes] ROUTE DONE applyStaffActive → 200 activated', { staffId: String(staffId) });
    return res.json({
        message: `${staffName} is now active.`,
        staff: enriched,
    });
}

// ====================================================================
// @route   GET /api/staff
// @desc    Get all staff members for the current shop
// @access  Private (owner/Manager level access)
// ====================================================================
router.get('/', protect, async (req, res) => {
    console.log('[staffRoutes] ROUTE HIT GET /api/staff', new Date().toISOString(), {
        userId: req.user?.id?.toString?.(),
        role: req.user?.role,
        storeId: req.user?.storeId?.toString?.() || null,
    });
    staffDebug('GET / start', {
        userId: req.user?.id?.toString?.(),
        role: req.user?.role,
        storeId: req.user?.storeId?.toString?.() || null,
        activeStoreId: req.user?.activeStoreId?.toString?.() || null,
        xStoreIdHeader: req.headers['x-store-id'] || null,
    });

    // FIX: Changed role checks to use PascalCase 'owner' and 'Manager'
    if (!isowner(req.user.role) && req.user.role !== 'Manager') {
        console.log('[staffRoutes] GET /api/staff → 403 wrong role', { role: req.user.role });
        staffDebug('GET / denied: role', { role: req.user.role });
        return res.status(403).json({ error: 'Access denied. Requires owner or Manager role.' });
    }

    try {
        // Find all staff belonging to the user's stores
        if (!req.user.storeId) {
            console.log('[staffRoutes] GET /api/staff → 400 missing storeId', { role: req.user.role });
            staffDebug('GET / denied: missing storeId', {
                role: req.user.role,
                hint: 'Owner: ensure outlet exists / send x-store-id. Staff: ensure activeStoreId is set.',
            });
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffList = await Staff.find({ storeId: req.user.storeId })
            .select('name email role phone active storeId userId')
            .populate('userId', 'resetPasswordToken')
            .lean()
            .sort({ role: -1, name: 1 });
        
        const enrichedStaffList = staffList.map((staff) => enrichStaffMember(staff));
        
        staffDebug('GET / success', { count: enrichedStaffList.length, storeId: String(req.user.storeId) });
        console.log('[staffRoutes] ROUTE DONE GET /api/staff → 200', { count: enrichedStaffList.length });
        res.json(enrichedStaffList);
    } catch (error) {
        staffDebug('GET / error', { message: error.message, name: error.name });
        console.error('[staffRoutes] GET /api/staff → 500', error.message);
        console.error('Staff GET all error:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to fetch staff list.' });
    }
});

// ====================================================================
// @route   POST /api/staff
// @desc    Add a new staff member (Creates User + Staff record and sends activation email)
// @access  Private (owner-only access for security)
// ====================================================================
router.post('/', protect, async (req, res) => {
    console.log('[staffRoutes] ROUTE HIT POST /api/staff', new Date().toISOString(), {
        userId: req.user?.id?.toString?.(),
        role: req.user?.role,
        storeId: req.user?.storeId?.toString?.() || null,
    });
    console.log('[staffRoutes] POST /api/staff req.body', req.body);
    staffDebug('POST / start', {
        userId: req.user?.id?.toString?.(),
        role: req.user?.role,
        storeId: req.user?.storeId?.toString?.() || null,
        bodyKeys: Object.keys(req.body || {}),
    });

    if (!isowner(req.user.role)) {
        console.log('[staffRoutes] POST /api/staff → 403 not owner', { role: req.user.role });
        staffDebug('POST / denied: not owner', { role: req.user.role });
        return res.status(403).json({ error: 'Access denied. Only the owner can add new staff.' });
    }
    
    const { name, email, role, phone } = req.body;

    if (!name || !email || !role) {
        staffDebug('POST / denied: validation', { hasName: !!name, hasEmail: !!email, hasRole: !!role });
        return res.status(400).json({ error: 'Please provide name, email, and role.' });
    }
    
    if (role === 'owner') {
        staffDebug('POST / denied: cannot create owner');
        return res.status(400).json({ error: 'Cannot create an owner account through this route.' });
    }
    
    if (role !== 'Manager' && role !== 'Cashier') {
        staffDebug('POST / denied: invalid role', { role });
        return res.status(400).json({ error: 'Invalid role specified. Must be Manager or Cashier.' });
    }

    try {
        // --- 0. PLAN LIMIT VALIDATION ---
        if (!req.user.storeId) {
            staffDebug('POST / denied: missing storeId');
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const storeIdObj = new mongoose.Types.ObjectId(req.user.storeId);
        const owner = await User.findById(req.user.id);
        const currentStaffCount = await Staff.countDocuments({ storeId: storeIdObj });

        const plan = owner.plan || 'BASIC'; // Fallback to BASIC if null

        if (plan === 'BASIC') {
            // Basic: 1 Owner + 2 Staff total
            if (currentStaffCount >= 2) {
                staffDebug('POST / denied: BASIC plan limit', { currentStaffCount, plan });
                return res.status(403).json({ 
                    error: 'Plan Limit Reached: The BASIC plan allows up to 2 staff members. Please upgrade to PRO for unlimited staff.' 
                });
            }
        }
        staffDebug('POST / plan check ok', { plan, currentStaffCount });
        // PRO and PREMIUM plans allow unlimited staff; no further check needed.

        // --- 1. Email uniqueness per shop: only block if this email is already staff in THIS shop ---
        const normalizedEmail = String(email || '').trim().toLowerCase();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            staffDebug('POST / denied: bad email');
            return res.status(400).json({ error: 'Please provide a valid email address.' });
        }
        // Use exact same storeId as GET /api/staff (req.user.storeId) so we only see staff for this shop
        const storeIdForStaff = req.user.storeId;
        const existingActiveStaffInThisShop = await Staff.findOne({
            storeId: storeIdForStaff,
            email: normalizedEmail,
            active: true,
        });
        if (existingActiveStaffInThisShop) {
            staffDebug('POST / denied: duplicate email in shop', { email: normalizedEmail });
            return res.status(409).json({
                error: `The email ${normalizedEmail} is already added in your shop. Please use a different email.`
            });
        }

        // If same email exists in this shop but inactive, reactivate and update instead of creating duplicate
        const existingInactiveStaffInThisShop = await Staff.findOne({
            storeId: storeIdForStaff,
            email: normalizedEmail,
            active: false,
        });
        if (existingInactiveStaffInThisShop) {
            const linkedUser = await User.findById(existingInactiveStaffInThisShop.userId);
            if (linkedUser) {
                await User.findByIdAndUpdate(linkedUser._id, { isActive: true });
            }
            const updated = await Staff.findByIdAndUpdate(
                existingInactiveStaffInThisShop._id,
                { active: true, name, role },
                { new: true }
            );
            console.log('[staffRoutes] POST /staff → queue email reactivated', { to: normalizedEmail, staffId: String(updated._id) });
            sendEmail.queueSendEmail(
                {
                    to: normalizedEmail,
                    subject: 'Reactivated – Pocket POS',
                    html: `<p>Your staff account has been reactivated. You can log in with your existing password.</p>`,
                },
                'reactivated'
            );
            staffDebug('POST / success: reactivated', { staffId: String(updated._id) });
            console.log('[staffRoutes] ROUTE DONE POST /api/staff → 201 reactivated', { staffId: String(updated._id) });
            return res.status(201).json({
                message: `Staff member ${updated.name} reactivated successfully.`,
                staff: updated,
            });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            if (existingUser._id.toString() === req.user.id.toString()) {
                staffDebug('POST / denied: owner cannot add self');
                return res.status(400).json({ error: 'You cannot add yourself as staff. Use a different email.' });
            }
            // User exists (e.g. staff at another shop): add them as staff in this shop only, no new User
            const newStaff = await Staff.create({
                storeId: storeIdForStaff,
                userId: existingUser._id,
                name,
                email: normalizedEmail,
                role,
                active: false,
            });
            console.log('[staffRoutes] POST /staff → queue email existing-user-new-shop', { to: normalizedEmail, staffId: String(newStaff._id) });
            sendEmail.queueSendEmail(
                {
                    to: normalizedEmail,
                    subject: 'Added to a new shop – Pocket POS',
                    html: `<h1>You've been added to another shop</h1><p>You were added as <strong>${role}</strong>. Log in with your existing Pocket POS password.</p>`,
                },
                'existing-user-new-shop'
            );
            staffDebug('POST / success: existing user linked', { staffId: String(newStaff._id) });
            console.log('[staffRoutes] ROUTE DONE POST /api/staff → 201 existing-user-new-shop', { staffId: String(newStaff._id) });
            return res.status(201).json({
                message: `Staff member ${newStaff.name} added. They can log in with their existing account.`,
                staff: newStaff,
            });
        }

        // --- 2. Create the User Login Record (new email) ---
        // Get the owner's ID (req.user.id is the owner who is creating the staff)
        const ownerId = req.user.id;
        
        const newUser = await User.create({
            email: normalizedEmail,
            phone: phone || null,
            role,
            shopName: `staff-temp-${storeIdObj}-${normalizedEmail}`,
            isActive: true,
            activeStoreId: storeIdObj,
            shopId: ownerId // Set shopId to owner's ID for token generation and owner lookup
        });

        // --- 3. Create the Staff record ---
        const newStaff = await Staff.create({
            storeId: storeIdForStaff,
            userId: newUser._id,
            name,
            email: normalizedEmail,
            role,
            active: false // Staff starts as inactive until they set their password
        });
        
        // --- 4. Generate Activation Token ---
        const activationToken = crypto.randomBytes(32).toString('hex');
        const activationTokenHash = crypto
            .createHash('sha256')
            .update(activationToken)
            .digest('hex');

        newUser.resetPasswordToken = activationTokenHash;
        newUser.resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000; 
        await newUser.save({ validateBeforeSave: false }); 
        
        // --- 5. Activation email (async — do not block HTTP; SMTP can take 10–30s+ and causes client cancel/timeout) ---
        const activationUrl = `${process.env.CLIENT_URL}/staff-setup/${activationToken}`;
        const message = `
            <h1>Welcome to Pocket POS, ${name}!</h1>
            <p>Your shop owner has added you as a <strong>${role}</strong>.</p>
            <p>Click below to set your password and activate your account:</p>
            <a href="${activationUrl}" style="display: inline-block; padding: 12px 25px; color: #ffffff; background-color: #4f46e5; border-radius: 8px; text-decoration: none; font-weight: bold;">Set Up My Password</a>
        `;

        staffDebug('POST / success: new user (activation email queued)', { staffId: String(newStaff._id), userId: String(newUser._id) });
        console.log('[staffRoutes] activation link build (token not logged — length only):', {
            CLIENT_URL: process.env.CLIENT_URL || '(MISSING — set in .env or activation links are wrong)',
            pathSuffix: '/staff-setup/<token>',
            tokenLengthChars: activationToken.length,
            recipient: normalizedEmail,
        });
        res.status(201).json({
            message: `Staff member ${newStaff.name} added. They will receive an email to set their password shortly.`,
            staff: newStaff,
        });

        console.log('[staffRoutes] POST /staff → queue email activation-new-staff', { to: newUser.email, userId: String(newUser._id) });
        sendEmail.queueSendEmail(
            {
                to: newUser.email,
                subject: 'Pocket POS Account Activation',
                html: message,
            },
            'activation-new-staff'
        );
        console.log('[staffRoutes] ROUTE DONE POST /api/staff → 201 new user (email queued async)', {
            staffId: String(newStaff._id),
            userId: String(newUser._id),
        });

    } catch (error) {
        staffDebug('POST / error: catch', { message: error.message, code: error.code });
        console.error('[staffRoutes] POST /api/staff → 500 or handled', error.message, error.code);
        console.error('Staff POST error:', error.message, error);
        if (error.code === 11000) {
            return res.status(409).json({
                error: 'The email is already added in your shop. Please use a different email.'
            });
        }
        res.status(500).json({ error: 'Internal Server Error.' });
    }
});

// ====================================================================
// @route   PUT /api/staff/:id/active
// @desc    Set staff active flag explicitly (idempotent; avoids double-toggle bugs)
// @body    { "active": true | false }
// @access  Private (owner-only)
// ====================================================================
router.put('/:id/active', protect, async (req, res) => {
    console.log('[staffRoutes] ROUTE HIT PUT /api/staff/:id/active', new Date().toISOString(), {
        staffId: req.params.id,
        body: req.body,
        userId: req.user?.id?.toString?.(),
        storeId: req.user?.storeId?.toString?.() || null,
    });
    if (!isowner(req.user.role)) {
        console.log('[staffRoutes] PUT /:id/active → 403 not owner');
        return res.status(403).json({ error: 'Access denied. Only the owner can update staff status.' });
    }

    const { active: targetActive } = req.body;
    if (typeof targetActive !== 'boolean') {
        console.log('[staffRoutes] PUT /:id/active → 400 body.active not boolean', req.body);
        return res.status(400).json({ error: 'Request body must include active: true or false.' });
    }

    const staffId = req.params.id;

    try {
        if (!req.user.storeId) {
            console.log('[staffRoutes] PUT /:id/active → 400 no storeId');
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffMember = await Staff.findOne({ _id: staffId, storeId: req.user.storeId });
        if (!staffMember) {
            console.log('[staffRoutes] PUT /:id/active → 404 staff not found', { staffId });
            return res.status(404).json({ error: 'Staff member not found or unauthorized.' });
        }
        if (isowner(staffMember.role)) {
            console.log('[staffRoutes] PUT /:id/active → 400 cannot change owner');
            return res.status(400).json({ error: 'Cannot deactivate the primary owner account.' });
        }

        const linkedUser = await User.findById(staffMember.userId);
        if (!linkedUser) {
            console.log('[staffRoutes] PUT /:id/active → 404 linked user missing');
            return res.status(404).json({ error: 'Linked user account not found.' });
        }

        console.log('[staffRoutes] PUT /:id/active → applying state', { staffId, targetActive });
        return await applyStaffActiveState(res, {
            staffMember,
            linkedUser,
            targetActive,
            staffName: staffMember.name,
        });
    } catch (error) {
        console.error('[staffRoutes] PUT /api/staff/:id/active → 500', error.message);
        console.error('Staff PUT /active error:', error.message);
        res.status(500).json({ error: 'Failed to update staff status.' });
    }
});

// ====================================================================
// @route   PUT /api/staff/:id/toggle
// @desc    Toggle active (legacy). Prefer PUT /:id/active with explicit boolean.
// @access  Private (owner-only access)
// ====================================================================
router.put('/:id/toggle', protect, async (req, res) => {
    console.log('[staffRoutes] ROUTE HIT PUT /api/staff/:id/toggle', new Date().toISOString(), {
        staffId: req.params.id,
        userId: req.user?.id?.toString?.(),
        storeId: req.user?.storeId?.toString?.() || null,
    });
    if (!isowner(req.user.role)) {
        console.log('[staffRoutes] PUT /:id/toggle → 403 not owner');
        return res.status(403).json({ error: 'Access denied. Only the owner can update staff status.' });
    }

    const staffId = req.params.id;

    try {
        if (!req.user.storeId) {
            console.log('[staffRoutes] PUT /:id/toggle → 400 no storeId');
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffMember = await Staff.findOne({ _id: staffId, storeId: req.user.storeId });

        if (!staffMember) {
            console.log('[staffRoutes] PUT /:id/toggle → 404 staff not found', { staffId });
            return res.status(404).json({ error: 'Staff member not found or unauthorized.' });
        }

        if (isowner(staffMember.role)) {
            console.log('[staffRoutes] PUT /:id/toggle → 400 cannot change owner');
            return res.status(400).json({ error: 'Cannot deactivate the primary owner account.' });
        }

        const linkedUser = await User.findById(staffMember.userId);
        if (!linkedUser) {
            console.log('[staffRoutes] PUT /:id/toggle → 404 linked user missing');
            return res.status(404).json({ error: 'Linked user account not found.' });
        }

        const currentlyActive = staffMember.active === true;
        const isPendingInvite = !!linkedUser.resetPasswordToken && !currentlyActive;

        // Pending invite: always treat toggle as "turn off" (revoke), never activate without password
        if (isPendingInvite) {
            console.log('[staffRoutes] PUT /:id/toggle → revoke pending invite', { staffId });
            return await applyStaffActiveState(res, {
                staffMember,
                linkedUser,
                targetActive: false,
                staffName: staffMember.name,
            });
        }

        console.log('[staffRoutes] PUT /:id/toggle → flip active', { staffId, from: currentlyActive, to: !currentlyActive });
        return await applyStaffActiveState(res, {
            staffMember,
            linkedUser,
            targetActive: !currentlyActive,
            staffName: staffMember.name,
        });
    } catch (error) {
        console.error('[staffRoutes] PUT /api/staff/:id/toggle → 500', error.message);
        console.error('Staff toggle error:', error.message);
        res.status(500).json({ error: 'Failed to update staff status.' });
    }
});


// ====================================================================
// @route   DELETE /api/staff/:id
// @desc    Remove a staff member (Requires cleanup in User model)
// @access  Private (owner-only access)
// ====================================================================
router.delete('/:id', protect, async (req, res) => {
    console.log('[staffRoutes] ROUTE HIT DELETE /api/staff/:id', new Date().toISOString(), {
        staffId: req.params.id,
        userId: req.user?.id?.toString?.(),
        storeId: req.user?.storeId?.toString?.() || null,
    });
    // FIX: Use the corrected helper function 'isowner'
    if (!isowner(req.user.role)) {
        console.log('[staffRoutes] DELETE /:id → 403 not owner');
        return res.status(403).json({ error: 'Access denied. Only the owner can remove staff.' });
    }
    
    const staffId = req.params.id;

    try {
        if (!req.user.storeId) {
            console.log('[staffRoutes] DELETE /:id → 400 no storeId');
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffMember = await Staff.findOne({ _id: staffId, storeId: req.user.storeId });
        
        if (!staffMember) {
            console.log('[staffRoutes] DELETE /:id → 404 staff not found', { staffId });
            return res.status(404).json({ error: 'Staff member not found or unauthorized.' });
        }
        
        // FIX: Use the corrected helper function 'isowner'
        if (isowner(staffMember.role)) {
            console.log('[staffRoutes] DELETE /:id → 400 cannot remove owner');
            return res.status(400).json({ error: 'Cannot remove the primary owner account.' });
        }

        const userId = staffMember.userId;

        // 1. Delete all attendance records for this staff
        await Attendance.deleteMany({ staffId });

        // 2. Remove this user from all chat participants (so chats don't reference deleted user)
        if (userId) {
            await Chat.updateMany(
                { participants: userId },
                { $pull: { participants: userId } }
            );
        }

        // 3. Delete the linked User record (staff cannot log in again)
        if (userId) {
            await User.findByIdAndDelete(userId);
        }

        // 4. Delete the Staff entry
        await Staff.findByIdAndDelete(staffId);

        console.log('[staffRoutes] ROUTE DONE DELETE /api/staff/:id → 200', { staffId, removedName: staffMember.name });
        res.json({ message: `${staffMember.name} permanently removed. All data deleted; they cannot log in again.` });

    } catch (error) {
        console.error('[staffRoutes] DELETE /api/staff/:id → 500', error.message);
        console.error('Staff DELETE error:', error.message);
        res.status(500).json({ error: 'Failed to remove staff member.' });
    }
});

router.put('/:id/role', protect, async (req, res) => {
    console.log('[staffRoutes] ROUTE HIT PUT /api/staff/:id/role', new Date().toISOString(), {
        staffId: req.params.id,
        body: req.body,
        userId: req.user?.id?.toString?.(),
    });
    if (!isowner(req.user.role)) {
        console.log('[staffRoutes] PUT /:id/role → 403 not owner');
        return res.status(403).json({ error: 'Access denied. Only the owner can change roles.' });
    }

    const { role: newRole } = req.body;
    const staffId = req.params.id;

    // 1. Validation
    if (!newRole || (newRole !== 'Manager' && newRole !== 'Cashier')) {
        console.log('[staffRoutes] PUT /:id/role → 400 invalid role', { newRole });
        return res.status(400).json({ error: 'Invalid role. Must be Manager or Cashier.' });
    }

    try {
        // 2. Find the staff member
        if (!req.user.storeId) {
            console.log('[staffRoutes] PUT /:id/role → 400 no storeId');
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }
        const staffMember = await Staff.findOne({ _id: staffId, storeId: req.user.storeId });
        if (!staffMember) {
            console.log('[staffRoutes] PUT /:id/role → 404 staff not found', { staffId });
            return res.status(404).json({ error: 'Staff member not found.' });
        }

        // 3. Skip check if the role isn't actually changing
        if (staffMember.role === newRole) {
            console.log('[staffRoutes] ROUTE DONE PUT /api/staff/:id/role → 200 (no change)', { staffId, role: newRole });
            return res.json({ message: 'Role updated (no change).', staff: staffMember });
        }

        // 4. PLAN LIMIT: Only BASIC has staff limits. PRO and PREMIUM allow unlimited staff and any role mix.

        // 5. Update both Staff and User records
        const updatedStaff = await Staff.findByIdAndUpdate(
            staffId,
            { role: newRole },
            { new: true, runValidators: true }
        );

        if (updatedStaff.userId) {
            await User.findByIdAndUpdate(updatedStaff.userId, { role: newRole });
        }

        console.log('[staffRoutes] ROUTE DONE PUT /api/staff/:id/role → 200', { staffId, newRole });
        res.json({ 
            message: `Role for ${updatedStaff.name} updated to ${newRole}.`, 
            staff: updatedStaff 
        });

    } catch (error) {
        console.error('[staffRoutes] PUT /api/staff/:id/role → 500', error.message);
        console.error('Staff role update error:', error.message);
        res.status(500).json({ error: 'Failed to update staff role.' });
    }
});


module.exports = router;
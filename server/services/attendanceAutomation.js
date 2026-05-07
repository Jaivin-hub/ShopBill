const Store = require('../models/Store');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { sendPushNotification } = require('./firebaseAdmin');

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const sentReminderKeys = new Set();
let isRunning = false;

const timeToMinutes = (value) => {
    const t = String(value || '').trim();
    if (!HHMM_PATTERN.test(t)) return null;
    const [h, m] = t.split(':').map(Number);
    return (h * 60) + m;
};

const resolveEffectiveSchedule = (storePolicy = {}, staffSchedule = {}) => {
    const policyEnabled = storePolicy.enabled === true;
    const shiftEnabled = staffSchedule.enabled === true;
    const punchInStart = shiftEnabled ? (staffSchedule.punchInStart || '') : (storePolicy.defaultPunchInStart || '');
    const punchInEnd = shiftEnabled ? (staffSchedule.punchInEnd || '') : (storePolicy.defaultPunchInEnd || '');
    return { policyEnabled, shiftEnabled, punchInStart, punchInEnd };
};

const formatDateKey = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const sendShiftReminderToStaff = async ({ io, userId, title, message, soundCategory = 'attendance' }) => {
    if (!userId) return;
    const userIdStr = String(userId);
    const payload = {
        _id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: 'system',
        category: 'Info',
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString(),
        metadata: {}
    };

    if (io) {
        io.to(`user_${userIdStr}`).emit('new_notification', payload);
    }

    const user = await User.findById(userId).select('deviceTokens').lean();
    const tokens = (user?.deviceTokens || []).map((d) => d?.token).filter(Boolean);
    if (tokens.length > 0) {
        await sendPushNotification(tokens, {
            title,
            body: message,
            soundCategory,
            data: {
                type: 'notification',
                link: '/notifications',
                notificationType: 'attendance_shift_reminder',
                soundCategory
            }
        });
    }
};

const processShiftNotifications = async ({ io, store, staffList, now }) => {
    const storePolicy = store?.settings?.attendancePolicy || {};
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    const dateKey = formatDateKey(now);

    for (const staff of staffList) {
        const effective = resolveEffectiveSchedule(storePolicy, staff?.workSchedule || {});
        if (!effective.policyEnabled) continue;
        const startMins = timeToMinutes(effective.punchInStart);
        if (startMins == null) continue;

        const userId = staff?.userId?._id || staff?.userId;
        if (!userId) continue;

        const reminderMins = (startMins - 5 + 1440) % 1440;
        const staffName = String(staff?.name || 'Staff');
        const shiftName = String(staff?.workSchedule?.shiftName || '').trim();
        const shiftLabel = shiftName ? ` (${shiftName})` : '';

        if (nowMinutes === reminderMins) {
            const key = `${store._id}:${staff._id}:${dateKey}:before5:${startMins}`;
            if (!sentReminderKeys.has(key)) {
                sentReminderKeys.add(key);
                await sendShiftReminderToStaff({
                    io,
                    userId,
                    title: 'Shift Reminder',
                    message: `${staffName}${shiftLabel}: shift starts in 5 minutes.`
                });
            }
        }

        if (nowMinutes === startMins) {
            const key = `${store._id}:${staff._id}:${dateKey}:start:${startMins}`;
            if (!sentReminderKeys.has(key)) {
                sentReminderKeys.add(key);
                await sendShiftReminderToStaff({
                    io,
                    userId,
                    title: 'Punch In Reminder',
                    message: `${staffName}${shiftLabel}: your punch-in time has started. Please punch in now.`
                });
            }
        }
    }
};

const processAutoPunchOut = async ({ io, store, staffList, now }) => {
    const storePolicy = store?.settings?.attendancePolicy || {};
    const staffById = new Map(staffList.map((s) => [String(s._id), s]));
    const activeAttendance = await Attendance.find({
        storeId: store._id,
        status: 'active',
        punchOut: null
    });

    for (const attendance of activeAttendance) {
        const staff = staffById.get(String(attendance.staffId));
        if (!staff) continue;
        const effective = resolveEffectiveSchedule(storePolicy, staff?.workSchedule || {});
        if (!effective.policyEnabled) continue;
        const endMins = timeToMinutes(effective.punchInEnd);
        if (endMins == null) continue;

        const baseDate = new Date(attendance.date || attendance.punchIn || now);
        const cutoffAt = new Date(
            baseDate.getFullYear(),
            baseDate.getMonth(),
            baseDate.getDate(),
            Math.floor(endMins / 60),
            endMins % 60,
            0,
            0
        );
        const punchInMins = (new Date(attendance.punchIn || baseDate).getHours() * 60) + new Date(attendance.punchIn || baseDate).getMinutes();
        if (endMins <= punchInMins) {
            cutoffAt.setDate(cutoffAt.getDate() + 1);
        }

        if (now >= cutoffAt) {
            if (attendance.onBreak) {
                const activeBreak = attendance.breaks && attendance.breaks.find((b) => !b.breakEnd);
                if (activeBreak) {
                    activeBreak.breakEnd = now;
                    activeBreak.breakDuration = Math.round((activeBreak.breakEnd - activeBreak.breakStart) / (1000 * 60));
                }
                attendance.onBreak = false;
            }

            attendance.punchOut = now;
            attendance.status = 'completed';
            await attendance.save();

            const staffUserId = staff?.userId?._id || staff?.userId;
            await sendShiftReminderToStaff({
                io,
                userId: staffUserId,
                title: 'Auto Punch-Out Completed',
                message: `${staff?.name || 'Staff'}: you were auto punched out at shift/shop close time.`
            });
        }
    }
};

const runAttendanceAutomation = async (io) => {
    if (isRunning) return;
    isRunning = true;
    try {
        const now = new Date();
        const stores = await Store.find({
            'settings.attendancePolicy.enabled': true
        }).select('settings.attendancePolicy ownerId');

        for (const store of stores) {
            const staffList = await Staff.find({
                storeId: store._id,
                active: true,
                role: { $in: ['Manager', 'Cashier'] }
            }).select('_id userId name workSchedule').lean();

            if (staffList.length === 0) continue;
            await processShiftNotifications({ io, store, staffList, now });
            await processAutoPunchOut({ io, store, staffList, now });
        }
    } catch (error) {
        console.error('Attendance automation error:', error.message);
    } finally {
        isRunning = false;
    }
};

module.exports = { runAttendanceAutomation };

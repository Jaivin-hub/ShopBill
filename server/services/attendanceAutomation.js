const Store = require('../models/Store');
const Staff = require('../models/Staff');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendPushNotification } = require('./firebaseAdmin');
const { collectPushTokens } = require('../utils/pushTokens');
const { formatHHmmTo12Hour } = require('../utils/formatTime12Hour');

const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const REMINDER_GRACE_MINUTES = 3;
let isRunning = false;

/** Wall-clock for shift times (HH:mm) — default India; override with ATTENDANCE_TZ (e.g. America/New_York). */
const ATTENDANCE_TZ = process.env.ATTENDANCE_TZ || 'Asia/Kolkata';

const formatDateKeyInTz = (date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: ATTENDANCE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const getClockMinutesInTz = (date) => {
    const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: ATTENDANCE_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
    const match = String(formatted).match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    return (h * 60) + m;
};

const timeToMinutes = (value) => {
    const t = String(value || '').trim();
    if (!HHMM_PATTERN.test(t)) return null;
    const [h, m] = t.split(':').map(Number);
    return (h * 60) + m;
};

/** True when current clock minute is at or just after target (handles cron starting a few seconds late). */
const isMinuteDue = (nowMinutes, targetMinutes, graceMinutes = REMINDER_GRACE_MINUTES) => {
    const diff = (nowMinutes - targetMinutes + 1440) % 1440;
    return diff >= 0 && diff < graceMinutes;
};

const resolveEffectiveSchedule = (staffSchedule = {}) => {
    const shiftEnabled = staffSchedule.enabled === true;
    const punchInStart = shiftEnabled ? (staffSchedule.punchInStart || '') : '';
    const punchInEnd = shiftEnabled ? (staffSchedule.punchInEnd || '') : '';
    return { shiftEnabled, punchInStart, punchInEnd };
};

const persistAndPushShiftReminder = async ({
    io,
    storeId,
    ownerId,
    staffId,
    userId,
    title,
    message,
    reminderKey,
    reminderKind,
}) => {
    if (!userId || !storeId || !ownerId) return false;

    const userIdStr = String(userId);
    const existing = await Notification.findOne({
        storeId,
        type: 'attendance_shift_reminder',
        recipientUserId: userId,
        'metadata.reminderKey': reminderKey,
    }).select('_id').lean();
    if (existing) return false;

    const notification = await Notification.create({
        storeId,
        ownerId,
        actorId: null,
        type: 'attendance_shift_reminder',
        category: 'Info',
        title,
        message,
        recipientUserId: userId,
        metadata: {
            staffId,
            reminderKey,
            reminderKind,
        },
    });

    const notificationData = {
        ...notification.toObject(),
        isRead: false,
        soundCategory: 'attendance',
    };

    if (io) {
        io.to(`user_${userIdStr}`).emit('new_notification', notificationData);
    }

    const user = await User.findById(userId).select('deviceTokens pushNotificationsEnabled').lean();
    if (user?.pushNotificationsEnabled === false) return true;

    const tokens = collectPushTokens([user]);
    if (tokens.length > 0) {
        await sendPushNotification(tokens, {
            title,
            body: message,
            soundCategory: 'attendance',
            data: {
                type: 'notification',
                link: '/notifications',
                notificationId: notification._id?.toString() || '',
                storeId: String(storeId),
                notificationType: 'attendance_shift_reminder',
                soundCategory: 'attendance',
            },
        });
    }

    return true;
};

const processShiftNotifications = async ({ io, store, staffList, now }) => {
    const nowMinutes = getClockMinutesInTz(now);
    const dateKey = formatDateKeyInTz(now);
    const ownerId = store.ownerId;

    for (const staff of staffList) {
        const effective = resolveEffectiveSchedule(staff?.workSchedule || {});
        if (!effective.shiftEnabled) continue;
        const startMins = timeToMinutes(effective.punchInStart);
        if (startMins == null) continue;

        const userId = staff?.userId?._id || staff?.userId;
        if (!userId) continue;

        const reminderMins = (startMins - 5 + 1440) % 1440;
        const staffName = String(staff?.name || 'Staff');
        const shiftName = String(staff?.workSchedule?.shiftName || '').trim();
        const shiftLabel = shiftName ? ` (${shiftName})` : '';
        const startDisp = formatHHmmTo12Hour(effective.punchInStart);

        if (isMinuteDue(nowMinutes, reminderMins)) {
            const reminderKey = `${store._id}:${staff._id}:${dateKey}:before5:${startMins}`;
            await persistAndPushShiftReminder({
                io,
                storeId: store._id,
                ownerId,
                staffId: staff._id,
                userId,
                title: 'Punch-in in 5 minutes',
                message: `${staffName}${shiftLabel}: punch-in starts in 5 minutes (at ${startDisp}).`,
                reminderKey,
                reminderKind: 'before5',
            });
        }

        if (isMinuteDue(nowMinutes, startMins)) {
            const reminderKey = `${store._id}:${staff._id}:${dateKey}:start:${startMins}`;
            await persistAndPushShiftReminder({
                io,
                storeId: store._id,
                ownerId,
                staffId: staff._id,
                userId,
                title: 'Punch-in time',
                message: `${staffName}${shiftLabel}: it is now your punch-in time (${startDisp}). Please punch in.`,
                reminderKey,
                reminderKind: 'start',
            });
        }
    }
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
        metadata: {},
    };

    if (io) {
        io.to(`user_${userIdStr}`).emit('new_notification', payload);
    }

    const user = await User.findById(userId).select('deviceTokens pushNotificationsEnabled').lean();
    if (user?.pushNotificationsEnabled === false) return;
    const tokens = collectPushTokens([user]);
    if (tokens.length > 0) {
        await sendPushNotification(tokens, {
            title,
            body: message,
            soundCategory,
            data: {
                type: 'notification',
                link: '/notifications',
                notificationType: 'attendance_shift_reminder',
                soundCategory,
            },
        });
    }
};

const processAutoPunchOut = async ({ io, store, staffList, now }) => {
    const staffById = new Map(staffList.map((s) => [String(s._id), s]));
    const activeAttendance = await Attendance.find({
        storeId: store._id,
        status: 'active',
        punchOut: null,
    });

    for (const attendance of activeAttendance) {
        const staff = staffById.get(String(attendance.staffId));
        if (!staff) continue;
        const effective = resolveEffectiveSchedule(staff?.workSchedule || {});
        if (!effective.shiftEnabled) continue;
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
                message: `${staff?.name || 'Staff'}: you were auto punched out at shift/shop close time.`,
            });
        }
    }
};

const runAttendanceAutomation = async (io) => {
    if (isRunning) return;
    isRunning = true;
    try {
        const now = new Date();
        const stores = await Store.find({ isActive: { $ne: false } }).select('_id ownerId').lean();

        for (const store of stores) {
            if (!store.ownerId) continue;

            const staffList = await Staff.find({
                storeId: store._id,
                active: { $ne: false },
                role: { $in: ['Manager', 'Cashier'] },
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

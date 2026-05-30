const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');

/** Wall-clock for shift times (HH:mm) — default India; override with ATTENDANCE_TZ. */
const ATTENDANCE_TZ = process.env.ATTENDANCE_TZ || 'Asia/Kolkata';
const HHMM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeToMinutes = (value) => {
    const t = String(value || '').trim();
    if (!HHMM_PATTERN.test(t)) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};

const formatDateKeyInTz = (date, timeZone = ATTENDANCE_TZ) =>
    new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);

const getClockMinutesInTz = (date, timeZone = ATTENDANCE_TZ) => {
    const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
    const match = String(formatted).match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

const addDaysToDateKey = (dateKey, days) => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().slice(0, 10);
};

/**
 * Punch-out cutoff from work profile (punch-out / autoPunchOutTime fields).
 */
const resolveAutoPunchOutEndMinutes = (workSchedule = {}) => {
    if (workSchedule?.enabled !== true) return null;
    if (workSchedule?.autoPunchOutEnabled === false) return null;
    const endTime = String(workSchedule.autoPunchOutTime || workSchedule.punchInEnd || '').trim();
    return timeToMinutes(endTime);
};

/**
 * Whether active attendance should be auto punched out at `now` (shop timezone).
 */
const shouldAutoPunchOut = ({ attendance, endMins, now = new Date() }) => {
    if (endMins == null || !attendance) return false;

    const punchIn = new Date(attendance.punchIn || attendance.date || now);
    const attKey = formatDateKeyInTz(punchIn);
    const nowKey = formatDateKeyInTz(now);
    const nowMins = getClockMinutesInTz(now);
    const punchInMins = getClockMinutesInTz(punchIn);

    if (endMins > punchInMins) {
        if (nowKey < attKey) return false;
        if (nowKey > attKey) return true;
        return nowMins >= endMins;
    }

    const endDayKey = addDaysToDateKey(attKey, 1);
    if (nowKey < attKey) return false;
    if (nowKey > endDayKey) return true;
    if (nowKey === endDayKey) return nowMins >= endMins;
    return false;
};

const completeAutoPunchOutRecord = async (attendance, now) => {
    if (attendance.onBreak) {
        const activeBreak = attendance.breaks && attendance.breaks.find((b) => !b.breakEnd);
        if (activeBreak) {
            activeBreak.breakEnd = now;
            activeBreak.breakDuration = Math.round(
                (activeBreak.breakEnd - activeBreak.breakStart) / (1000 * 60)
            );
        }
        attendance.onBreak = false;
    }
    attendance.punchOut = now;
    attendance.status = 'completed';
    const diff = attendance.punchOut - attendance.punchIn;
    attendance.workingHours = Math.max(0, Math.round(diff / (1000 * 60)));
    await attendance.save();
};

/**
 * Auto punch out all staff at a store whose scheduled punch-out time has passed.
 * @param {import('mongoose').Types.ObjectId|string} storeId
 * @param {{ onPunchedOut?: (ctx: { attendance, staff, now }) => Promise<void>|void }} [options]
 */
async function applyAutoPunchOutForStore(storeId, options = {}) {
    if (!storeId) return 0;
    const now = new Date();
    const activeAttendance = await Attendance.find({
        storeId,
        status: 'active',
        punchOut: null,
    });
    if (!activeAttendance.length) return 0;

    const staffIds = activeAttendance.map((a) => a.staffId).filter(Boolean);
    const staffList = await Staff.find({ _id: { $in: staffIds } })
        .select('_id userId name role workSchedule')
        .lean();
    const staffById = new Map(staffList.map((s) => [String(s._id), s]));

    let punchedCount = 0;
    for (const attendance of activeAttendance) {
        const staff = staffById.get(String(attendance.staffId));
        if (!staff) continue;
        const endMins = resolveAutoPunchOutEndMinutes(staff.workSchedule || {});
        if (!shouldAutoPunchOut({ attendance, endMins, now })) continue;

        await completeAutoPunchOutRecord(attendance, now);
        punchedCount += 1;
        if (typeof options.onPunchedOut === 'function') {
            await options.onPunchedOut({ attendance, staff, now });
        }
    }
    return punchedCount;
}

module.exports = {
    ATTENDANCE_TZ,
    timeToMinutes,
    formatDateKeyInTz,
    getClockMinutesInTz,
    resolveAutoPunchOutEndMinutes,
    shouldAutoPunchOut,
    applyAutoPunchOutForStore,
};

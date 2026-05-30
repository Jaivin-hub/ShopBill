const Notification = require('../models/Notification');

const Store = require('../models/Store');

const { emitAlert } = require('../routes/notificationRoutes');

const { formatDateKeyInTz } = require('./attendanceAutoPunchOut');



const roleLabel = (role) => {

    const r = String(role || '').trim();

    if (r === 'Manager') return 'Manager';

    if (r === 'Cashier') return 'Cashier';

    return r || 'Staff';

};



const formatWorkedDuration = (workingMinutes) => {

    const m = Number(workingMinutes);

    if (!Number.isFinite(m) || m <= 0) return '';

    const hours = Math.floor(m / 60);

    const mins = m % 60;

    return ` Worked ${hours}h ${mins}m.`;

};



/**

 * Notify owner, managers, and the punched-out employee (personalized).

 */

async function notifyAutoPunchOut({ io, storeId, staff, attendance, now = new Date() }) {

    if (!storeId || !staff) return;



    const staffUserId = staff?.userId?._id || staff?.userId;

    const staffUserIdStr = staffUserId ? String(staffUserId) : '';

    const staffName = String(staff?.name || 'Staff').trim();

    const staffRole = roleLabel(staff?.role);

    const duration = formatWorkedDuration(attendance?.workingHours);

    const dateKey = formatDateKeyInTz(now);

    const dedupeKey = `auto_punch_out:${attendance?._id || staff._id}:${dateKey}`;



    const store = await Store.findById(storeId).select('ownerId').lean();

    if (!store?.ownerId) return;



    const existing = await Notification.findOne({

        storeId,

        type: 'attendance_auto_punch_out',

        'metadata.dedupeKey': dedupeKey,

        'metadata.forSelf': { $ne: true },

    })

        .select('_id')

        .lean();

    if (existing) return;



    const fakeReq = {

        app: { get: (key) => (key === 'socketio' ? io : null) },

        user: null,

    };



    // Owner + managers (system event — not attributed to the punched-out employee)

    await emitAlert(fakeReq, storeId, 'attendance_auto_punch_out', {

        staffId: staff._id,

        staffName,

        staffUserId: staffUserIdStr,

        attendanceId: attendance?._id,

        workingMinutes: attendance?.workingHours ?? null,

        dedupeKey,

        message: `${staffName} (${staffRole}) was automatically punched out. Shift finished.${duration}`,

    });



    // Same employee — personalized message

    if (staffUserId) {

        await emitAlert(fakeReq, storeId, 'attendance_auto_punch_out', {

            targetUserId: staffUserId,

            staffId: staff._id,

            attendanceId: attendance?._id,

            dedupeKey: `${dedupeKey}:self`,

            forSelf: true,

            title: 'Shift finished',

            message: `You were automatically punched out. Your shift has finished.${duration}`,

        });

    }

}



module.exports = { notifyAutoPunchOut };



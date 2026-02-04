const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Attendance = require('../models/Attendance');
const Staff = require('../models/Staff');

const router = express.Router();

/**
 * @route POST /api/attendance/punch-in
 * @desc Staff punches in (starts work)
 * @access Private (Staff only - Manager/Cashier)
 */
router.post('/punch-in', protect, async (req, res) => {
    try {
        // Only staff (Manager/Cashier) can punch in
        if (req.user.role === 'owner') {
            return res.status(403).json({ error: 'Owners cannot punch in. This feature is for staff members only.' });
        }

        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }

        // Find staff record
        const staff = await Staff.findOne({ 
            userId: req.user._id, 
            storeId: req.user.storeId 
        });

        if (!staff) {
            return res.status(404).json({ error: 'Staff record not found. Please contact your administrator.' });
        }

        // Check if already punched in today
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingAttendance = await Attendance.findOne({
            staffId: staff._id,
            date: { 
                $gte: today, 
                $lt: tomorrow 
            },
            status: 'active'
        });

        if (existingAttendance) {
            return res.status(400).json({ 
                error: 'You are already punched in. Please punch out first before punching in again.',
                attendance: existingAttendance
            });
        }

        // Create new attendance record
        // Set date to start of day for consistent querying
        const attendanceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const attendance = await Attendance.create({
            staffId: staff._id,
            storeId: req.user.storeId,
            date: attendanceDate,
            punchIn: new Date(),
            status: 'active',
            location: req.body.location || null,
            notes: req.body.notes || ''
        });

        res.status(201).json({
            success: true,
            message: 'Punched in successfully',
            attendance: {
                _id: attendance._id,
                punchIn: attendance.punchIn,
                status: attendance.status,
                date: attendance.date
            }
        });
    } catch (error) {
        console.error('Punch In Error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        res.status(500).json({ 
            error: 'Failed to punch in. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route POST /api/attendance/punch-out
 * @desc Staff punches out (ends work)
 * @access Private (Staff only - Manager/Cashier)
 */
router.post('/punch-out', protect, async (req, res) => {
    try {
        // Only staff (Manager/Cashier) can punch out
        if (req.user.role === 'owner') {
            return res.status(403).json({ error: 'Owners cannot punch out. This feature is for staff members only.' });
        }

        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }

        // Find staff record
        const staff = await Staff.findOne({ 
            userId: req.user._id, 
            storeId: req.user.storeId 
        });

        if (!staff) {
            return res.status(404).json({ error: 'Staff record not found. Please contact your administrator.' });
        }

        // Find today's active attendance
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendance = await Attendance.findOne({
            staffId: staff._id,
            date: { $gte: today, $lt: tomorrow },
            status: 'active'
        });

        if (!attendance) {
            return res.status(400).json({ error: 'No active punch-in found. Please punch in first.' });
        }

        // Update attendance with punch out time
        attendance.punchOut = new Date();
        attendance.status = 'completed';
        
        // Calculate working hours
        const diff = attendance.punchOut - attendance.punchIn;
        attendance.workingHours = Math.round(diff / (1000 * 60)); // in minutes
        
        if (req.body.notes) {
            attendance.notes = req.body.notes;
        }

        await attendance.save();

        // Calculate hours and minutes for display
        const hours = Math.floor(attendance.workingHours / 60);
        const minutes = attendance.workingHours % 60;

        res.json({
            success: true,
            message: 'Punched out successfully',
            attendance: {
                _id: attendance._id,
                punchIn: attendance.punchIn,
                punchOut: attendance.punchOut,
                workingHours: attendance.workingHours,
                hoursWorked: `${hours}h ${minutes}m`,
                status: attendance.status
            }
        });
    } catch (error) {
        console.error('Punch Out Error:', error);
        res.status(500).json({ error: 'Failed to punch out. Please try again.' });
    }
});

/**
 * @route GET /api/attendance/current
 * @desc Get current punch status for logged-in staff
 * @access Private (Staff only)
 */
router.get('/current', protect, async (req, res) => {
    try {
        if (req.user.role === 'owner') {
            return res.json({ success: true, attendance: null, message: 'Owners do not need to punch in/out' });
        }

        if (!req.user.storeId) {
            return res.json({ success: true, attendance: null });
        }

        const staff = await Staff.findOne({ 
            userId: req.user._id, 
            storeId: req.user.storeId 
        });

        if (!staff) {
            return res.json({ success: true, attendance: null });
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const attendance = await Attendance.findOne({
            staffId: staff._id,
            date: { $gte: today, $lt: tomorrow },
            status: 'active'
        });

        if (attendance) {
            // Calculate hours worked so far
            const now = new Date();
            const diff = now - attendance.punchIn;
            const minutesWorked = Math.round(diff / (1000 * 60));
            const hours = Math.floor(minutesWorked / 60);
            const mins = minutesWorked % 60;

            return res.json({
                success: true,
                attendance: {
                    _id: attendance._id,
                    punchIn: attendance.punchIn,
                    status: attendance.status,
                    minutesWorked,
                    hoursWorked: `${hours}h ${mins}m`
                }
            });
        }

        res.json({ success: true, attendance: null });
    } catch (error) {
        console.error('Get Current Attendance Error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance status.' });
    }
});

/**
 * @route GET /api/attendance/my-records
 * @desc Get attendance records for logged-in staff
 * @access Private (Staff only)
 */
router.get('/my-records', protect, async (req, res) => {
    try {
        if (req.user.role === 'owner') {
            return res.status(403).json({ error: 'This endpoint is for staff members only.' });
        }

        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected.' });
        }

        const staff = await Staff.findOne({ 
            userId: req.user._id, 
            storeId: req.user.storeId 
        });

        if (!staff) {
            return res.status(404).json({ error: 'Staff record not found.' });
        }

        const { startDate, endDate, limit = 30 } = req.query;
        const query = { staffId: staff._id };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const records = await Attendance.find(query)
            .sort({ date: -1, punchIn: -1 })
            .limit(parseInt(limit))
            .lean();

        // Format records with hours worked
        const formattedRecords = records.map(record => {
            const hours = Math.floor(record.workingHours / 60);
            const minutes = record.workingHours % 60;
            return {
                ...record,
                hoursWorked: record.status === 'completed' ? `${hours}h ${minutes}m` : 'In Progress',
                dateString: new Date(record.date).toLocaleDateString()
            };
        });

        res.json({
            success: true,
            records: formattedRecords,
            count: formattedRecords.length
        });
    } catch (error) {
        console.error('Get My Records Error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records.' });
    }
});

/**
 * @route GET /api/attendance/staff/:staffId
 * @desc Get attendance records for a specific staff member (Owner/Manager only)
 * @access Private (Owner/Manager)
 */
router.get('/staff/:staffId', protect, async (req, res) => {
    try {
        // Only owners and managers can view staff attendance
        if (req.user.role !== 'owner' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: 'Access denied. Only owners and managers can view staff attendance.' });
        }

        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected.' });
        }

        const { staffId } = req.params;
        const { startDate, endDate, limit = 100 } = req.query;

        // Verify staff belongs to the same store
        const staff = await Staff.findOne({ 
            _id: staffId, 
            storeId: req.user.storeId 
        });

        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found or does not belong to your outlet.' });
        }

        const query = { staffId: staff._id };

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const records = await Attendance.find(query)
            .sort({ date: -1, punchIn: -1 })
            .limit(parseInt(limit))
            .lean();

        // Calculate summary statistics
        const completedRecords = records.filter(r => r.status === 'completed');
        const totalMinutes = completedRecords.reduce((sum, r) => sum + (r.workingHours || 0), 0);
        const totalHours = Math.floor(totalMinutes / 60);
        const totalDays = completedRecords.length;

        // Format records
        const formattedRecords = records.map(record => {
            const hours = Math.floor(record.workingHours / 60);
            const minutes = record.workingHours % 60;
            return {
                ...record,
                hoursWorked: record.status === 'completed' ? `${hours}h ${minutes}m` : 'In Progress',
                dateString: new Date(record.date).toLocaleDateString()
            };
        });

        res.json({
            success: true,
            staff: {
                _id: staff._id,
                name: staff.name,
                role: staff.role
            },
            records: formattedRecords,
            summary: {
                totalDays,
                totalHours: `${totalHours}h ${totalMinutes % 60}m`,
                totalMinutes,
                averageHoursPerDay: totalDays > 0 ? (totalHours / totalDays).toFixed(2) : 0
            },
            count: formattedRecords.length
        });
    } catch (error) {
        console.error('Get Staff Attendance Error:', error);
        res.status(500).json({ error: 'Failed to fetch staff attendance records.' });
    }
});

/**
 * @route GET /api/attendance/all
 * @desc Get all attendance records for the store (Owner/Manager only)
 * @access Private (Owner/Manager)
 */
router.get('/all', protect, async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: 'Access denied. Only owners and managers can view all attendance.' });
        }

        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected.' });
        }

        const { startDate, endDate, staffId, limit = 100 } = req.query;
        const query = { storeId: req.user.storeId };

        if (staffId) {
            query.staffId = staffId;
        }

        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const records = await Attendance.find(query)
            .populate('staffId', 'name role email')
            .sort({ date: -1, punchIn: -1 })
            .limit(parseInt(limit))
            .lean();

        // Format records
        const formattedRecords = records.map(record => {
            const hours = Math.floor(record.workingHours / 60);
            const minutes = record.workingHours % 60;
            return {
                ...record,
                staffName: record.staffId?.name || 'Unknown',
                staffRole: record.staffId?.role || 'Unknown',
                hoursWorked: record.status === 'completed' ? `${hours}h ${minutes}m` : 'In Progress',
                dateString: new Date(record.date).toLocaleDateString()
            };
        });

        res.json({
            success: true,
            records: formattedRecords,
            count: formattedRecords.length
        });
    } catch (error) {
        console.error('Get All Attendance Error:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records.' });
    }
});

module.exports = router;


const express = require('express');
const mongoose = require('mongoose');
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
        const body = req.body || {};

        // Only staff (Manager/Cashier) can punch in
        if (req.user.role === 'owner') {
            return res.status(403).json({ error: 'Owners cannot punch in. This feature is for staff members only.' });
        }

        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected. Please select an outlet first.' });
        }

        // Find staff record
        // Try with ObjectId conversion first, then fallback to direct values
        let staff = await Staff.findOne({ 
            userId: req.user._id, 
            storeId: req.user.storeId 
        });

        // If not found, try with ObjectId conversion
        if (!staff && mongoose.Types.ObjectId.isValid(req.user._id) && mongoose.Types.ObjectId.isValid(req.user.storeId)) {
            try {
                staff = await Staff.findOne({ 
                    userId: new mongoose.Types.ObjectId(req.user._id), 
                    storeId: new mongoose.Types.ObjectId(req.user.storeId)
                });
            } catch (lookupError) {
                console.error('Staff lookup error with ObjectId:', lookupError);
            }
        }

        if (!staff) {
            console.error('Staff not found:', {
                userId: req.user._id,
                userIdType: typeof req.user._id,
                storeId: req.user.storeId,
                storeIdType: typeof req.user.storeId,
                userRole: req.user.role
            });
            
            // Try to find any staff record for this user to help debug
            const anyStaff = await Staff.findOne({ userId: req.user._id });
            if (anyStaff) {
                console.error('Found staff record but storeId mismatch:', {
                    foundStoreId: anyStaff.storeId,
                    requestedStoreId: req.user.storeId
                });
            }
            
            return res.status(404).json({ 
                error: 'Staff record not found. Please contact your administrator.',
                details: 'Your account is not linked to a staff record for this outlet.'
            });
        }

        // Check if already punched in today
        // Use UTC to avoid timezone issues
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

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
        // Set date to start of day in UTC for consistent querying (avoids timezone issues)
        const attendanceDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        let attendance;
        try {
            // Prepare attendance data - mongoose will handle ObjectId conversion automatically
            const attendanceData = {
                staffId: staff._id,
                storeId: req.user.storeId, // mongoose will convert string to ObjectId if needed
                date: attendanceDate,
                punchIn: new Date(),
                status: 'active',
                notes: body.notes || '',
                workingHours: 0 // Initialize to 0 for active status
            };

            // Add location only if provided and valid
            if (body.location && typeof body.location === 'object') {
                if (body.location.latitude !== undefined || body.location.longitude !== undefined) {
                    attendanceData.location = {
                        latitude: body.location.latitude || null,
                        longitude: body.location.longitude || null
                    };
                }
            }

            // Validate all required fields before creation
            if (!attendanceData.staffId) {
                return res.status(400).json({ error: 'Staff ID is missing.' });
            }
            if (!attendanceData.storeId) {
                return res.status(400).json({ error: 'Store ID is missing.' });
            }
            if (!attendanceData.date) {
                return res.status(400).json({ error: 'Date is missing.' });
            }
            if (!attendanceData.punchIn) {
                return res.status(400).json({ error: 'Punch in time is missing.' });
            }

            console.log('Creating attendance with data:', {
                staffId: attendanceData.staffId?.toString(),
                storeId: attendanceData.storeId?.toString(),
                date: attendanceData.date,
                punchIn: attendanceData.punchIn,
                status: attendanceData.status
            });

            // Use new Attendance() and save() instead of create() for better error handling
            attendance = new Attendance(attendanceData);
            await attendance.save();
            
            console.log('Attendance created successfully:', attendance._id);
        } catch (createError) {
            console.error('=== ATTENDANCE CREATION ERROR ===');
            console.error('Error:', createError);
            console.error('Error name:', createError.name);
            console.error('Error message:', createError.message);
            console.error('Error code:', createError.code);
            
            if (createError.errors) {
                console.error('Validation errors:');
                Object.keys(createError.errors).forEach(key => {
                    console.error(`  ${key}:`, createError.errors[key].message);
                });
            }
            
            console.error('Data attempted:', {
                staffId: staff._id?.toString(),
                storeId: req.user.storeId?.toString(),
                date: attendanceDate,
                staffIdType: typeof staff._id,
                storeIdType: typeof req.user.storeId
            });
            console.error('=== END ERROR ===');
            
            // Return more specific error messages
            if (createError.name === 'ValidationError') {
                const validationErrors = Object.values(createError.errors).map(e => e.message).join(', ');
                return res.status(400).json({ 
                    error: 'Validation error',
                    details: validationErrors
                });
            }
            
            if (createError.name === 'CastError') {
                return res.status(400).json({ 
                    error: 'Invalid data format',
                    details: `Invalid ${createError.path}: ${createError.value}`
                });
            }
            
            return res.status(500).json({ 
                error: 'Failed to create attendance record.',
                details: process.env.NODE_ENV === 'development' ? createError.message : 'Please check server logs for details'
            });
        }

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
        const body = req.body || {};

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
        // Use UTC to avoid timezone issues
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        const attendance = await Attendance.findOne({
            staffId: staff._id,
            date: { $gte: today, $lt: tomorrow },
            status: 'active'
        });

        if (!attendance) {
            return res.status(400).json({ error: 'No active punch-in found. Please punch in first.' });
        }

        // If on break, end the break first
        if (attendance.onBreak) {
            const activeBreak = attendance.breaks && attendance.breaks.find(b => !b.breakEnd);
            if (activeBreak) {
                activeBreak.breakEnd = new Date();
                const breakDiff = activeBreak.breakEnd - activeBreak.breakStart;
                activeBreak.breakDuration = Math.round(breakDiff / (1000 * 60));
                attendance.onBreak = false;
            }
        }

        // Update attendance with punch out time
        attendance.punchOut = new Date();
        attendance.status = 'completed';
        
        // Calculate working hours
        const diff = attendance.punchOut - attendance.punchIn;
        attendance.workingHours = Math.round(diff / (1000 * 60)); // in minutes
        
        if (body.notes) {
            attendance.notes = body.notes;
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
 * @route POST /api/attendance/break-start
 * @desc Staff starts a break
 * @access Private (Staff only - Manager/Cashier)
 */
router.post('/break-start', protect, async (req, res) => {
    try {
        const body = req.body || {};

        // Only staff (Manager/Cashier) can take breaks
        if (req.user.role === 'owner') {
            return res.status(403).json({ error: 'Owners cannot take breaks. This feature is for staff members only.' });
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
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        const attendance = await Attendance.findOne({
            staffId: staff._id,
            date: { $gte: today, $lt: tomorrow },
            status: 'active'
        });

        if (!attendance) {
            return res.status(400).json({ error: 'No active punch-in found. Please punch in first.' });
        }

        if (attendance.onBreak) {
            return res.status(400).json({ error: 'You are already on a break. Please end your current break first.' });
        }

        // Add new break
        attendance.breaks = attendance.breaks || [];
        attendance.breaks.push({
            breakStart: new Date(),
            breakEnd: null,
            breakDuration: 0,
            notes: body.notes || ''
        });
        attendance.onBreak = true;

        await attendance.save();

        res.json({
            success: true,
            message: 'Break started successfully',
            attendance: {
                _id: attendance._id,
                onBreak: attendance.onBreak,
                breaks: attendance.breaks
            }
        });
    } catch (error) {
        console.error('Break Start Error:', error);
        res.status(500).json({ error: 'Failed to start break. Please try again.' });
    }
});

/**
 * @route POST /api/attendance/break-end
 * @desc Staff ends a break
 * @access Private (Staff only - Manager/Cashier)
 */
router.post('/break-end', protect, async (req, res) => {
    try {
        const body = req.body || {};

        // Only staff (Manager/Cashier) can end breaks
        if (req.user.role === 'owner') {
            return res.status(403).json({ error: 'Owners cannot take breaks. This feature is for staff members only.' });
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
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        const attendance = await Attendance.findOne({
            staffId: staff._id,
            date: { $gte: today, $lt: tomorrow },
            status: 'active'
        });

        if (!attendance) {
            return res.status(400).json({ error: 'No active punch-in found. Please punch in first.' });
        }

        if (!attendance.onBreak) {
            return res.status(400).json({ error: 'You are not currently on a break.' });
        }

        // Find the active break (the one without breakEnd)
        const activeBreak = attendance.breaks && attendance.breaks.find(b => !b.breakEnd);
        
        if (!activeBreak) {
            return res.status(400).json({ error: 'No active break found.' });
        }

        // End the break
        activeBreak.breakEnd = new Date();
        const breakDiff = activeBreak.breakEnd - activeBreak.breakStart;
        activeBreak.breakDuration = Math.round(breakDiff / (1000 * 60)); // in minutes

        // Update total break time
        let totalBreakMinutes = 0;
        attendance.breaks.forEach(breakPeriod => {
            if (breakPeriod.breakEnd && breakPeriod.breakStart) {
                totalBreakMinutes += breakPeriod.breakDuration || 0;
            }
        });
        attendance.totalBreakTime = totalBreakMinutes;
        attendance.onBreak = false;

        await attendance.save();

        // Calculate current working hours (excluding breaks)
        const totalDiff = new Date() - attendance.punchIn;
        const totalMinutes = Math.round(totalDiff / (1000 * 60));
        const currentWorkingHours = Math.max(0, totalMinutes - attendance.totalBreakTime);
        const hours = Math.floor(currentWorkingHours / 60);
        const minutes = currentWorkingHours % 60;

        res.json({
            success: true,
            message: 'Break ended successfully',
            attendance: {
                _id: attendance._id,
                onBreak: attendance.onBreak,
                breaks: attendance.breaks,
                totalBreakTime: attendance.totalBreakTime,
                currentWorkingHours: `${hours}h ${minutes}m`
            }
        });
    } catch (error) {
        console.error('Break End Error:', error);
        res.status(500).json({ error: 'Failed to end break. Please try again.' });
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

        // Use UTC to avoid timezone issues
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        const attendance = await Attendance.findOne({
            staffId: staff._id,
            date: { $gte: today, $lt: tomorrow },
            status: 'active'
        });

        if (attendance) {
            // Calculate hours worked so far (excluding breaks)
            const now = new Date();
            const totalDiff = now - attendance.punchIn;
            const totalMinutes = Math.round(totalDiff / (1000 * 60));
            
            // Calculate total break time
            let totalBreakMinutes = 0;
            if (attendance.breaks && attendance.breaks.length > 0) {
                attendance.breaks.forEach(breakPeriod => {
                    if (breakPeriod.breakEnd && breakPeriod.breakStart) {
                        totalBreakMinutes += breakPeriod.breakDuration || 0;
                    } else if (breakPeriod.breakStart && !breakPeriod.breakEnd) {
                        // Active break - calculate current break time
                        const breakDiff = now - breakPeriod.breakStart;
                        totalBreakMinutes += Math.round(breakDiff / (1000 * 60));
                    }
                });
            }
            
            const minutesWorked = Math.max(0, totalMinutes - totalBreakMinutes);
            const hours = Math.floor(minutesWorked / 60);
            const mins = minutesWorked % 60;

            return res.json({
                success: true,
                attendance: {
                    _id: attendance._id,
                    punchIn: attendance.punchIn,
                    status: attendance.status,
                    onBreak: attendance.onBreak || false,
                    breaks: attendance.breaks || [],
                    totalBreakTime: totalBreakMinutes,
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
            // Parse dates and set to UTC midnight for start, and end of day for end date
            // This ensures we capture all records for the date range regardless of timezone
            const start = new Date(startDate + 'T00:00:00.000Z');
            const end = new Date(endDate + 'T23:59:59.999Z');
            query.date = {
                $gte: start,
                $lte: end
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
            // Parse dates and set to UTC midnight for start, and end of day for end date
            // This ensures we capture all records for the date range regardless of timezone
            const start = new Date(startDate + 'T00:00:00.000Z');
            const end = new Date(endDate + 'T23:59:59.999Z');
            query.date = {
                $gte: start,
                $lte: end
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
            // Parse dates and set to UTC midnight for start, and end of day for end date
            // This ensures we capture all records for the date range regardless of timezone
            const start = new Date(startDate + 'T00:00:00.000Z');
            const end = new Date(endDate + 'T23:59:59.999Z');
            query.date = {
                $gte: start,
                $lte: end
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

/**
 * @route GET /api/attendance/active-status
 * @desc Get active attendance status for all staff in the store (who is currently punched in)
 * @access Private (Owner/Manager)
 */
router.get('/active-status', protect, async (req, res) => {
    try {
        if (req.user.role !== 'owner' && req.user.role !== 'Manager') {
            return res.status(403).json({ error: 'Access denied. Only owners and managers can view active attendance status.' });
        }

        if (!req.user.storeId) {
            return res.status(400).json({ error: 'No active outlet selected.' });
        }

        // Get today's date range - Use UTC to avoid timezone issues
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        // Find all active attendance records for today
        const activeAttendance = await Attendance.find({
            storeId: req.user.storeId,
            date: { 
                $gte: today, 
                $lt: tomorrow 
            },
            status: 'active'
        })
        .select('staffId punchIn')
        .populate('staffId', 'name email')
        .lean();

        // Return array of staff IDs who are currently active and their punch in times
        const activeStaffMap = {};
        activeAttendance.forEach(record => {
            const staffId = record.staffId?._id?.toString();
            if (staffId) {
                activeStaffMap[staffId] = {
                    punchIn: record.punchIn,
                    staffName: record.staffId?.name
                };
            }
        });

        res.json({
            success: true,
            activeStaffIds: Object.keys(activeStaffMap),
            activeAttendance: Object.entries(activeStaffMap).map(([staffId, data]) => ({
                staffId,
                staffName: data.staffName,
                punchIn: data.punchIn
            })),
            activeStaffMap // Include map for easy lookup
        });
    } catch (error) {
        console.error('Get Active Status Error:', error);
        res.status(500).json({ error: 'Failed to fetch active attendance status.' });
    }
});

module.exports = router;


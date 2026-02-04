const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttendanceSchema = new Schema({
    // Staff member who is punching in/out
    staffId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Staff',
        index: true
    },
    // Store/Outlet where the staff is working
    storeId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Store',
        index: true
    },
    // Date of attendance (YYYY-MM-DD format for easy querying)
    date: {
        type: Date,
        required: true,
        index: true
    },
    // Punch in time
    punchIn: {
        type: Date,
        required: true
    },
    // Punch out time (null if still working)
    punchOut: {
        type: Date,
        default: null
    },
    // Total working hours (calculated in minutes, then converted)
    workingHours: {
        type: Number, // in minutes
        default: 0
    },
    // Status: 'active' (punched in), 'completed' (punched out)
    status: {
        type: String,
        enum: ['active', 'completed'],
        default: 'active'
    },
    // Optional: Location coordinates if needed (for future GPS tracking)
    location: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null }
    },
    // Notes or remarks
    notes: {
        type: String,
        default: ''
    },
    // Break tracking: array of break periods
    breaks: [{
        breakStart: {
            type: Date,
            required: true
        },
        breakEnd: {
            type: Date,
            default: null
        },
        breakDuration: {
            type: Number, // in minutes
            default: 0
        },
        notes: {
            type: String,
            default: ''
        }
    }],
    // Total break time in minutes (sum of all completed breaks)
    totalBreakTime: {
        type: Number, // in minutes
        default: 0
    },
    // Current break status
    onBreak: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Compound index for efficient queries: staff + date
AttendanceSchema.index({ staffId: 1, date: -1 });
// Compound index for store queries
AttendanceSchema.index({ storeId: 1, date: -1 });
// Index for active attendance (finding who's currently punched in)
AttendanceSchema.index({ staffId: 1, status: 1 });

// Virtual to calculate working hours
AttendanceSchema.virtual('hoursWorked').get(function() {
    if (!this.punchOut) return 0;
    const diff = this.punchOut - this.punchIn;
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
});

// Pre-save hook to calculate working hours when punching out (excluding break time)
AttendanceSchema.pre('save', function(next) {
    if (this.punchOut && this.punchIn) {
        // Calculate total break time
        let totalBreakMinutes = 0;
        if (this.breaks && this.breaks.length > 0) {
            this.breaks.forEach(breakPeriod => {
                if (breakPeriod.breakEnd && breakPeriod.breakStart) {
                    const breakDiff = breakPeriod.breakEnd - breakPeriod.breakStart;
                    breakPeriod.breakDuration = Math.round(breakDiff / (1000 * 60));
                    totalBreakMinutes += breakPeriod.breakDuration;
                }
            });
        }
        this.totalBreakTime = totalBreakMinutes;
        
        // Calculate working hours excluding break time
        const totalDiff = this.punchOut - this.punchIn;
        const totalMinutes = Math.round(totalDiff / (1000 * 60));
        this.workingHours = Math.max(0, totalMinutes - totalBreakMinutes); // Ensure non-negative
    }
    next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);


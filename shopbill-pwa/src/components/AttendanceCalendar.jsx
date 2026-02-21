import React, { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

const AttendanceCalendar = ({ apiClient, API, showToast, darkMode, staffId, staffName }) => {
    const [attendance, setAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        if (staffId) {
            fetchAttendance();
        }
    }, [staffId, currentDate]);

    const fetchAttendance = async () => {
        if (!staffId || !apiClient || !API) return;
        try {
            setIsLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            // Use UTC dates to match server-side date storage (avoid timezone conversion issues)
            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month + 1, 0).getDate();
            const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const response = await apiClient.get(
                `${API.attendanceStaff(staffId)}?startDate=${startDate}&endDate=${endDate}`
            );
            if (response.data?.success) {
                // Handle both response.data.records and response.data.data.records
                const records = response.data.records || response.data.data?.records || [];
                // Debug: Log first record to check structure
                if (records.length > 0) {
                    console.log('Sample attendance record:', {
                        date: records[0].date,
                        punchIn: records[0].punchIn,
                        punchOut: records[0].punchOut,
                        status: records[0].status,
                        workingHours: records[0].workingHours
                    });
                }
                setAttendance(records);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
            if (showToast) showToast('Failed to fetch attendance records', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }
        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }
        return days;
    };

    // Returns all attendance records for a given day (multiple punch-in/out sessions)
    const getAttendanceRecordsForDate = (day) => {
        if (day === null) return [];
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return attendance.filter(record => {
            if (!record.date) return false;
            const recordDate = new Date(record.date);
            const recordDateStr = `${recordDate.getUTCFullYear()}-${String(recordDate.getUTCMonth() + 1).padStart(2, '0')}-${String(recordDate.getUTCDate()).padStart(2, '0')}`;
            return recordDateStr === dateStr;
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            console.error('Error formatting time:', e, dateString);
            return '';
        }
    };

    const formatBreakTime = (minutes) => {
        if (minutes == null || minutes < 0) return '0m';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m ? `${h}h ${m}m` : `${h}h`;
    };

    // Status based on all sessions for the day (total hours)
    const getDateStatus = (day) => {
        const records = getAttendanceRecordsForDate(day);
        if (records.length === 0) return null;
        const hasActive = records.some(r => r.status === 'active');
        if (hasActive) return { type: 'active', color: 'emerald' };
        const totalMinutes = records
            .filter(r => r.status === 'completed' && (r.workingHours || 0) >= 0)
            .reduce((sum, r) => sum + (r.workingHours || 0), 0);
        const hours = Math.floor(totalMinutes / 60);
        if (hours >= 8) return { type: 'full', color: 'indigo' };
        if (hours >= 4) return { type: 'partial', color: 'amber' };
        return { type: 'short', color: 'rose' };
    };

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const days = getDaysInMonth(currentDate);
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600';
    const buttonBase = darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200';

    return (
        <div className={`rounded-xl border p-4 ${cardBase} transition-colors`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <CalendarIcon className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <h4 className={`text-sm font-black ${textPrimary}`}>{staffName}</h4>
                </div>
            </div>

            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
                <button
                    onClick={() => navigateMonth(-1)}
                    className={`p-2 rounded-lg transition-all ${buttonBase} ${textPrimary} hover:scale-105 active:scale-95`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className={`text-base font-black ${textPrimary}`}>
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button
                    onClick={() => navigateMonth(1)}
                    className={`p-2 rounded-lg transition-all ${buttonBase} ${textPrimary} hover:scale-105 active:scale-95`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                    <div key={day} className={`text-center text-[10px] font-black uppercase tracking-widest py-2 ${textSecondary}`}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, index) => {
                            const recordsForDay = getAttendanceRecordsForDate(day);
                            const status = getDateStatus(day);
                            const isToday = day !== null && 
                                new Date().getDate() === day && 
                                new Date().getMonth() === currentDate.getMonth() && 
                                new Date().getFullYear() === currentDate.getFullYear();
                            const isSelected = selectedDate === day;

                            if (day === null) {
                                return <div key={`empty-${index}`} className="aspect-square" />;
                            }

                            let dayClasses = `aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 `;
                            
                            if (status) {
                                if (status.color === 'emerald') {
                                    dayClasses += darkMode 
                                        ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' 
                                        : 'bg-emerald-100 border-2 border-emerald-500 text-emerald-700';
                                } else if (status.color === 'indigo') {
                                    dayClasses += darkMode 
                                        ? 'bg-indigo-500/20 border-2 border-indigo-500 text-indigo-400' 
                                        : 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700';
                                } else if (status.color === 'amber') {
                                    dayClasses += darkMode 
                                        ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-400' 
                                        : 'bg-amber-100 border-2 border-amber-500 text-amber-700';
                                } else if (status.color === 'rose') {
                                    dayClasses += darkMode 
                                        ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-400' 
                                        : 'bg-rose-100 border-2 border-rose-500 text-rose-700';
                                }
                            } else {
                                dayClasses += darkMode 
                                    ? 'bg-slate-800/50 text-slate-400 hover:bg-slate-800' 
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100';
                            }

                            if (isToday) {
                                dayClasses += ' ring-2 ring-indigo-500 ring-offset-2';
                            }

                            if (isSelected) {
                                dayClasses += darkMode ? ' ring-2 ring-indigo-400' : ' ring-2 ring-indigo-600';
                            }

                            return (
                                <div
                                    key={day}
                                    onClick={() => setSelectedDate(day === selectedDate ? null : day)}
                                    className={dayClasses}
                                    title={recordsForDay.length > 0 ? recordsForDay.map(r => `${formatTime(r.punchIn)} - ${(r.punchOut && r.status === 'completed') ? formatTime(r.punchOut) : 'In Progress'}`).join(', ') : 'No attendance'}
                                >
                                    <span>{day}</span>
                                    {status && (
                                        <span className={`text-[8px] mt-0.5 ${status.type === 'active' ? 'animate-pulse' : ''}`}>
                                            {status.type === 'active' ? '●' : status.type === 'full' ? '✓' : status.type === 'partial' ? '~' : '!'}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t border-inherit">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border-2 ${darkMode ? 'bg-emerald-500/20 border-emerald-500' : 'bg-emerald-100 border-emerald-500'}`} />
                                <span className={textSecondary}>Active</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border-2 ${darkMode ? 'bg-indigo-500/20 border-indigo-500' : 'bg-indigo-100 border-indigo-500'}`} />
                                <span className={textSecondary}>Full Day (8h+)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border-2 ${darkMode ? 'bg-amber-500/20 border-amber-500' : 'bg-amber-100 border-amber-500'}`} />
                                <span className={textSecondary}>Partial (4-8h)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded border-2 ${darkMode ? 'bg-rose-500/20 border-rose-500' : 'bg-rose-100 border-rose-500'}`} />
                                <span className={textSecondary}>Short (&lt;4h)</span>
                            </div>
                        </div>
                    </div>

                    {/* Selected Date Details - all sessions for the day + total */}
                    {selectedDate && getAttendanceRecordsForDate(selectedDate).length > 0 && (
                        <div className={`mt-4 p-3 rounded-lg ${darkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-xs font-black ${textPrimary}`}>
                                    {selectedDate} {monthNames[currentDate.getMonth()]}
                                </span>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className={`text-xs ${textSecondary} hover:${textPrimary}`}
                                >
                                    ×
                                </button>
                            </div>
                            {(() => {
                                const records = getAttendanceRecordsForDate(selectedDate);
                                const totalMinutes = records
                                    .filter(r => r.status === 'completed' && (r.workingHours || 0) >= 0)
                                    .reduce((sum, r) => sum + (r.workingHours || 0), 0);
                                const totalBreakMinutes = records
                                    .filter(r => (r.totalBreakTime || 0) > 0)
                                    .reduce((sum, r) => sum + (r.totalBreakTime || 0), 0);
                                const totalHours = Math.floor(totalMinutes / 60);
                                const totalMins = totalMinutes % 60;
                                return (
                                    <div className="space-y-2">
                                        {records.map((record, idx) => {
                                            const hasPunchOut = record.punchOut && record.status === 'completed' && new Date(record.punchOut).getTime() > 0;
                                            const punchOutTime = hasPunchOut ? formatTime(record.punchOut) : 'In Progress';
                                            const hours = Math.floor((record.workingHours || 0) / 60);
                                            const minutes = (record.workingHours || 0) % 60;
                                            const breakMins = record.totalBreakTime || 0;
                                            const breaksList = record.breaks || [];
                                            return (
                                                <div key={record._id || idx} className="space-y-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Clock className={`w-3 h-3 shrink-0 ${textSecondary}`} />
                                                            <span className={`text-[10px] ${textSecondary}`}>
                                                                In: {formatTime(record.punchIn)} → Out: {punchOutTime}
                                                            </span>
                                                        </div>
                                                        {record.status === 'completed' && hasPunchOut && (
                                                            <span className={`text-[10px] font-bold shrink-0 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} title="Net of breaks">
                                                                {hours}h {minutes}m
                                                            </span>
                                                        )}
                                                    </div>
                                                    {breakMins > 0 && (
                                                        <div className={`pl-5 text-[10px] ${darkMode ? 'text-amber-400/90' : 'text-amber-600'}`}>
                                                            {breaksList.length > 0 ? (
                                                                <>
                                                                    Break: {breaksList.filter(b => b.breakStart).map((b, i) => {
                                                                        const dur = b.breakDuration ?? (b.breakEnd && b.breakStart ? Math.round((new Date(b.breakEnd) - new Date(b.breakStart)) / 60000) : 0);
                                                                        const range = b.breakEnd ? `${formatTime(b.breakStart)}–${formatTime(b.breakEnd)}` : `${formatTime(b.breakStart)} (ongoing)`;
                                                                        return `${range} (${formatBreakTime(dur)})`;
                                                                    }).join(', ')}
                                                                </>
                                                            ) : (
                                                                <>Break: {formatBreakTime(breakMins)}</>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {records.some(r => r.status === 'completed') && (
                                            <div className={`pt-1 border-t border-inherit space-y-0.5`}>
                                                <div className={`text-[10px] font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                    Total worked: {totalHours}h {totalMins}m
                                                </div>
                                                {totalBreakMinutes > 0 && (
                                                    <div className={`text-[10px] ${darkMode ? 'text-amber-400/90' : 'text-amber-600'}`}>
                                                        Total break: {formatBreakTime(totalBreakMinutes)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AttendanceCalendar;


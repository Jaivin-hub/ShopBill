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
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

            const response = await apiClient.get(
                `${API.attendanceStaff(staffId)}?startDate=${startDate}&endDate=${endDate}`
            );
            if (response.data?.success) {
                setAttendance(response.data.records || []);
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

    const getAttendanceForDate = (day) => {
        if (day === null) return null;
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        
        return attendance.find(record => {
            const recordDate = new Date(record.date).toISOString().split('T')[0];
            return recordDate === dateStr;
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const getDateStatus = (attendanceRecord) => {
        if (!attendanceRecord) return null;
        if (attendanceRecord.status === 'active') {
            return { type: 'active', color: 'emerald' };
        }
        if (attendanceRecord.status === 'completed') {
            const hours = Math.floor(attendanceRecord.workingHours / 60);
            if (hours >= 8) return { type: 'full', color: 'indigo' };
            if (hours >= 4) return { type: 'partial', color: 'amber' };
            return { type: 'short', color: 'rose' };
        }
        return null;
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
                            const attendanceRecord = getAttendanceForDate(day);
                            const status = getDateStatus(attendanceRecord);
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
                                    title={attendanceRecord ? `${formatTime(attendanceRecord.punchIn)} - ${attendanceRecord.punchOut ? formatTime(attendanceRecord.punchOut) : 'In Progress'}` : 'No attendance'}
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

                    {/* Selected Date Details */}
                    {selectedDate && getAttendanceForDate(selectedDate) && (
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
                                const record = getAttendanceForDate(selectedDate);
                                const hours = Math.floor(record.workingHours / 60);
                                const minutes = record.workingHours % 60;
                                return (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Clock className={`w-3 h-3 ${textSecondary}`} />
                                            <span className={`text-[10px] ${textSecondary}`}>
                                                In: {formatTime(record.punchIn)} | Out: {record.punchOut ? formatTime(record.punchOut) : 'In Progress'}
                                            </span>
                                        </div>
                                        {record.status === 'completed' && (
                                            <div className={`text-[10px] font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                Worked: {hours}h {minutes}m
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


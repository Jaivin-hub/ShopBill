import React, { useState, useEffect, useCallback } from 'react';
import { Clock, LogIn, LogOut, Calendar, TrendingUp, Loader2, Coffee, RotateCcw, Timer } from 'lucide-react';

const AttendancePunch = ({ apiClient, API, showToast, darkMode, currentUser }) => {
    const [currentAttendance, setCurrentAttendance] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPunchingIn, setIsPunchingIn] = useState(false);
    const [isPunchingOut, setIsPunchingOut] = useState(false);
    const [isStartingBreak, setIsStartingBreak] = useState(false);
    const [isEndingBreak, setIsEndingBreak] = useState(false);
    const [myRecords, setMyRecords] = useState([]);
    const [showRecords, setShowRecords] = useState(false);

    const isStaff = currentUser?.role?.toLowerCase() === 'manager' || currentUser?.role?.toLowerCase() === 'cashier';

    const fetchCurrentStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get(API.attendanceCurrent);
            if (response.data?.success) {
                setCurrentAttendance(response.data.attendance);
            } else {
                setCurrentAttendance(null);
            }
        } catch (error) {
            console.error('Error fetching attendance status:', error);
            setCurrentAttendance(null);
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API]);

    const fetchMyRecords = useCallback(async () => {
        try {
            const response = await apiClient.get(`${API.attendanceMyRecords}?limit=10`);
            if (response.data?.success) {
                setMyRecords(response.data.records || []);
            }
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    }, [apiClient, API]);

    useEffect(() => {
        if (isStaff && apiClient && API) {
            fetchCurrentStatus();
            fetchMyRecords();
        }
    }, [isStaff, fetchCurrentStatus, fetchMyRecords, apiClient, API]);

    const handlePunchIn = async () => {
        try {
            setIsPunchingIn(true);
            const response = await apiClient.post(API.attendancePunchIn);
            if (response.data?.success) {
                await fetchCurrentStatus();
                showToast('Punched in successfully!', 'success');
                await fetchMyRecords();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to punch in', 'error');
            await fetchCurrentStatus();
        } finally {
            setIsPunchingIn(false);
        }
    };

    const handlePunchOut = async () => {
        try {
            setIsPunchingOut(true);
            const response = await apiClient.post(API.attendancePunchOut);
            if (response.data?.success) {
                setCurrentAttendance(null);
                showToast(`Punched out successfully! Worked: ${response.data.attendance.hoursWorked}`, 'success');
                await fetchMyRecords();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to punch out', 'error');
            await fetchCurrentStatus();
        } finally {
            setIsPunchingOut(false);
        }
    };

    const handleBreakStart = async () => {
        try {
            setIsStartingBreak(true);
            const response = await apiClient.post(API.attendanceBreakStart);
            if (response.data?.success) {
                await fetchCurrentStatus();
                showToast('Break started successfully!', 'success');
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to start break', 'error');
            await fetchCurrentStatus();
        } finally {
            setIsStartingBreak(false);
        }
    };

    const handleBreakEnd = async () => {
        try {
            setIsEndingBreak(true);
            const response = await apiClient.post(API.attendanceBreakEnd);
            if (response.data?.success) {
                await fetchCurrentStatus();
                const hoursWorked = response.data.attendance?.currentWorkingHours || '0h 0m';
                showToast(`Break ended. ${hoursWorked} worked so far`, 'success');
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to end break', 'error');
            await fetchCurrentStatus();
        } finally {
            setIsEndingBreak(false);
        }
    };

    const formatBreakTime = (minutes) => {
        if (!minutes) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (!isStaff) {
        return null; // Only show for staff members
    }

    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600';
    const buttonBase = darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200';

    return (
        <div className={`rounded-2xl border p-4 sm:p-6 ${cardBase} transition-colors`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                        <Clock className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>
                    <div>
                        <h3 className={`text-lg font-black tracking-tight ${textPrimary}`}>Attendance</h3>
                        <p className={`text-[10px] font-black tracking-widest uppercase ${textSecondary}`}>Punch In/Out</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowRecords(!showRecords)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${buttonBase} ${textPrimary}`}
                >
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Records
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
            ) : (
                <>
                    {currentAttendance ? (
                        <div className="space-y-4">
                            {/* Status Card */}
                            <div className={`p-4 rounded-xl border ${currentAttendance.onBreak 
                                ? (darkMode ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200')
                                : (darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200')
                            }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${currentAttendance.onBreak 
                                            ? (darkMode ? 'bg-amber-400' : 'bg-amber-500')
                                            : (darkMode ? 'bg-emerald-400' : 'bg-emerald-500')
                                        } animate-pulse`} />
                                        <span className={`text-xs font-black tracking-widest uppercase ${currentAttendance.onBreak 
                                            ? (darkMode ? 'text-amber-400' : 'text-amber-600')
                                            : (darkMode ? 'text-emerald-400' : 'text-emerald-600')
                                        }`}>
                                            {currentAttendance.onBreak ? 'On Break' : 'Active'}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-bold ${textSecondary}`}>{currentAttendance.hoursWorked || '0h 0m'}</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <LogIn className={`w-4 h-4 ${textSecondary}`} />
                                        <span className={`text-sm font-bold ${textPrimary}`}>Punched In: {formatTime(currentAttendance.punchIn)}</span>
                                    </div>
                                    {currentAttendance.totalBreakTime > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Timer className={`w-4 h-4 ${textSecondary}`} />
                                            <span className={`text-xs font-bold ${textSecondary}`}>
                                                Total Break: {formatBreakTime(currentAttendance.totalBreakTime)}
                                            </span>
                                        </div>
                                    )}
                                    {currentAttendance.onBreak && currentAttendance.breaks && currentAttendance.breaks.length > 0 && (() => {
                                        const activeBreak = currentAttendance.breaks.find(b => !b.breakEnd);
                                        return activeBreak ? (
                                            <div className="flex items-center gap-2">
                                                <Coffee className={`w-4 h-4 ${textSecondary}`} />
                                                <span className={`text-xs font-bold ${textSecondary}`}>
                                                    Current break started: {formatTime(activeBreak.breakStart)}
                                                </span>
                                            </div>
                                        ) : null;
                                    })()}
                                    <p className={`text-[10px] ${textSecondary}`}>{formatDate(currentAttendance.punchIn)}</p>
                                </div>
                            </div>

                            {/* Break History Section */}
                            {currentAttendance.breaks && currentAttendance.breaks.length > 0 && (
                                <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Coffee className={`w-4 h-4 ${textSecondary}`} />
                                        <h4 className={`text-xs font-black tracking-widest uppercase ${textPrimary}`}>Today's Breaks</h4>
                                    </div>
                                    <div className="space-y-2">
                                        {currentAttendance.breaks.map((breakItem, index) => {
                                            const isActive = !breakItem.breakEnd;
                                            const duration = breakItem.breakDuration || (isActive ? Math.round((new Date() - new Date(breakItem.breakStart)) / (1000 * 60)) : 0);
                                            return (
                                                <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-white'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isActive ? (darkMode ? 'bg-amber-400' : 'bg-amber-500') : (darkMode ? 'bg-slate-500' : 'bg-slate-400')} ${isActive ? 'animate-pulse' : ''}`} />
                                                        <span className={`text-[10px] font-bold ${textSecondary}`}>
                                                            {formatTime(breakItem.breakStart)} - {isActive ? 'Ongoing' : formatTime(breakItem.breakEnd)}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                        {formatBreakTime(duration)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className={`grid gap-3 ${currentAttendance.onBreak ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {currentAttendance.onBreak ? (
                                    <button
                                        onClick={handleBreakEnd}
                                        disabled={isEndingBreak}
                                        className={`w-full py-3.5 rounded-xl font-black tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                                            darkMode 
                                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                        }`}
                                    >
                                        {isEndingBreak ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <RotateCcw className="w-4 h-4" />
                                                End Break
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleBreakStart}
                                            disabled={isStartingBreak || isPunchingOut}
                                            className={`py-3.5 rounded-xl font-black tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                                                darkMode 
                                                    ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                                            }`}
                                        >
                                            {isStartingBreak ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Coffee className="w-4 h-4" />
                                                    Start Break
                                                </>
                                            )}
                                        </button>
                                        
                                        <button
                                            onClick={handlePunchOut}
                                            disabled={isPunchingOut || isStartingBreak}
                                            className={`py-3.5 rounded-xl font-black tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg ${
                                                darkMode 
                                                    ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                                                    : 'bg-rose-500 hover:bg-rose-600 text-white'
                                            }`}
                                        >
                                            {isPunchingOut ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <LogOut className="w-4 h-4" />
                                                    Punch Out
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl border text-center ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <p className={`text-sm font-bold ${textSecondary} mb-1`}>Not Punched In</p>
                                <p className={`text-[10px] ${textSecondary}`}>Click below to start your work day</p>
                            </div>
                            <button
                                onClick={handlePunchIn}
                                disabled={isPunchingIn}
                                className={`w-full py-4 rounded-xl font-black tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                    darkMode 
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                            >
                                {isPunchingIn ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5" />
                                        Punch In
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {showRecords && (
                        <div className="mt-6 pt-6 border-t border-inherit">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className={`text-sm font-black ${textPrimary}`}>Recent Records</h4>
                                <TrendingUp className={`w-4 h-4 ${textSecondary}`} />
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {myRecords.length > 0 ? (
                                    myRecords.map((record, index) => {
                                        const totalBreakTime = record.totalBreakTime || 0;
                                        return (
                                            <div
                                                key={index}
                                                className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <p className={`text-xs font-bold ${textPrimary}`}>{formatDate(record.date)}</p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className={`text-[10px] ${textSecondary}`}>
                                                                {formatTime(record.punchIn)} - {record.punchOut ? formatTime(record.punchOut) : 'In Progress'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                            {record.hoursWorked}
                                                        </span>
                                                        {totalBreakTime > 0 && (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <Coffee className={`w-3 h-3 ${textSecondary}`} />
                                                                <span className={`text-[10px] ${textSecondary}`}>
                                                                    {formatBreakTime(totalBreakTime)}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {record.breaks && record.breaks.length > 0 && (
                                                    <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <Coffee className={`w-3 h-3 ${textSecondary}`} />
                                                            <span className={`text-[10px] font-bold ${textSecondary}`}>
                                                                {record.breaks.length} Break{record.breaks.length > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                        <div className="space-y-1">
                                                            {record.breaks.slice(0, 3).map((breakItem, breakIndex) => {
                                                                const duration = breakItem.breakDuration || 0;
                                                                return (
                                                                    <div key={breakIndex} className={`text-[9px] ${textSecondary} flex items-center justify-between`}>
                                                                        <span>
                                                                            {formatTime(breakItem.breakStart)} - {breakItem.breakEnd ? formatTime(breakItem.breakEnd) : 'Ongoing'}
                                                                        </span>
                                                                        <span className="font-bold">{formatBreakTime(duration)}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                            {record.breaks.length > 3 && (
                                                                <span className={`text-[9px] ${textSecondary}`}>
                                                                    +{record.breaks.length - 3} more break{record.breaks.length - 3 > 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className={`text-sm text-center py-4 ${textSecondary}`}>No records found</p>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AttendancePunch;


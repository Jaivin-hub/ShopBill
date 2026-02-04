import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Calendar, TrendingUp, Loader2 } from 'lucide-react';

const AttendancePunch = ({ apiClient, API, showToast, darkMode, currentUser }) => {
    const [currentAttendance, setCurrentAttendance] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPunching, setIsPunching] = useState(false);
    const [myRecords, setMyRecords] = useState([]);
    const [showRecords, setShowRecords] = useState(false);

    const isStaff = currentUser?.role?.toLowerCase() === 'manager' || currentUser?.role?.toLowerCase() === 'cashier';

    useEffect(() => {
        if (isStaff) {
            fetchCurrentStatus();
            fetchMyRecords();
        }
    }, [isStaff]);

    const fetchCurrentStatus = async () => {
        try {
            setIsLoading(true);
            const response = await apiClient.get(API.attendanceCurrent);
            if (response.data?.success) {
                setCurrentAttendance(response.data.attendance);
            }
        } catch (error) {
            console.error('Error fetching attendance status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchMyRecords = async () => {
        try {
            const response = await apiClient.get(`${API.attendanceMyRecords}?limit=10`);
            if (response.data?.success) {
                setMyRecords(response.data.records || []);
            }
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    };

    const handlePunchIn = async () => {
        try {
            setIsPunching(true);
            const response = await apiClient.post(API.attendancePunchIn);
            if (response.data?.success) {
                setCurrentAttendance(response.data.attendance);
                showToast('Punched in successfully!', 'success');
                fetchMyRecords();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to punch in', 'error');
        } finally {
            setIsPunching(false);
        }
    };

    const handlePunchOut = async () => {
        try {
            setIsPunching(true);
            const response = await apiClient.post(API.attendancePunchOut);
            if (response.data?.success) {
                setCurrentAttendance(null);
                showToast(`Punched out successfully! Worked: ${response.data.attendance.hoursWorked}`, 'success');
                fetchMyRecords();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Failed to punch out', 'error');
        } finally {
            setIsPunching(false);
        }
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
                            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-emerald-400' : 'bg-emerald-500'} animate-pulse`} />
                                        <span className={`text-xs font-black tracking-widest uppercase ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Active</span>
                                    </div>
                                    <span className={`text-xs font-bold ${textSecondary}`}>{currentAttendance.hoursWorked}</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <LogIn className={`w-4 h-4 ${textSecondary}`} />
                                        <span className={`text-sm font-bold ${textPrimary}`}>Punched In: {formatTime(currentAttendance.punchIn)}</span>
                                    </div>
                                    <p className={`text-[10px] ${textSecondary}`}>{formatDate(currentAttendance.punchIn)}</p>
                                </div>
                            </div>
                            <button
                                onClick={handlePunchOut}
                                disabled={isPunching}
                                className={`w-full py-4 rounded-xl font-black tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                    darkMode 
                                        ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                                        : 'bg-rose-500 hover:bg-rose-600 text-white'
                                }`}
                            >
                                {isPunching ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <LogOut className="w-5 h-5" />
                                        Punch Out
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl border text-center ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                <p className={`text-sm font-bold ${textSecondary} mb-1`}>Not Punched In</p>
                                <p className={`text-[10px] ${textSecondary}`}>Click below to start your work day</p>
                            </div>
                            <button
                                onClick={handlePunchIn}
                                disabled={isPunching}
                                className={`w-full py-4 rounded-xl font-black tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                                    darkMode 
                                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                            >
                                {isPunching ? (
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
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {myRecords.length > 0 ? (
                                    myRecords.map((record, index) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className={`text-xs font-bold ${textPrimary}`}>{formatDate(record.date)}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`text-[10px] ${textSecondary}`}>
                                                            {formatTime(record.punchIn)} - {record.punchOut ? formatTime(record.punchOut) : 'In Progress'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                    {record.hoursWorked}
                                                </span>
                                            </div>
                                        </div>
                                    ))
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


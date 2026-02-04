import React, { useState, useEffect } from 'react';
import { Clock, Loader2, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const StaffAttendanceView = ({ apiClient, API, showToast, darkMode, staffId, staffName }) => {
    const [attendance, setAttendance] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30); // Last 30 days
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [isExpanded, setIsExpanded] = useState(false);

    const fetchAttendance = React.useCallback(async () => {
        if (!staffId || !apiClient || !API) return;
        try {
            setIsLoading(true);
            const response = await apiClient.get(
                `${API.attendanceStaff(staffId)}?startDate=${startDate}&endDate=${endDate}`
            );
            if (response.data?.success) {
                setAttendance(response.data.records || []);
                setSummary(response.data.summary || null);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error);
            if (showToast) showToast('Failed to fetch attendance records', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [staffId, startDate, endDate, apiClient, API, showToast]);

    useEffect(() => {
        if (staffId) {
            fetchAttendance();
        }
    }, [staffId, fetchAttendance]);

    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const textPrimary = darkMode ? 'text-slate-100' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-slate-400' : 'text-slate-600';
    const buttonBase = darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200';

    return (
        <div className={`rounded-xl border p-4 ${cardBase} transition-colors`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <h4 className={`text-sm font-black ${textPrimary}`}>{staffName}</h4>
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`p-1.5 rounded-lg transition-all ${buttonBase} ${textPrimary}`}
                >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {summary && (
                <div className={`grid grid-cols-3 gap-2 mb-4 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'} p-3 rounded-lg`}>
                    <div className="text-center">
                        <p className={`text-xs font-black ${textSecondary} mb-1`}>Days</p>
                        <p className={`text-lg font-black ${textPrimary}`}>{summary.totalDays}</p>
                    </div>
                    <div className="text-center">
                        <p className={`text-xs font-black ${textSecondary} mb-1`}>Total Hours</p>
                        <p className={`text-lg font-black ${textPrimary}`}>{summary.totalHours}</p>
                    </div>
                    <div className="text-center">
                        <p className={`text-xs font-black ${textSecondary} mb-1`}>Avg/Day</p>
                        <p className={`text-lg font-black ${textPrimary}`}>{summary.averageHoursPerDay}h</p>
                    </div>
                </div>
            )}

            {isExpanded && (
                <div className="space-y-3">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className={`text-[10px] font-black tracking-widest uppercase mb-1 block ${textSecondary}`}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border text-sm font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                            />
                        </div>
                        <div className="flex-1">
                            <label className={`text-[10px] font-black tracking-widest uppercase mb-1 block ${textSecondary}`}>
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg border text-sm font-bold ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                            />
                        </div>
                        <button
                            onClick={fetchAttendance}
                            className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white font-black text-xs transition-all`}
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {attendance.length > 0 ? (
                                attendance.map((record, index) => (
                                    <div
                                        key={index}
                                        className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
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
                                                {record.status === 'active' && (
                                                    <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-emerald-400' : 'bg-emerald-500'} animate-pulse mt-1 ml-auto`} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className={`text-sm text-center py-4 ${textSecondary}`}>No attendance records found</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StaffAttendanceView;


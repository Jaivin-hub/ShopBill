import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
    Plus, Trash2, Users, UserPlus, X, 
    Loader2, ShieldCheck, Mail, User, Crown, 
    ChevronRight, ChevronDown, Power, Info, ShieldAlert, Edit3, AlertCircle, CheckCircle2, XCircle, Paperclip, Eye, Download,
    Settings2,
} from 'lucide-react';
import API from '../config/api';
import AttendanceCalendar from './AttendanceCalendar';
import ConfirmationModal from './ConfirmationModal';
import WorkProfileModal from './WorkProfileModal';
import { TeamDirectorySkeleton, TeamManagementInitialSkeleton } from './skeletons/PageSkeletons';
import { participantLabelForViewer, participantEmailForViewer, participantRoleLabelForViewer, isStaffViewer, isParticipantOwner } from '../utils/ownerDisplay';

// --- Feature Access Definitions for Display ---
const ROLE_PERMISSIONS = {
    owner: [
        'Full Dashboard Access',
        'Billing & POS',
        'Inventory Management',
        'Ledger (Khata)',
        'Supply Chain Management',
        'Reports & Analytics',
        'Team Management',
        'Store Network (Outlets)'
    ],
    Manager: [
        'Dashboard Access',
        'Billing & POS',
        'Inventory Management',
        'Ledger (Khata)',
        'Supply Chain Management'
    ],
    Cashier: [
        'Dashboard Access',
        'Billing & POS',
        'Ledger (Khata)'
    ],
};

const PAGE_ACCESS_LABELS = {
    dashboard: 'Dashboard',
    billing: 'Billing',
    khata: 'Ledger',
    salesActivity: 'Sales History',
    inventory: 'Stock',
    scm: 'Supply Chain',
    staffPermissions: 'Team Management',
    offers: 'Offers',
};

/** Owner-configurable pages in Grant Permissions (matches server grantable keys). */
const ALL_GRANTABLE_ROLE_PAGE_KEYS = [
    'dashboard',
    'billing',
    'khata',
    'salesActivity',
    'inventory',
    'scm',
    'staffPermissions',
    'offers',
];

/** Rows in Grant Permissions — `roles` lists which columns show a checkbox. */
const GRANTABLE_PERMISSION_PAGE_LABELS = [
    { id: 'dashboard', label: 'Dashboard', roles: ['manager', 'cashier'] },
    { id: 'billing', label: 'Billing', roles: ['manager', 'cashier'] },
    { id: 'khata', label: 'Ledger', roles: ['manager', 'cashier'] },
    { id: 'salesActivity', label: 'Sales History', roles: ['manager', 'cashier'] },
    { id: 'inventory', label: 'Stock', roles: ['manager', 'cashier'] },
    { id: 'scm', label: 'Supply Chain', roles: ['manager', 'cashier'] },
    { id: 'staffPermissions', label: 'Team Management', roles: ['manager'] },
    { id: 'offers', label: 'Offers', roles: ['manager', 'cashier'] },
];

/** Cashiers never get Team Management — no checkbox in Grant Permissions. */
const CASHIER_LOCKED_PAGE_KEYS = new Set(['staffPermissions']);

const ROLE_PAGE_IDS = ALL_GRANTABLE_ROLE_PAGE_KEYS;

const roleCanConfigurePage = (page, roleKey) =>
    Array.isArray(page.roles) && page.roles.includes(roleKey);

const sanitizeRolePagePermissions = (permissions = {}) => {
    const mgr = {};
    const csh = {};
    for (const id of ALL_GRANTABLE_ROLE_PAGE_KEYS) {
        mgr[id] = permissions?.manager?.[id] === true;
        csh[id] = CASHIER_LOCKED_PAGE_KEYS.has(id)
            ? false
            : permissions?.cashier?.[id] === true;
    }
    return { manager: mgr, cashier: csh };
};

// Temporarily disabled: Team Management shortcut to role permissions page.
const ENABLE_ROLE_PERMISSIONS_SHORTCUT = false;

// Helper function for role styles
const getRoleStyles = (role, darkMode) => {
    switch (role) {
        case 'owner': return darkMode ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-purple-700 bg-purple-100 border-purple-200';
        case 'Manager': return darkMode ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-700 bg-indigo-100 border-indigo-200';
        default: return darkMode ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-200';
    }
};

// --- EditStaffModal ---
const EditRoleModal = ({ isOpen, onClose, onUpdateRole, staffMember, isSubmitting, darkMode, canEditRole }) => {
    const [selectedRole, setSelectedRole] = useState('');
    const [staffName, setStaffName] = useState('');

    useEffect(() => {
        if (staffMember) {
            setSelectedRole(staffMember.role);
            setStaffName(staffMember.name || '');
        }
    }, [staffMember]);

    if (!isOpen || !staffMember) return null;

    const modalBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl';
    const inputBg = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200';
    const previewRole = canEditRole ? selectedRole : staffMember.role;
    const nameUnchanged = staffName.trim() === (staffMember.name || '').trim();
    const saveDisabled =
        isSubmitting
        || !staffName.trim()
        || (canEditRole ? (selectedRole === staffMember.role && nameUnchanged) : nameUnchanged);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4">
            <div className={`${modalBg} w-full max-w-md max-h-[85vh] sm:max-h-[80vh] rounded-xl sm:rounded-2xl border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`}>
                <div className={`p-3 sm:p-4 border-b flex justify-between items-center ${darkMode ? 'border-slate-800 bg-gray-950' : 'border-slate-200 bg-white'} flex-shrink-0`}>
                    <div>
                        <h2 className={`text-lg md:text-xl font-black tracking-tight flex items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            <Edit3 className="w-5 h-5 mr-3 text-indigo-500 shrink-0" />
                            Update Staff
                        </h2>
                        <p className={`text-[9px] font-black tracking-[0.2em] mt-0.5 uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {canEditRole ? 'Profile & Role' : 'Profile'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition p-2 shrink-0" disabled={isSubmitting}>
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
                
                <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500 shrink-0`}>
                            <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>{staffMember.name}</p>
                            <p className={`text-[10px] font-bold mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{staffMember.email}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Staff Name</label>
                        <input
                            value={staffName}
                            onChange={(e) => setStaffName(e.target.value)}
                            className={`w-full px-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl focus:border-indigo-500 outline-none transition-all ${inputBg}`}
                            disabled={isSubmitting}
                            placeholder="Enter staff name"
                        />
                    </div>

                    {canEditRole ? (
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Select New Role</label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className={`w-full px-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all ${inputBg}`}
                                disabled={isSubmitting}
                            >
                                <option value="Cashier">Cashier Tier</option>
                                <option value="Manager">Management Tier</option>
                            </select>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Role</label>
                            <div className={`w-full px-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl ${inputBg} opacity-90`}>
                                {staffMember.role === 'Manager' ? 'Management Tier' : 'Cashier Tier'}
                            </div>
                            <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                                Only the store owner can change roles.
                            </p>
                        </div>
                    )}

                    <div className={`p-4 rounded-xl md:rounded-2xl border ${cardBase}`}>
                        <p className={`text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-2 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>Tier Permissions:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {ROLE_PERMISSIONS[previewRole]?.map((perm, idx) => (
                                <span key={idx} className={`text-[8px] font-black px-2 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'}`}>
                                    {perm}
                                </span>
                            ))}
                        </div>
                    </div>

                    <button 
                        onClick={() =>
                            onUpdateRole(
                                staffMember._id,
                                canEditRole
                                    ? { name: staffName.trim(), role: selectedRole }
                                    : { name: staffName.trim() }
                            )
                        }
                        className="w-full py-3 sm:py-4 bg-indigo-600 text-white font-black text-xs tracking-widest rounded-xl sm:rounded-2xl hover:bg-indigo-500 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={saveDisabled}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                <span>Updating...</span>
                            </>
                        ) : (
                            <span>Save Changes</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const formatRs = (value) =>
    `Rs ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const PayrollSettlementModal = ({
    isOpen,
    darkMode,
    staffMember,
    month,
    amount,
    baseSalary,
    otSalary,
    carryForwardIn,
    settlementPreset,
    setSettlementPreset,
    settlementAmount,
    setSettlementAmount,
    notes,
    setNotes,
    attachmentFile,
    setAttachmentFile,
    attachmentPreviewUrl,
    onClose,
    onConfirm,
    isSubmitting
}) => {
    if (!isOpen || !staffMember) return null;
    const modalBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl';
    const inputBg = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
    const salaryMode = String(staffMember?.salaryMode || 'none');
    const rate = Number(staffMember?.salaryRate || 0);
    const totalDays = Number(staffMember?.totalDays || 0);
    const totalMinutes = Number(staffMember?.totalMinutes || 0);
    const overtimeMinutes = Number(staffMember?.overtimeMinutes || 0);
    const workedHours = Math.floor(totalMinutes / 60);
    const workedMins = totalMinutes % 60;
    const overtimeHours = Math.floor(overtimeMinutes / 60);
    const overtimeMins = overtimeMinutes % 60;
    const base = Math.max(0, Number(baseSalary || 0));
    const ot = Math.max(0, Number(otSalary || 0));
    const carry = Math.max(0, Number(carryForwardIn || 0));
    const fullTotal = Math.max(0, Number(amount || 0));
    const payNow = Math.max(0, Number(settlementAmount || 0));
    const remainingAmount = Math.max(0, fullTotal - payNow);
    const presetBtn = (active) =>
        `px-2.5 py-2 rounded-lg text-[9px] font-black tracking-wider border transition-colors ${
            active
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : darkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-100'
        }`;
    const monthLabel = month
        ? new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : '-';
    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[220] flex items-end sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className={`${modalBg} w-full max-w-lg max-h-[min(92dvh,calc(100vh-1rem))] sm:max-h-[min(88dvh,calc(100vh-2rem))] rounded-xl sm:rounded-2xl border overflow-hidden flex flex-col my-auto`}>
                <div className={`shrink-0 p-3 sm:p-4 border-b flex items-center justify-between ${darkMode ? 'border-slate-800 bg-gray-950' : 'border-slate-200 bg-white'}`}>
                    <div>
                        <h3 className={`text-base sm:text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Mark Salary Settled</h3>
                        <p className={`text-[9px] font-black tracking-[0.2em] uppercase mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{staffMember.name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 text-slate-500 hover:text-rose-500" disabled={isSubmitting}>
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 space-y-3 custom-scrollbar">
                    <div className={`rounded-lg border p-3 ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                        <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Month: {monthLabel}</p>
                        <p className={`text-[10px] font-bold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Worked period: {workedHours}h {workedMins}m
                        </p>
                        <p className={`text-[10px] font-bold mt-1 ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                            Overtime: {overtimeHours}h {overtimeMins}m
                        </p>
                        <p className={`text-[10px] font-bold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {salaryMode === 'hourly' ? 'Hourly' : salaryMode === 'daily' ? 'Daily' : 'Salary'} rate {formatRs(rate)}
                            {salaryMode === 'daily' ? ` · ${totalDays} day(s)` : ''}
                        </p>
                        <div className={`mt-3 space-y-1.5 rounded-lg border p-2.5 ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}>
                            <div className="flex justify-between gap-2">
                                <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Base salary</span>
                                <span className={`text-[10px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatRs(base)}</span>
                            </div>
                            {ot > 0 && (
                                <div className="flex justify-between gap-2">
                                    <span className={`text-[10px] font-bold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>OT pay</span>
                                    <span className={`text-[10px] font-black ${darkMode ? 'text-amber-200' : 'text-amber-800'}`}>{formatRs(ot)}</span>
                                </div>
                            )}
                            {carry > 0 && (
                                <div className="flex justify-between gap-2">
                                    <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Previous balance</span>
                                    <span className={`text-[10px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatRs(carry)}</span>
                                </div>
                            )}
                            <div className={`flex justify-between gap-2 pt-1.5 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                <span className={`text-[11px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Total due</span>
                                <span className={`text-[11px] font-black ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{formatRs(fullTotal)}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Settlement type</label>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button type="button" disabled={isSubmitting} className={presetBtn(settlementPreset === 'full')} onClick={() => setSettlementPreset('full')}>
                                Salary + OT
                            </button>
                            <button type="button" disabled={isSubmitting} className={presetBtn(settlementPreset === 'base_only')} onClick={() => setSettlementPreset('base_only')}>
                                Base only
                            </button>
                            <button type="button" disabled={isSubmitting} className={presetBtn(settlementPreset === 'custom')} onClick={() => setSettlementPreset('custom')}>
                                Custom
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pay amount</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={settlementAmount}
                            onChange={(e) => {
                                setSettlementAmount(e.target.value);
                                setSettlementPreset('custom');
                            }}
                            className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${inputBg} ${settlementPreset !== 'custom' ? 'opacity-90' : ''}`}
                            placeholder="Enter paid amount"
                            disabled={isSubmitting || settlementPreset !== 'custom'}
                            readOnly={settlementPreset !== 'custom'}
                        />
                        <p className={`text-[11px] font-bold mt-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            Remaining to next month: {formatRs(remainingAmount)}
                            {settlementPreset === 'base_only' && ot > 0 ? (
                                <span className={`block mt-0.5 text-[10px] font-bold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                    Unpaid OT ({formatRs(ot)}) will carry forward with any other balance.
                                </span>
                            ) : null}
                        </p>
                    </div>

                    <div>
                        <label className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className={`mt-2 w-full px-3 py-2 rounded-lg border text-sm ${inputBg}`}
                            placeholder="Settlement note..."
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className={`text-[9px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Attachment (optional)</label>
                        <input
                            type="file"
                            onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                            className={`mt-2 block w-full text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                            disabled={isSubmitting}
                        />
                        {attachmentFile && (
                            <p className={`mt-2 text-[11px] font-bold flex items-center gap-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                <Paperclip className="w-3.5 h-3.5" />
                                {attachmentFile.name}
                            </p>
                        )}
                        {attachmentPreviewUrl && (
                            <a
                                href={attachmentPreviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={`mt-2 inline-flex items-center gap-1 text-[11px] font-black ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Preview selected attachment
                            </a>
                        )}
                    </div>
                </div>
                <div className={`shrink-0 p-3 sm:p-4 border-t flex justify-end gap-2 ${darkMode ? 'border-slate-800 bg-gray-950/50' : 'border-slate-200 bg-slate-50'}`}>
                    <button type="button" onClick={onClose} disabled={isSubmitting} className={`px-3 py-2 rounded-lg text-[10px] font-black tracking-wider ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-white border border-slate-200 text-slate-700'}`}>
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={isSubmitting} className="px-3 py-2 rounded-lg text-[10px] font-black tracking-wider bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 flex items-center gap-2">
                        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {isSubmitting ? 'Saving...' : 'Confirm Settlement'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- StaffStatusButton Component ---
const StaffStatusButton = ({ staff, isActionDisabled, isPendingActivation, onToggleActive, onEdit, onRemove, darkMode, borderStyle, cardBase, apiClient, API, showToast, isCurrentlyActive, punchInTime, isOnBreak, breakStart, breakDurationMinutes, canManageWorkHours, onSaveWorkSchedule, isSavingWorkSchedule, onUpdatePayrollSettlement, isUpdatingPayrollSettlement, existingShifts = [], currentUser }) => {
    const [showAttendance, setShowAttendance] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [showPendingInfo, setShowPendingInfo] = useState(false);
    const [scheduleForm, setScheduleForm] = useState({
        enabled: false,
        shiftName: '',
        punchInStart: '',
        punchInEnd: '',
        autoPunchOutTime: '',
        salaryMode: 'none',
        salaryAmount: ''
    });
    const pendingInfoRef = useRef(null);
    const existingShiftMap = useMemo(() => {
        const map = new Map();
        (existingShifts || []).forEach((shift) => {
            const key = String(shift?.name || '').trim().toLowerCase();
            if (!key) return;
            map.set(key, shift);
        });
        return map;
    }, [existingShifts]);

    useEffect(() => {
        const ws = staff?.workSchedule || {};
        const normalizedShiftName = String(ws.shiftName || '').trim();
        setScheduleForm({
            enabled: ws.enabled === true,
            shiftName: normalizedShiftName,
            punchInStart: ws.punchInStart || '',
            punchInEnd: ws.punchInEnd || '',
            autoPunchOutTime: ws.autoPunchOutTime || ws.punchInEnd || '',
            salaryMode: staff?.compensation?.salaryMode || 'none',
            salaryAmount: staff?.compensation?.amount != null ? String(staff.compensation.amount) : ''
        });
    }, [staff, existingShiftMap]);

    useEffect(() => {
        if (!showPendingInfo) return;
        const onPointerDown = (e) => {
            if (pendingInfoRef.current && !pendingInfoRef.current.contains(e.target)) {
                setShowPendingInfo(false);
            }
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
        };
    }, [showPendingInfo]);

    // Format "time ago" for punch in (working) or break start (on break)
    const formatTimeAgo = (dateOrIso) => {
        if (!dateOrIso) return '';
        const date = new Date(dateOrIso);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // Format break duration for display (e.g. "12m on break")
    const formatBreakDuration = (minutes) => {
        if (minutes == null || minutes < 0) return '';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m ? `${h}h ${m}m` : `${h}h`;
    };

    // Caption: when working show punch-in ago; when on break show ongoing break time
    const statusCaption = (() => {
        if (!isCurrentlyActive) return null;
        if (isOnBreak) {
            if (breakStart != null) {
                return `Break started ${formatTimeAgo(breakStart)}`;
            }
            // Use duration only when we don't have breakStart (fallback)
            const minutesOnBreak = breakDurationMinutes != null && breakDurationMinutes >= 0
                ? breakDurationMinutes
                : null;
            if (minutesOnBreak != null) {
                return `${formatBreakDuration(minutesOnBreak)} on break`;
            }
            return 'On break';
        }
        if (punchInTime) return formatTimeAgo(punchInTime);
        return null;
    })();
    const formatWorkedTime = (minutes) => {
        const totalMinutes = Math.max(0, Number(minutes || 0));
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${m}m`;
    };
    const maskedOwnerEmail = participantEmailForViewer(staff, currentUser);
    const roleBadgeNormalCase = isStaffViewer(currentUser) && isParticipantOwner(staff);
    return (
        <div className="space-y-3">
            <div 
                className={`group flex flex-col p-3 md:p-4 border rounded-xl md:rounded-2xl transition-all ${cardBase} ${darkMode ? 'hover:border-slate-700' : 'hover:border-indigo-200'}`}
            >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-5 flex-1 min-w-0">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border shrink-0 ${getRoleStyles(staff.role, darkMode)}`}>
                            {staff.role === 'owner' ? <Crown className="w-5 h-5 md:w-6 md:h-6" /> : <User className="w-5 h-5 md:w-6 md:h-6" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className={`text-sm md:text-base font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{participantLabelForViewer(staff, currentUser)}</h3>
                            {maskedOwnerEmail && (
                            <p className={`text-[11px] md:text-xs font-bold truncate mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{maskedOwnerEmail}</p>
                            )}
                            {staff.role !== 'owner' && !isPendingActivation && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className={`flex items-center gap-1.5 ${isCurrentlyActive 
                                        ? (isOnBreak 
                                            ? (darkMode ? 'text-amber-400' : 'text-amber-600')
                                            : (darkMode ? 'text-emerald-400' : 'text-emerald-600'))
                                        : (darkMode ? 'text-slate-500' : 'text-slate-400')
                                    }`}>
                                        <div className={`w-2 h-2 rounded-full ${isCurrentlyActive 
                                            ? (isOnBreak 
                                                ? (darkMode ? 'bg-amber-500' : 'bg-amber-500')
                                                : (darkMode ? 'bg-emerald-500' : 'bg-emerald-500'))
                                            : (darkMode ? 'bg-slate-600' : 'bg-slate-400')
                                        } ${isCurrentlyActive ? 'animate-pulse' : ''}`} />
                                        <span className={`text-[10px] md:text-[11px] font-bold ${isCurrentlyActive 
                                            ? (isOnBreak 
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-emerald-600 dark:text-emerald-400')
                                            : 'text-slate-500 dark:text-slate-400'
                                        }`}>
                                            {isCurrentlyActive 
                                                ? (isOnBreak ? 'On Break' : 'Currently Working')
                                                : 'Not Working'}
                                        </span>
                                    </div>
                                    {isCurrentlyActive && statusCaption && (
                                        <span className={`text-[9px] md:text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                            • {statusCaption}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest ${roleBadgeNormalCase ? 'normal-case' : 'uppercase'} ${getRoleStyles(staff.role, darkMode)}`}>
                                    {participantRoleLabelForViewer(staff, currentUser)}
                                </span>
                                {staff.active && !isPendingActivation && (
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase flex items-center gap-1 ${darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                                        <CheckCircle2 className="w-2.5 h-2.5" />
                                        Account Active
                                    </span>
                                )}
                                {!staff.active && !isPendingActivation && (
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase flex items-center gap-1 ${darkMode ? 'bg-slate-700/50 text-slate-400 border-slate-600' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                                        <XCircle className="w-2.5 h-2.5" />
                                        Account Deactivated
                                    </span>
                                )}
                                {isPendingActivation && (
                                    <div className="relative flex items-center gap-1" ref={pendingInfoRef}>
                                        <span className={`text-[9px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase flex items-center gap-1 ${darkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-amber-200 text-amber-800 border-amber-400'}`}>
                                            <AlertCircle className="w-2.5 h-2.5" />
                                            Pending Setup
                                        </span>
                                        <button
                                            type="button"
                                            aria-label="What is pending setup?"
                                            aria-expanded={showPendingInfo}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowPendingInfo((v) => !v);
                                            }}
                                            className={`touch-manipulation rounded-full p-1 transition-colors ${darkMode ? 'text-amber-400 hover:bg-amber-500/20' : 'text-amber-700 hover:bg-amber-100'}`}
                                        >
                                            <Info className="w-3.5 h-3.5" />
                                        </button>
                                        {showPendingInfo && (
                                            <div
                                                className={`absolute left-0 top-full z-30 mt-1.5 max-w-[min(100vw-2rem,22rem)] p-3 rounded-xl border shadow-lg ${darkMode ? 'bg-slate-900 border-amber-500/30 text-slate-200' : 'bg-white border-amber-200 text-slate-800'}`}
                                                role="tooltip"
                                            >
                                                <p className="text-[10px] sm:text-[11px] font-bold leading-relaxed">
                                                    An activation email with a password setup link has been sent to <strong>{staff.email}</strong>. The staff member needs to click the link and set their password to activate their account.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {staff?.workSchedule?.enabled && staff?.workSchedule?.punchInStart && staff?.workSchedule?.punchInEnd && (
                                    <span className={`text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded border tracking-widest uppercase ${darkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                                        Shift Enabled
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className={`flex items-center gap-2 md:gap-3 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 ${borderStyle}`}>
                        <div className="flex-1 sm:flex-none">
                    <button
                        onClick={() => onToggleActive(staff)}
                        disabled={isActionDisabled}
                        className={`touch-manipulation min-h-[44px] w-full sm:w-auto px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-black text-[11px] md:text-[10px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${
                            staff.active
                            ? (darkMode ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white' : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-600 hover:text-white')
                            : isPendingActivation
                            ? (darkMode ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-600 hover:text-white' : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-600 hover:text-white')
                            : (darkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white')
                        } disabled:opacity-20`}
                    >
                        <Power className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        {staff.active || isPendingActivation ? 'Deactivate Account' : 'Reactivate Account'}
                    </button>
                        </div>

                        <button
                            onClick={() => onEdit(staff)}
                            disabled={isActionDisabled} 
                            className={`touch-manipulation min-h-[44px] min-w-[44px] p-2.5 md:p-3.5 rounded-xl md:rounded-2xl transition-all active:scale-95 disabled:opacity-20 ${darkMode ? 'text-indigo-400 bg-slate-900 border border-slate-800 hover:bg-indigo-600 hover:text-white' : 'text-indigo-600 bg-slate-50 border border-slate-200 hover:bg-indigo-600 hover:text-white'}`}
                        >
                            <Edit3 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        
                        {/* Delete: inactive staff (includes pending activation — never completed setup) */}
                        {!staff.active && (
                            <button
                                onClick={() => onRemove(staff)}
                                disabled={isActionDisabled}
                                title={
                                    isPendingActivation
                                        ? 'Delete this pending invite and remove the account from your team'
                                        : 'Delete permanently – removes all data; staff cannot log in again'
                                }
                                className={`touch-manipulation min-h-[44px] min-w-[44px] p-2.5 md:p-3.5 rounded-xl md:rounded-2xl transition-all active:scale-95 disabled:opacity-20 ${darkMode ? 'text-red-500 bg-slate-900 border border-slate-800 hover:bg-red-500 hover:text-white' : 'text-red-600 bg-slate-50 border border-slate-200 hover:bg-red-600 hover:text-white'}`}
                            >
                                <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                        )}
                    </div>
                </div>
                {staff.role !== 'owner' && !isPendingActivation && (
                    <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setShowDetails((v) => !v)}
                                className={`w-full py-2 px-3 rounded-lg text-[11px] font-black tracking-wider transition-all ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                {showDetails ? 'Close work profile' : 'Work profile'}
                            </button>
                            <button
                                onClick={() => setShowAttendance(!showAttendance)}
                                className={`w-full py-2 px-3 rounded-lg text-[11px] font-black tracking-wider transition-all ${darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                            >
                                {showAttendance ? 'Hide' : 'View'} Attendance
                            </button>
                        </div>
                        <WorkProfileModal
                            isOpen={showDetails}
                            onClose={() => setShowDetails(false)}
                            staff={staff}
                            darkMode={darkMode}
                            scheduleForm={scheduleForm}
                            setScheduleForm={setScheduleForm}
                            existingShifts={existingShifts}
                            existingShiftMap={existingShiftMap}
                            canManageWorkHours={canManageWorkHours}
                            onSaveWorkSchedule={onSaveWorkSchedule}
                            isSavingWorkSchedule={isSavingWorkSchedule}
                            showToast={showToast}
                        />
                    </div>
                )}
            </div>
            {showAttendance && staff.role !== 'owner' && apiClient && API && showToast && (
                <AttendanceCalendar
                    apiClient={apiClient}
                    API={API}
                    showToast={showToast}
                    darkMode={darkMode}
                    staffId={staff._id}
                    staffName={staff.name}
                />
            )}
        </div>
    );
};

// --- AddStaffModal ---
const AddStaffModal = ({ isOpen, onClose, onAddStaff, isSubmitting, darkMode, error, onUpgradePlan }) => {
    const [formData, setFormData] = useState({ name: '', email: '', role: 'Cashier' });
    const [fieldErrors, setFieldErrors] = useState({ name: '', email: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear this field's validation error when user types
        if (name === 'name' || name === 'email') {
            setFieldErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e) => {
        if (e?.preventDefault) e.preventDefault();
        setFieldErrors({ name: '', email: '' });

        // Validate fields
        const errors = {};
        if (!formData.name || !formData.name.trim()) {
            errors.name = 'Name is required.';
        } else if (formData.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters.';
        }

        if (!formData.email || !formData.email.trim()) {
            errors.email = 'Email is required.';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const trimmedEmail = formData.email.trim().toLowerCase();
            if (/\s/.test(trimmedEmail)) {
                errors.email = 'Email cannot contain spaces.';
            } else if (!emailRegex.test(trimmedEmail)) {
                errors.email = 'Please enter a valid email address.';
            }
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        onAddStaff(formData, () => {
            setFormData({ name: '', email: '', role: 'Cashier' });
            setFieldErrors({ name: '', email: '' });
        });
    };

    // Clear form and errors when modal closes
    useEffect(() => {
        if (!isOpen) {
            setFormData({ name: '', email: '', role: 'Cashier' });
            setFieldErrors({ name: '', email: '' });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const modalBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl';
    const inputBg = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-3 sm:p-4">
            <div className={`${modalBg} w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] rounded-xl sm:rounded-[1.25rem] border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col`}>
                <div className={`p-3 sm:p-4 border-b flex justify-between items-center flex-shrink-0 ${darkMode ? 'border-gray-800 bg-indigo-500/5' : 'border-slate-100 bg-slate-50'}`}>
                    <div>
                        <h2 className={`text-lg sm:text-xl font-black tracking-tighter flex items-center ${darkMode ? 'text-white' : 'text-black'}`}>
                            <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-indigo-500 shrink-0" />
                            Provision Staff
                        </h2>
                        <p className={`text-[9px] sm:text-[10px] font-black tracking-widest mt-1 ${darkMode ? 'text-gray-500' : 'text-slate-600'}`}>Access Credentialing</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition p-2 rounded-full shrink-0" disabled={isSubmitting}>
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-5 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className={`flex flex-col gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${darkMode ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-200'}`}>
                            <div className="flex gap-2 sm:gap-3">
                                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0 mt-0.5" />
                                <p className={`text-[10px] sm:text-[11px] font-bold leading-relaxed flex-1 ${darkMode ? 'text-rose-200' : 'text-rose-900'}`}>
                                    {error}
                                </p>
                            </div>
                            {error.includes('Plan Limit Reached') && onUpgradePlan && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        onUpgradePlan();
                                    }}
                                    className={`w-full mt-2 px-4 py-2.5 rounded-lg text-[10px] sm:text-[11px] font-black tracking-widest transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                >
                                    Upgrade Now
                                </button>
                            )}
                        </div>
                    )}
                    <div className={`flex gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${darkMode ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                        <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <p className={`text-[10px] sm:text-[11px] font-bold leading-relaxed ${darkMode ? 'text-indigo-200/70' : 'text-indigo-900'}`}>
                            A secure <strong>activation link</strong> will be dispatched to the email provided for identity verification.
                        </p>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-4">
                        <div>
                            <div className={`relative group ${fieldErrors.name ? 'mb-1' : ''}`}>
                                <User className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${fieldErrors.name ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className={`w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl outline-none transition-all ${inputBg} ${fieldErrors.name ? 'border-rose-500 focus:border-rose-500' : 'focus:border-indigo-500'}`}
                                    placeholder='Full Legal Name'
                                    disabled={isSubmitting}
                                    aria-invalid={!!fieldErrors.name}
                                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                                />
                            </div>
                            {fieldErrors.name && (
                                <p id="name-error" className="text-[11px] font-semibold text-rose-500 mt-1 px-1">
                                    {fieldErrors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <div className={`relative group ${fieldErrors.email ? 'mb-1' : ''}`}>
                                <Mail className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${fieldErrors.email ? 'text-rose-500' : 'text-slate-400 group-focus-within:text-indigo-500'}`} />
                                <input
                                    type="text"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="email"
                                    className={`w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl outline-none transition-all ${inputBg} ${fieldErrors.email ? 'border-rose-500 focus:border-rose-500' : 'focus:border-indigo-500'}`}
                                    placeholder='Corporate Email Address'
                                    disabled={isSubmitting}
                                    aria-invalid={!!fieldErrors.email}
                                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                                />
                            </div>
                            {fieldErrors.email && (
                                <p id="email-error" className="text-[11px] font-semibold text-rose-500 mt-1 px-1">
                                    {fieldErrors.email}
                                </p>
                            )}
                        </div>

                        <div className="relative group">
                            <ShieldCheck className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className={`w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 border text-sm font-bold rounded-xl sm:rounded-2xl outline-none appearance-none cursor-pointer transition-all ${inputBg} focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10`}
                                disabled={isSubmitting}
                            >
                                <option value="Cashier">Cashier Tier</option>
                                <option value="Manager">Management Tier</option>
                            </select>
                            <div className="pointer-events-none absolute right-3 sm:right-4 top-1/2 -translate-y-1/2">
                                <ChevronDown className={`w-4 h-4 transition-colors ${darkMode ? 'text-slate-400 group-focus-within:text-indigo-400' : 'text-slate-500 group-focus-within:text-indigo-600'}`} />
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl border ${cardBase}`}>
                        <p className={`text-[9px] font-black tracking-[0.2em] mb-2 sm:mb-3 flex items-center uppercase ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                            <ChevronRight className="w-3 h-3 mr-1 text-indigo-500" /> Permissions Manifest: {formData.role}
                        </p>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {ROLE_PERMISSIONS[formData.role].map((perm, idx) => (
                                <span key={idx} className={`text-[8px] sm:text-[9px] font-black px-2 py-1 rounded-md tracking-tighter ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'}`}>
                                    {perm}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <button 
                        type="button"
                        onClick={handleSubmit}
                        className="w-full py-3 sm:py-4 bg-indigo-600 text-white font-black text-xs tracking-widest rounded-xl sm:rounded-2xl hover:bg-indigo-500 transition shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                <span>Provisioning...</span>
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>Add Member to Team</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- StaffPermissionsManager Main ---
const StaffPermissionsManager = ({ apiClient, showToast, setConfirmModal: externalSetConfirmModal, currentUserRole, currentUser, darkMode, onUpgradePlan, onOpenRolePermissions, canAccessTeamManagement: canAccessTeamManagementProp }) => {
    const [staff, setStaff] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [activeStaffIds, setActiveStaffIds] = useState(new Set());
    const [activeStaffMap, setActiveStaffMap] = useState({}); // Map of staffId -> { punchIn: Date }
    const [confirmModal, setConfirmModal] = useState(null); // Internal confirmation modal state
    const [rolePagePermissions, setRolePagePermissions] = useState({ manager: {}, cashier: {} });
    const [isSavingRolePermissions, setIsSavingRolePermissions] = useState(false);
    const [showGrantPermissions, setShowGrantPermissions] = useState(false);
    const [scheduleUpdatingId, setScheduleUpdatingId] = useState(null);
    const [payrollUpdatingId, setPayrollUpdatingId] = useState(null);
    const [payrollConfirmingId, setPayrollConfirmingId] = useState(null);
    const [payrollSettlementModal, setPayrollSettlementModal] = useState(null);
    const [payrollSettlementAmount, setPayrollSettlementAmount] = useState('');
    const [payrollSettlementPreset, setPayrollSettlementPreset] = useState('full');
    const [payrollSettlementNotes, setPayrollSettlementNotes] = useState('');
    const [payrollSettlementAttachment, setPayrollSettlementAttachment] = useState(null);
    const [managementTab, setManagementTab] = useState('team');
    const [showManagementTabs, setShowManagementTabs] = useState(true);
    const [salaryTab, setSalaryTab] = useState('report');
    const [payrollStatementRows, setPayrollStatementRows] = useState([]);
    void onOpenRolePermissions;

    const effectiveRole = (currentUserRole || currentUser?.role || 'owner').toLowerCase();
    const canAccessTeamManagement = useMemo(() => {
        if (typeof canAccessTeamManagementProp === 'boolean') return canAccessTeamManagementProp;
        if (effectiveRole === 'owner') return true;
        if (effectiveRole === 'manager') {
            return currentUser?.permissions?.pages?.staffPermissions === true;
        }
        return false;
    }, [canAccessTeamManagementProp, effectiveRole, currentUser?.permissions?.pages?.staffPermissions]);
    const hasOwnerAccess = effectiveRole === 'owner';
    const hasReadAccess = canAccessTeamManagement;
    const hasWriteAccess = canAccessTeamManagement && (effectiveRole === 'owner' || effectiveRole === 'manager');

    const fetchStaff = useCallback(async () => {
        if (!hasReadAccess || !apiClient) {
            setIsLoading(false);
            setHasLoadedOnce(true);
            return;
        }
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.staff); 
            const sortedStaff = response.data.sort((a, b) => {
                if (a.role === 'owner') return -1;
                if (b.role === 'owner') return 1;
                return a.name.localeCompare(b.name);
            });
            setStaff(sortedStaff);
        } catch (error) {
            if (error?.cancelled) return; // duplicate-request cancel; another GET may still succeed
            console.error('Fetch failed:', error);
            if (showToast) showToast('Failed to sync directory.', 'error');
        } finally {
            setIsLoading(false);
            setHasLoadedOnce(true);
        }
    }, [apiClient, hasReadAccess, showToast]);

    const fetchRolePermissions = useCallback(async () => {
        if (!hasOwnerAccess || !apiClient) return;
        try {
            const response = await apiClient.get(API.staffRolePermissions);
            if (response.data?.permissions) {
                setRolePagePermissions(sanitizeRolePagePermissions(response.data.permissions));
            }
        } catch (error) {
            if (error?.cancelled) return;
            console.error('Failed to fetch role permissions:', error);
        }
    }, [apiClient, hasOwnerAccess]);

    const fetchActiveStatus = useCallback(async () => {
        if (!hasReadAccess || !apiClient) return;
        try {
            const response = await apiClient.get(API.attendanceActiveStatus);
            if (response.data?.success) {
                if (response.data?.activeStaffIds) {
                    setActiveStaffIds(new Set(response.data.activeStaffIds));
                }
                // Store punch in times, break status, and break start/duration for display
                if (response.data?.activeAttendance) {
                    const map = {};
                    response.data.activeAttendance.forEach(item => {
                        if (item.staffId != null && item.punchIn) {
                            const key = String(item.staffId);
                            map[key] = {
                                punchIn: item.punchIn,
                                onBreak: item.onBreak || false,
                                breakStart: item.breakStart || null,
                                breakDurationMinutes: item.breakDurationMinutes ?? 0
                            };
                        }
                    });
                    setActiveStaffMap(map);
                }
            }
        } catch (error) {
            // Silently fail - active status is not critical
            console.error('Failed to fetch active status:', error);
        }
    }, [apiClient, hasReadAccess]);
    const fetchPayrollStatement = useCallback(async () => {
        if (!hasWriteAccess || !apiClient) return;
        try {
            const res = await apiClient.get(API.staffPayrollStatement);
            const rows = Array.isArray(res?.data?.rows) ? res.data.rows : [];
            setPayrollStatementRows(rows);
        } catch (error) {
            if (error?.cancelled) return;
            setPayrollStatementRows([]);
        }
    }, [API.staffPayrollStatement, apiClient, hasWriteAccess]);

    useEffect(() => {
        fetchStaff();
        fetchActiveStatus();
        fetchRolePermissions();
        fetchPayrollStatement();
        
        // Refresh active status every 60 seconds
        const interval = setInterval(() => {
            fetchActiveStatus();
        }, 60000);
        
        return () => clearInterval(interval);
    }, [fetchStaff, fetchActiveStatus, fetchRolePermissions, fetchPayrollStatement]);

    const [addStaffError, setAddStaffError] = useState(null);

    useEffect(() => {
        if (managementTab !== 'team') {
            setIsAddModalOpen(false);
            setAddStaffError(null);
        }
    }, [managementTab]);

    const payrollAttachmentPreviewUrl = useMemo(() => {
        if (!payrollSettlementAttachment) return '';
        return URL.createObjectURL(payrollSettlementAttachment);
    }, [payrollSettlementAttachment]);

    useEffect(() => {
        return () => {
            if (payrollAttachmentPreviewUrl) URL.revokeObjectURL(payrollAttachmentPreviewUrl);
        };
    }, [payrollAttachmentPreviewUrl]);

    const handleAddStaff = async (formData, resetForm) => {
        if (!hasOwnerAccess) return;
        setAddStaffError(null); // Clear previous error
        setIsProcessing(true);
        try {
            const response = await apiClient.post(API.staff, formData);
            // Server returns emailDispatch when an email was queued — see Network tab or console (Render logs often omit stdout).
            if (response.data?.emailDispatch) {
                console.warn('[Staff] emailDispatch (SMTP debug from API):', response.data.emailDispatch);
            }
            if (showToast) showToast('Staff provisioned successfully.', 'success');
            await fetchStaff(); 
            resetForm();
            setAddStaffError(null); // Clear error on success
            setIsAddModalOpen(false); 
        } catch (error) {
            if (error?.cancelled) {
                const msg = 'Request was cancelled (often a duplicate call). Please try again.';
                setAddStaffError(msg);
                if (showToast) showToast(msg, 'error');
            } else {
                const errorMessage = error.response?.data?.error || error.message || 'Add failed.';
                setAddStaffError(errorMessage);
                if (showToast) showToast(errorMessage, 'error');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateRole = async (id, updates) => {
        setIsProcessing(true);
        try {
            const payload = { name: updates?.name };
            if (hasOwnerAccess && updates?.role != null) {
                payload.role = updates.role;
            }
            await apiClient.put(API.staffUpdate ? API.staffUpdate(id) : API.staffRoleUpdate(id), payload);
            if (showToast) showToast('Staff details updated.', 'success');
            await fetchStaff();
            setIsEditModalOpen(false);
            setSelectedStaff(null);
        } catch (error) {
            if (showToast) showToast(error.response?.data?.error || 'Staff update failed.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleRolePermission = (roleKey, pageId) => {
        if (roleKey === 'cashier' && CASHIER_LOCKED_PAGE_KEYS.has(pageId)) return;
        setRolePagePermissions((prev) => ({
            ...prev,
            [roleKey]: {
                ...(prev?.[roleKey] || {}),
                [pageId]: !(prev?.[roleKey]?.[pageId] === true),
            },
        }));
    };

    const handleSaveRolePermissions = async () => {
        if (!hasOwnerAccess) return;
        setIsSavingRolePermissions(true);
        try {
            const mgr = {};
            const csh = {};
            for (const id of ALL_GRANTABLE_ROLE_PAGE_KEYS) {
                mgr[id] = rolePagePermissions?.manager?.[id] === true;
                csh[id] = CASHIER_LOCKED_PAGE_KEYS.has(id)
                    ? false
                    : rolePagePermissions?.cashier?.[id] === true;
            }
            await apiClient.put(API.staffRolePermissions, { manager: mgr, cashier: csh });
            if (showToast) showToast('Team page permissions updated.', 'success');
            await fetchRolePermissions();
        } catch (error) {
            if (showToast) showToast(error.response?.data?.error || 'Failed to save page permissions.', 'error');
        } finally {
            setIsSavingRolePermissions(false);
        }
    };
    const handleSaveStaffWorkSchedule = async (staffMember, scheduleForm) => {
        if (!hasWriteAccess || !staffMember?._id) return;
        setScheduleUpdatingId(String(staffMember._id));
        try {
            const res = await apiClient.put(API.staffWorkScheduleUpdate(staffMember._id), scheduleForm);
            const updated = res?.data?.staff;
            if (updated) {
                setStaff((prev) => prev.map((s) => (String(s._id) === String(staffMember._id) ? { ...s, ...updated } : s)));
            } else {
                await fetchStaff();
            }
            if (showToast) showToast('Staff shift updated.', 'success');
            return true;
        } catch (error) {
            if (showToast) showToast(error.response?.data?.error || 'Failed to update staff shift.', 'error');
            return false;
        } finally {
            setScheduleUpdatingId(null);
        }
    };
    const handleUpdatePayrollSettlement = useCallback(async (staffMember, payload) => {
        if (!hasWriteAccess || !staffMember?._id) return;
        setPayrollUpdatingId(String(staffMember._id));
        try {
            await apiClient.put(API.staffPayrollSettlementUpdate(staffMember._id), payload);
            await fetchStaff();
            await fetchPayrollStatement();
            if (showToast) showToast(payload.paid ? 'Payroll marked settled.' : 'Payroll marked pending.', 'success');
        } catch (error) {
            if (showToast) showToast(error.response?.data?.error || 'Failed to update payroll settlement.', 'error');
        } finally {
            setPayrollUpdatingId(null);
        }
    }, [apiClient, API.staffPayrollSettlementUpdate, fetchPayrollStatement, fetchStaff, hasWriteAccess, showToast]);

    const openPayrollSettlementModal = useCallback((staffMember, month) => {
        const summary = staffMember?.payrollSummary || {};
        const totalSalary = Number(summary.totalSalary || 0);
        const baseSalary = Number(summary.baseSalary || 0);
        const otSalary = Number(summary.otSalary || 0);
        const carryForwardIn = Number(summary.carryForwardIn || 0);
        const salaryWithoutOt = Math.round((baseSalary + carryForwardIn) * 100) / 100;
        setPayrollSettlementModal({
            staffId: String(staffMember?._id || ''),
            staffName: staffMember?.name || '',
            month: String(month || ''),
            amount: totalSalary,
            baseSalary,
            otSalary,
            carryForwardIn,
            salaryWithoutOt,
            salaryMode: String(staffMember?.compensation?.salaryMode || 'none'),
            salaryRate: Number(staffMember?.compensation?.amount || 0),
            totalMinutes: Number(summary.totalMinutes || 0),
            overtimeMinutes: Number(summary.overtimeMinutes || 0),
            totalDays: Number(summary.totalDays || 0),
        });
        setPayrollSettlementPreset('full');
        setPayrollSettlementAmount(String(totalSalary));
        setPayrollSettlementNotes('');
        setPayrollSettlementAttachment(null);
    }, []);

    const closePayrollSettlementModal = useCallback(() => {
        setPayrollSettlementModal(null);
        setPayrollSettlementAmount('');
        setPayrollSettlementPreset('full');
        setPayrollSettlementNotes('');
        setPayrollSettlementAttachment(null);
        setPayrollConfirmingId(null);
    }, []);

    useEffect(() => {
        if (!payrollSettlementModal) return;
        if (payrollSettlementPreset === 'full') {
            setPayrollSettlementAmount(String(Number(payrollSettlementModal.amount || 0)));
        } else if (payrollSettlementPreset === 'base_only') {
            setPayrollSettlementAmount(String(Number(payrollSettlementModal.salaryWithoutOt || 0)));
        }
    }, [payrollSettlementPreset, payrollSettlementModal]);

    const confirmPayrollSettlement = useCallback(async () => {
        if (!payrollSettlementModal?.staffId) return;
        const staffMember = staff.find((s) => String(s._id) === payrollSettlementModal.staffId);
        if (!staffMember) return;
        const calculatedAmount = Math.max(0, Number(payrollSettlementModal.amount || 0));
        const enteredAmount = Math.max(0, Number(payrollSettlementAmount || 0));
        const settlementAmount = Math.min(calculatedAmount, enteredAmount);
        const presetLabels = {
            full: 'Salary + OT',
            base_only: 'Base salary only (OT unpaid)',
            custom: 'Custom amount',
        };
        const presetNote = presetLabels[payrollSettlementPreset] || '';
        const combinedNotes = [payrollSettlementNotes?.trim(), presetNote && `Settlement: ${presetNote}`]
            .filter(Boolean)
            .join('\n');

        let attachmentPayload = {};
        try {
            setPayrollConfirmingId(payrollSettlementModal.staffId);
            if (payrollSettlementAttachment) {
                const formData = new FormData();
                formData.append('attachment', payrollSettlementAttachment);
                const uploadRes = await apiClient.post(
                    API.staffPayrollAttachmentUpload(payrollSettlementModal.staffId),
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' } }
                );
                attachmentPayload = {
                    attachmentUrl: uploadRes?.data?.attachmentUrl || uploadRes?.data?.attachmentPath || '',
                    attachmentName: uploadRes?.data?.attachmentName || payrollSettlementAttachment.name || '',
                    attachmentType: uploadRes?.data?.attachmentType || payrollSettlementAttachment.type || ''
                };
            }
            await handleUpdatePayrollSettlement(staffMember, {
                month: payrollSettlementModal.month,
                paid: true,
                amount: settlementAmount,
                calculatedAmount,
                notes: combinedNotes,
                ...attachmentPayload
            });
            closePayrollSettlementModal();
        } catch (error) {
            if (showToast) showToast(error.response?.data?.error || 'Failed to mark payroll settled.', 'error');
        } finally {
            setPayrollConfirmingId(null);
        }
    }, [
        API.staffPayrollAttachmentUpload,
        apiClient,
        closePayrollSettlementModal,
        handleUpdatePayrollSettlement,
        payrollSettlementAttachment,
        payrollSettlementAmount,
        payrollSettlementModal,
        payrollSettlementNotes,
        payrollSettlementPreset,
        showToast,
        staff
    ]);
    const downloadPayrollStatement = useCallback(async () => {
        if (!hasWriteAccess || !apiClient) return;
        try {
            const res = await apiClient.get(`${API.staffPayrollStatement}?format=csv`, {
                responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const monthStamp = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.setAttribute('download', `payroll-statement-${monthStamp}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            if (showToast) showToast('Payroll statement downloaded.', 'success');
        } catch (error) {
            if (showToast) showToast('Failed to download payroll statement.', 'error');
        }
    }, [API.staffPayrollStatement, apiClient, hasWriteAccess, showToast]);

    const handleToggleActive = async (staffMember) => {
        if (!hasWriteAccess || staffMember.role === 'owner') return;

        const isPendingActivation =
            staffMember.passwordSetupStatus === 'pending' && !staffMember.active;

        // Pending invite: same endpoint revokes token (does not activate without password)
        if (isPendingActivation) {
            const showModal = externalSetConfirmModal || setConfirmModal;
            showModal({
                message: `This stops the activation link for ${staffMember.name}. They have not finished setup. You can remove them from the team or add them again with the same email to send a new invitation.`,
                confirmText: 'Deactivate Account',
                cancelText: 'Cancel',
                onConfirm: async () => {
                    if (externalSetConfirmModal) {
                        externalSetConfirmModal(null);
                    } else {
                        setConfirmModal(null);
                    }
                    try {
                        await apiClient.put(API.staffSetActive(staffMember._id), { active: false });
                        if (showToast) showToast('Activation link disabled. Member stays inactive until you add them again.', 'success');
                        await fetchStaff();
                    } catch (error) {
                        if (showToast) showToast(error.response?.data?.error || 'Failed to deactivate.', 'error');
                    }
                },
                onCancel: () => {
                    if (externalSetConfirmModal) {
                        externalSetConfirmModal(null);
                    } else {
                        setConfirmModal(null);
                    }
                },
            });
            return;
        }

        // If activating, do it directly without confirmation
        if (!staffMember.active) {
            try {
                await apiClient.put(API.staffSetActive(staffMember._id), { active: true });
                if (showToast) showToast('Staff account activated successfully.', 'success');
                await fetchStaff();
            } catch (error) {
                if (showToast) showToast(error.response?.data?.error || 'Failed to activate account.', 'error');
            }
            return;
        }
        
        // If deactivating, show confirmation modal
        const showModal = externalSetConfirmModal || setConfirmModal;
        showModal({
            message: `Deactivate ${staffMember.name}? They will be logged out immediately and cannot access the store until you reactivate their account. You can reactivate or delete them later from this list.`,
            confirmText: 'Deactivate Account',
            cancelText: 'Cancel',
            onConfirm: async () => {
                if (externalSetConfirmModal) {
                    externalSetConfirmModal(null);
                } else {
                    setConfirmModal(null);
                }
                try {
                    await apiClient.put(API.staffSetActive(staffMember._id), { active: false });
                    if (showToast) showToast('Staff account deactivated successfully.', 'success');
                    await fetchStaff();
                } catch (error) {
                    if (showToast) showToast(error.response?.data?.error || 'Failed to deactivate account.', 'error');
                }
            },
            onCancel: () => {
                if (externalSetConfirmModal) {
                    externalSetConfirmModal(null);
                } else {
                    setConfirmModal(null);
                }
            }
        });
    };
    
    const handleRemoveStaff = (staffMember) => {
        if (!hasWriteAccess || staffMember.role === 'owner') return;

        const showModal = externalSetConfirmModal || setConfirmModal;
        const isPendingActivation =
            staffMember.passwordSetupStatus === 'pending' && !staffMember.active;
        showModal({
            message: isPendingActivation
                ? `Permanently remove ${staffMember.name}. They have not activated their account yet. This deletes their pending login and team record. This cannot be undone.`
                : `Permanently delete ${staffMember.name}. All their data (attendance, etc.) will be removed from the database and they will not be able to log in again. This cannot be undone.`,
            onConfirm: async () => {
                if (externalSetConfirmModal) {
                    externalSetConfirmModal(null);
                } else {
                    setConfirmModal(null);
                }
                try {
                    await apiClient.delete(API.staffDelete(staffMember._id)); 
                    if (showToast) showToast('Staff member removed.', 'success');
                    await fetchStaff();
                } catch (error) {
                    if (showToast) showToast('Removal failed.', 'error');
                }
            },
            onCancel: () => {
                if (externalSetConfirmModal) {
                    externalSetConfirmModal(null);
                } else {
                    setConfirmModal(null);
                }
            }
        });
    };
    

    const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const headerBg = darkMode ? 'bg-gray-950' : 'bg-white';
    const borderStyle = darkMode ? 'border-slate-800/60' : 'border-slate-200';
    const orderedStaff = useMemo(() => {
        const getId = (s) => (s?._id != null ? String(s._id) : '');
        return [...staff].sort((a, b) => {
            if (a.role === 'owner' && b.role !== 'owner') return -1;
            if (b.role === 'owner' && a.role !== 'owner') return 1;
            const aWorking = activeStaffIds.has(getId(a));
            const bWorking = activeStaffIds.has(getId(b));
            if (aWorking !== bWorking) return aWorking ? -1 : 1;
            return String(a?.name || '').localeCompare(String(b?.name || ''));
        });
    }, [staff, activeStaffIds]);
    const workingStaff = orderedStaff.filter((s) => s.role !== 'owner' && activeStaffIds.has(String(s._id || '')));
    const nonWorkingStaff = orderedStaff.filter((s) => !(s.role !== 'owner' && activeStaffIds.has(String(s._id || ''))));
    const existingShifts = useMemo(() => {
        const shiftByKey = new Map();
        (staff || []).forEach((s) => {
            const shiftName = String(s?.workSchedule?.shiftName || '').trim();
            const punchInStart = String(s?.workSchedule?.punchInStart || '').trim();
            const punchInEnd = String(s?.workSchedule?.punchInEnd || '').trim();
            if (!shiftName) return;
            const key = shiftName.toLowerCase();
            if (!shiftByKey.has(key)) {
                shiftByKey.set(key, {
                    key,
                    name: shiftName,
                    punchInStart,
                    punchInEnd
                });
            }
        });
        return Array.from(shiftByKey.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [staff]);
    const formatWorkedTime = (minutes) => {
        const totalMinutes = Math.max(0, Number(minutes || 0));
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${m}m`;
    };

    if (isLoading && !hasLoadedOnce) {
        return <TeamManagementInitialSkeleton darkMode={darkMode} />;
    }

    return (
        <div className={`h-full flex flex-col min-h-0 transition-colors duration-300 ${themeBase}`}>
            {/* --- RESPONSIVE STICKY HEADER --- */}
            <header className={`sticky top-0 z-[100] shrink-0 backdrop-blur-xl border-b px-4 md:px-6 py-4 transition-colors ${headerBg} ${borderStyle} shadow-lg ${darkMode ? 'bg-gray-950/95' : 'bg-white/95'}`}>
                <div className="max-w-7xl mx-auto space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <h1 className={`text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Team <span className="text-indigo-500">Management</span>
                            </h1>
                            <p className={`text-[9px] font-black tracking-[0.2em] mt-0.5 md:mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Access control & permissions management.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowManagementTabs((prev) => !prev)}
                            className={`p-2.5 rounded-xl border transition-all shrink-0 ${darkMode ? 'bg-gray-900 border-gray-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'}`}
                            title={showManagementTabs ? 'Hide controls' : 'Show controls'}
                            aria-label={showManagementTabs ? 'Hide controls' : 'Show controls'}
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                    </div>

                    {showManagementTabs && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                            <div className={`rounded-xl border p-1 flex gap-1 min-w-0 flex-1 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setManagementTab('team')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black tracking-widest ${managementTab === 'team' ? 'bg-indigo-600 text-white' : (darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')}`}
                                >
                                    Team
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setManagementTab('salary')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black tracking-widest ${managementTab === 'salary' ? 'bg-indigo-600 text-white' : (darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')}`}
                                >
                                    Salary Reports
                                </button>
                                {hasOwnerAccess && (
                                    <button
                                        type="button"
                                        onClick={() => setManagementTab('permissions')}
                                        className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black tracking-widest ${managementTab === 'permissions' ? 'bg-indigo-600 text-white' : (darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')}`}
                                    >
                                        Permissions
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-32">
                {hasOwnerAccess && ENABLE_ROLE_PERMISSIONS_SHORTCUT && (
                    <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div>
                            <p className={`text-[10px] font-black tracking-widest uppercase ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Role Page Access</p>
                            <p className={`text-[11px] font-bold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Configure Manager/Cashier page permissions.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onOpenRolePermissions}
                            className="px-3 py-2 rounded-lg text-[10px] font-black tracking-widest bg-indigo-600 text-white hover:bg-indigo-500"
                        >
                            Open
                        </button>
                    </div>
                )}
                {hasOwnerAccess && managementTab === 'permissions' && (
                    <div className={`rounded-xl md:rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <div className={`px-4 md:px-5 py-3 border-b flex items-center justify-between ${borderStyle}`}>
                            <div>
                                <p className={`text-[10px] font-black tracking-[0.2em] uppercase ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Grant Permissions</p>
                                <p className={`text-[11px] font-bold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Control page access for Manager and Cashier. Messages, notifications, profile, and settings are always available to staff.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGrantPermissions((v) => !v)}
                                className={`px-3 py-2 rounded-lg text-[10px] font-black tracking-widest ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                {showGrantPermissions ? 'Hide' : 'Open'}
                            </button>
                        </div>
                        {showGrantPermissions && (
                            <div className="p-3 md:p-4">
                                <div className={`grid grid-cols-12 px-3 py-2.5 rounded-lg text-[9px] font-black tracking-widest uppercase ${darkMode ? 'bg-slate-950 border border-slate-800 text-slate-500' : 'bg-slate-50 border border-slate-200 text-slate-500'}`}>
                                    <div className="col-span-6">Page</div>
                                    <div className="col-span-3 text-center">Manager</div>
                                    <div className="col-span-3 text-center">Cashier</div>
                                </div>
                                <div className="mt-2 rounded-lg border overflow-hidden">
                                    {GRANTABLE_PERMISSION_PAGE_LABELS.map((page) => (
                                        <div key={page.id} className={`grid grid-cols-12 items-center px-3 py-2.5 border-b last:border-b-0 ${darkMode ? 'border-slate-800 bg-slate-900/30' : 'border-slate-100 bg-white'}`}>
                                            <div className={`col-span-6 text-[12px] font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>{page.label}</div>
                                            <div className="col-span-3 flex justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={rolePagePermissions?.manager?.[page.id] === true}
                                                    onChange={() => toggleRolePermission('manager', page.id)}
                                                    className="h-4 w-4 accent-indigo-600"
                                                />
                                            </div>
                                            <div className="col-span-3 flex justify-center">
                                                {roleCanConfigurePage(page, 'cashier') ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={rolePagePermissions?.cashier?.[page.id] === true}
                                                        onChange={() => toggleRolePermission('cashier', page.id)}
                                                        className="h-4 w-4 accent-indigo-600"
                                                    />
                                                ) : (
                                                    <span
                                                        className={`text-[10px] font-black tabular-nums ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}
                                                        aria-hidden
                                                    >
                                                        —
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSaveRolePermissions}
                                        disabled={isSavingRolePermissions || isLoading}
                                        className="px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-[10px] font-black tracking-widest hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isSavingRolePermissions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                        {isSavingRolePermissions ? 'Saving...' : 'Save Permissions'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {!hasOwnerAccess && hasWriteAccess && (
                    <div className={`rounded-xl border px-4 py-3 ${darkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                        <p className="text-[10px] font-black tracking-[0.2em] uppercase">Permissions</p>
                        <p className={`text-[11px] font-bold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Only owner can manage role and individual permissions.
                        </p>
                    </div>
                )}
                {managementTab === 'salary' && (
                    <div className={`rounded-xl md:rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} p-3 md:p-4 space-y-3`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className={`inline-flex p-1 rounded-lg ${darkMode ? 'bg-slate-950 border border-slate-800' : 'bg-slate-100 border border-slate-200'}`}>
                                <button
                                    type="button"
                                    onClick={() => setSalaryTab('report')}
                                    className={`px-3 py-1.5 rounded text-[10px] font-black tracking-wider ${salaryTab === 'report' ? 'bg-indigo-600 text-white' : (darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')}`}
                                >
                                    Individual Salary Report
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSalaryTab('history')}
                                    className={`px-3 py-1.5 rounded text-[10px] font-black tracking-wider ${salaryTab === 'history' ? 'bg-indigo-600 text-white' : (darkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200')}`}
                                >
                                    Paid Salary History
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={downloadPayrollStatement}
                                title="Download Statement"
                                aria-label="Download Statement"
                                className={`h-8 w-8 rounded-lg border flex items-center justify-center ${
                                    darkMode
                                        ? 'bg-white text-slate-900 border-slate-300 hover:bg-slate-100'
                                        : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-100'
                                }`}
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                        {salaryTab === 'report' && orderedStaff.filter((s) => s.role !== 'owner').map((member) => {
                            const totalSalary = Number(member?.payrollSummary?.totalSalary || 0);
                            const salaryMode = String(member?.compensation?.salaryMode || 'none');
                            const rate = Number(member?.compensation?.amount || 0);
                            return (
                                <div key={`salary-${member._id}`} className={`rounded-xl border p-3 ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{member.name}</p>
                                            <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {salaryMode === 'hourly' ? `Hourly: Rs ${rate}` : salaryMode === 'daily' ? `Daily: Rs ${rate}` : 'No salary mode'}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-black px-2 py-1 rounded ${darkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                            Rs {totalSalary.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Worked: {member?.payrollSummary?.totalDays || 0} days, {formatWorkedTime(member?.payrollSummary?.totalMinutes || 0)}
                                        </p>
                                            {Number(member?.payrollSummary?.overtimeMinutes || 0) > 0 && (
                                                <p className={`text-[10px] font-bold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                                    OT: {formatWorkedTime(member?.payrollSummary?.overtimeMinutes || 0)}
                                                </p>
                                            )}
                                            {Number(member?.payrollSummary?.carryForwardIn || 0) > 0 && (
                                                <p className={`text-[10px] font-bold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                                    Includes previous remaining: Rs {Number(member?.payrollSummary?.carryForwardIn || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                </p>
                                            )}
                                        <div className="flex items-center gap-2">
                                            {member?.payrollSummary?.attachmentUrl && (
                                                <a
                                                    href={member.payrollSummary.attachmentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] font-black tracking-wider border ${darkMode ? 'border-slate-700 text-slate-300 hover:text-indigo-300' : 'border-slate-300 text-slate-700 hover:text-indigo-700'}`}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    Preview
                                                </a>
                                            )}
                                            {salaryMode !== 'none' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (member?.payrollSummary?.isSettled) {
                                                            handleUpdatePayrollSettlement(member, {
                                                                month: member?.payrollSummary?.month,
                                                                paid: false,
                                                                amount: totalSalary
                                                            });
                                                            return;
                                                        }
                                                        openPayrollSettlementModal(member, member?.payrollSummary?.month);
                                                    }}
                                                    disabled={payrollUpdatingId === String(member._id)}
                                                    className="px-2 py-1 rounded text-[9px] font-black tracking-wider bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60"
                                                >
                                                    {payrollUpdatingId === String(member._id) ? 'Saving...' : (member?.payrollSummary?.isSettled ? 'Mark Unsettled' : 'Mark Settled')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {salaryTab === 'history' && (
                        <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
                            <p className={`text-[10px] font-black tracking-[0.2em] uppercase mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Paid Salary History</p>
                            {payrollStatementRows.length === 0 ? (
                                <p className={`text-[11px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No settled salary records yet.</p>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                    {payrollStatementRows.map((row, idx) => (
                                        <div key={`${row.staffId}-${row.month}-${idx}`} className={`rounded-lg border px-3 py-2 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-[11px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{row.staffName}</p>
                                                <span className={`text-[10px] font-black ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Rs {Number(row.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {row.month} · {row.salaryMode} · Settled {row.paidAt ? new Date(row.paidAt).toLocaleDateString('en-IN') : ''}
                                            </p>
                                            {Number(row.calculatedAmount || 0) > 0 && Number(row.calculatedAmount) !== Number(row.amount || 0) && (
                                                <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    Due {formatRs(row.calculatedAmount)} · Paid {formatRs(row.amount)}
                                                </p>
                                            )}
                                            <p className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                Marked by: {row.settledByName || 'Unknown'}{row.settledByRole ? ` (${row.settledByRole})` : ''}
                                            </p>
                                            {Number(row.carryForwardAmount || 0) > 0 && (
                                                <p className={`text-[10px] font-bold ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                                                    Remaining Rs {Number(row.carryForwardAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} moved to {row.carryForwardMonth || 'next month'}
                                                </p>
                                            )}
                                            {row.attachmentUrl && (
                                                <a
                                                    href={row.attachmentUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`mt-1 inline-flex items-center gap-1 text-[10px] font-black ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    {row.attachmentName ? `Preview: ${row.attachmentName}` : 'Preview Attachment'}
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                )}
                {/* Staff List */}
                {managementTab === 'team' && (isLoading ? (
                    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl border ${cardBase}`}>
                        <TeamDirectorySkeleton darkMode={darkMode} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                        {!hasReadAccess ? (
                            <div className={`p-6 md:p-8 text-center rounded-xl md:rounded-2xl border ${cardBase}`}>
                                <ShieldAlert className="w-10 h-10 md:w-12 md:h-12 text-red-500 mx-auto mb-4" />
                                <p className={`text-base md:text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Access Denied</p>
                                <p className={`text-xs md:text-sm font-bold mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Elevated privileges required to view directory.</p>
                            </div>
                        ) : staff.length === 0 ? (
                            <div className={`p-12 md:p-20 text-center rounded-xl md:rounded-2xl border ${cardBase}`}>
                                <Users className={`w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} />
                                <p className={`text-sm md:text-base font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No active staff found in directory.</p>
                            </div>
                        ) : (
                            <>
                                {workingStaff.length > 0 && (
                                    <div className={`rounded-xl border px-3 py-2 ${darkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <p className={`text-[10px] font-black tracking-widest uppercase ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                            Currently Working ({workingStaff.length})
                                        </p>
                                    </div>
                                )}
                                {workingStaff.map((s) => {
                                const isActionDisabled = !hasWriteAccess || s.role === 'owner';
                                const isPendingActivation = s.passwordSetupStatus === 'pending' && !s.active;
                                const staffIdKey = s._id != null ? String(s._id) : '';
                                const isCurrentlyActive = staffIdKey ? activeStaffIds.has(staffIdKey) : false;
                                const att = staffIdKey ? activeStaffMap[staffIdKey] : null;
                                const punchInTime = att?.punchIn;
                                const isOnBreak = att?.onBreak || false;
                                const breakStart = att?.breakStart || null;
                                const breakDurationMinutes = att?.breakDurationMinutes ?? 0;
                                return (
                                    <StaffStatusButton
                                        key={s._id}
                                        staff={s}
                                        isActionDisabled={isActionDisabled}
                                        isPendingActivation={isPendingActivation}
                                        onToggleActive={handleToggleActive}
                                        onEdit={(staff) => {
                                            setSelectedStaff(staff);
                                            setIsEditModalOpen(true);
                                        }}
                                        onRemove={handleRemoveStaff}
                                        darkMode={darkMode}
                                        borderStyle={borderStyle}
                                        cardBase={cardBase}
                                        apiClient={apiClient}
                                        API={API}
                                        showToast={showToast}
                                        isCurrentlyActive={isCurrentlyActive}
                                        punchInTime={punchInTime}
                                        isOnBreak={isOnBreak}
                                        breakStart={breakStart}
                                        breakDurationMinutes={breakDurationMinutes}
                                        canManageWorkHours={hasWriteAccess}
                                        onSaveWorkSchedule={handleSaveStaffWorkSchedule}
                                        isSavingWorkSchedule={scheduleUpdatingId === String(s._id)}
                                        onUpdatePayrollSettlement={handleUpdatePayrollSettlement}
                                        isUpdatingPayrollSettlement={payrollUpdatingId === String(s._id)}
                                        existingShifts={existingShifts}
                                        currentUser={currentUser}
                                    />
                                );
                                })}
                                {nonWorkingStaff.length > 0 && (
                                    <div className={`rounded-xl border px-3 py-2 ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                                        <p className={`text-[10px] font-black tracking-widest uppercase ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                            Offline / Inactive ({nonWorkingStaff.length})
                                        </p>
                                    </div>
                                )}
                                {nonWorkingStaff.map((s) => {
                                const isActionDisabled = !hasWriteAccess || s.role === 'owner';
                                const isPendingActivation = s.passwordSetupStatus === 'pending' && !s.active;
                                const staffIdKey = s._id != null ? String(s._id) : '';
                                const isCurrentlyActive = staffIdKey ? activeStaffIds.has(staffIdKey) : false;
                                const att = staffIdKey ? activeStaffMap[staffIdKey] : null;
                                const punchInTime = att?.punchIn;
                                const isOnBreak = att?.onBreak || false;
                                const breakStart = att?.breakStart || null;
                                const breakDurationMinutes = att?.breakDurationMinutes ?? 0;
                                return (
                                    <StaffStatusButton
                                        key={s._id}
                                        staff={s}
                                        isActionDisabled={isActionDisabled}
                                        isPendingActivation={isPendingActivation}
                                        onToggleActive={handleToggleActive}
                                        onEdit={(staff) => {
                                            setSelectedStaff(staff);
                                            setIsEditModalOpen(true);
                                        }}
                                        onRemove={handleRemoveStaff}
                                        darkMode={darkMode}
                                        borderStyle={borderStyle}
                                        cardBase={cardBase}
                                        apiClient={apiClient}
                                        API={API}
                                        showToast={showToast}
                                        isCurrentlyActive={isCurrentlyActive}
                                        punchInTime={punchInTime}
                                        isOnBreak={isOnBreak}
                                        breakStart={breakStart}
                                        breakDurationMinutes={breakDurationMinutes}
                                        canManageWorkHours={hasWriteAccess}
                                        onSaveWorkSchedule={handleSaveStaffWorkSchedule}
                                        isSavingWorkSchedule={scheduleUpdatingId === String(s._id)}
                                        onUpdatePayrollSettlement={handleUpdatePayrollSettlement}
                                        isUpdatingPayrollSettlement={payrollUpdatingId === String(s._id)}
                                        existingShifts={existingShifts}
                                        currentUser={currentUser}
                                    />
                                );
                                })}
                            </>
                        )}
                    </div>
                ))}
            </div>
            </div>

            {managementTab === 'team' && hasWriteAccess && (
            <button 
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                disabled={isLoading}
                className="fixed bottom-[calc(var(--app-mobile-footer-offset)+0.75rem)] md:bottom-6 right-4 z-[60] w-14 h-14 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/50 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center hover:shadow-indigo-600/60 disabled:opacity-50"
                aria-label="Add new staff member"
            >
                <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
            )}
            
            <AddStaffModal 
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setAddStaffError(null); // Clear error when closing modal
                }}
                onAddStaff={handleAddStaff}
                isSubmitting={isProcessing}
                darkMode={darkMode}
                error={addStaffError}
                onUpgradePlan={onUpgradePlan}
            />

            <EditRoleModal 
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedStaff(null);
                }}
                staffMember={selectedStaff}
                onUpdateRole={handleUpdateRole}
                isSubmitting={isProcessing}
                darkMode={darkMode}
                canEditRole={hasOwnerAccess}
            />

            <PayrollSettlementModal
                isOpen={Boolean(payrollSettlementModal)}
                darkMode={darkMode}
                staffMember={payrollSettlementModal ? {
                    name: payrollSettlementModal.staffName,
                    salaryMode: payrollSettlementModal.salaryMode,
                    salaryRate: payrollSettlementModal.salaryRate,
                    totalMinutes: payrollSettlementModal.totalMinutes,
                    overtimeMinutes: payrollSettlementModal.overtimeMinutes,
                    totalDays: payrollSettlementModal.totalDays
                } : null}
                month={payrollSettlementModal?.month || ''}
                amount={payrollSettlementModal?.amount || 0}
                baseSalary={payrollSettlementModal?.baseSalary || 0}
                otSalary={payrollSettlementModal?.otSalary || 0}
                carryForwardIn={payrollSettlementModal?.carryForwardIn || 0}
                settlementPreset={payrollSettlementPreset}
                setSettlementPreset={setPayrollSettlementPreset}
                settlementAmount={payrollSettlementAmount}
                setSettlementAmount={setPayrollSettlementAmount}
                notes={payrollSettlementNotes}
                setNotes={setPayrollSettlementNotes}
                attachmentFile={payrollSettlementAttachment}
                setAttachmentFile={setPayrollSettlementAttachment}
                attachmentPreviewUrl={payrollAttachmentPreviewUrl}
                onClose={closePayrollSettlementModal}
                onConfirm={confirmPayrollSettlement}
                isSubmitting={Boolean(payrollSettlementModal?.staffId) && (
                    payrollUpdatingId === String(payrollSettlementModal?.staffId)
                    || payrollConfirmingId === String(payrollSettlementModal?.staffId)
                )}
            />

            {/* Confirmation Modal for Deactivation and Deletion */}
            {confirmModal && !externalSetConfirmModal && (
                <ConfirmationModal 
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={confirmModal.onCancel}
                    darkMode={darkMode}
                    confirmText={confirmModal.confirmText || 'Confirm'}
                    cancelText={confirmModal.cancelText || 'Cancel'}
                />
            )}
        </div>
    );
};

export default StaffPermissionsManager;
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Briefcase, ChevronDown, IndianRupee, Tag, Plus } from 'lucide-react';

const getRoleStyles = (role, darkMode) => {
  switch (role) {
    case 'owner':
      return darkMode ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' : 'text-purple-700 bg-purple-100 border-purple-200';
    case 'Manager':
      return darkMode ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 'text-indigo-700 bg-indigo-100 border-indigo-200';
    default:
      return darkMode ? 'text-slate-400 bg-slate-800 border-slate-700' : 'text-slate-600 bg-slate-100 border-slate-200';
  }
};

const formatTime12Hour = (value) => {
  const text = String(value || '').trim();
  const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return '—';
  const hour24 = Number(match[1]);
  const minute = match[2];
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${period}`;
};

/**
 * Centered dialog (portaled to document.body), viewport-safe height — work schedule and pay.
 */
export default function WorkProfileModal({
  isOpen,
  onClose,
  staff,
  darkMode,
  scheduleForm,
  setScheduleForm,
  existingShifts = [],
  existingShiftMap,
  canManageWorkHours,
  onSaveWorkSchedule,
  isSavingWorkSchedule,
  showToast,
}) {
  const [shiftPickerOpen, setShiftPickerOpen] = useState(false);
  /** When null, dropdown shows all team shifts; set only while user types to search. */
  const [shiftSearchQuery, setShiftSearchQuery] = useState(null);
  const [profileTab, setProfileTab] = useState('shift');
  const shiftComboRef = useRef(null);
  const shiftNameInputRef = useRef(null);

  const shiftList = useMemo(() => (Array.isArray(existingShifts) ? existingShifts : []), [existingShifts]);

  const filteredShifts = useMemo(() => {
    const q = shiftSearchQuery;
    if (q == null || q === '') return shiftList;
    return shiftList.filter((s) => String(s?.name || '').toLowerCase().includes(q));
  }, [shiftList, shiftSearchQuery]);

  const openShiftPicker = useCallback(() => {
    setShiftSearchQuery(null);
    setShiftPickerOpen(true);
  }, []);

  useEffect(() => {
    if (!shiftPickerOpen) return undefined;
    const onPointerDown = (e) => {
      if (shiftComboRef.current && !shiftComboRef.current.contains(e.target)) {
        setShiftPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [shiftPickerOpen]);

  useEffect(() => {
    if (!isOpen) {
      setShiftPickerOpen(false);
      setShiftSearchQuery(null);
      setProfileTab('shift');
    }
  }, [isOpen]);

  const applyShiftTemplate = useCallback(
    (selectedShift) => {
      if (!selectedShift) return;
      const end = String(selectedShift.punchInEnd || '').trim();
      setScheduleForm((p) => ({
        ...p,
        shiftName: selectedShift.name,
        punchInStart: selectedShift.punchInStart || '',
        punchInEnd: end,
        autoPunchOutTime: end,
      }));
      setShiftSearchQuery(null);
      setShiftPickerOpen(false);
    },
    [setScheduleForm]
  );

  const startAddNewShift = useCallback(() => {
    setScheduleForm((p) => ({ ...p, shiftName: '' }));
    setShiftSearchQuery('');
    setShiftPickerOpen(false);
    setTimeout(() => {
      const el = shiftNameInputRef.current;
      if (!el) return;
      el.focus();
      el.select?.();
    }, 0);
  }, [setScheduleForm]);

  if (!isOpen || !staff) return null;

  const startOk = Boolean(String(scheduleForm.punchInStart || '').trim());
  const endOk = Boolean(String(scheduleForm.punchInEnd || '').trim());
  const partialShift = (startOk || endOk) && !(startOk && endOk);
  const canSaveShift = !isSavingWorkSchedule && !partialShift;

  const sheetBg = darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const inputClass = darkMode
    ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-600'
    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';
  const labelClass = darkMode ? 'text-slate-400' : 'text-slate-600';
  const sectionClass = darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80';

  const handleSave = async () => {
    if (partialShift) {
      showToast?.('Set both expected punch-in and punch-out times, or clear both to turn off reminders.', 'error');
      return;
    }
    const normalizedName = String(scheduleForm.shiftName || '').trim();
    const key = normalizedName.toLowerCase();
    const matchedShift = key ? existingShiftMap?.get?.(key) : null;
    const end = String(scheduleForm.punchInEnd || '').trim();
    const start = String(scheduleForm.punchInStart || '').trim();
    const hasShiftWindow = Boolean(start && end);
    const normalizedForm = {
      ...scheduleForm,
      punchInStart: start,
      punchInEnd: end,
      autoPunchOutTime: end,
      enabled: hasShiftWindow,
      shiftName: matchedShift?.name || normalizedName,
    };
    const saved = await onSaveWorkSchedule?.(staff, normalizedForm);
    if (saved) onClose?.();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="work-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close work profile"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-lg md:max-w-xl min-w-0 max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${sheetBg}`}
      >
        <header
          className={`flex-shrink-0 flex items-start justify-between gap-3 px-4 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50/90'}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${getRoleStyles(staff.role, darkMode)}`}
            >
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="work-profile-title" className={`text-base font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Work profile
              </h2>
              <p className={`text-xs font-bold truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{staff.name}</p>
              <p className={`text-[10px] font-bold truncate mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{staff.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`touch-manipulation shrink-0 rounded-xl p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center ${darkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 py-4 space-y-4">

          {canManageWorkHours && staff.role !== 'owner' && (
            <>
              <div
                role="tablist"
                aria-label="Work profile sections"
                className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={profileTab === 'shift'}
                  onClick={() => {
                    setProfileTab('shift');
                    setShiftPickerOpen(false);
                  }}
                  className={`touch-manipulation flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-2 text-[11px] font-black tracking-wide transition-all ${
                    profileTab === 'shift'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : darkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" aria-hidden />
                  Shift
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={profileTab === 'pay'}
                  onClick={() => {
                    setProfileTab('pay');
                    setShiftPickerOpen(false);
                  }}
                  className={`touch-manipulation flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-2 text-[11px] font-black tracking-wide transition-all ${
                    profileTab === 'pay'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : darkMode
                        ? 'text-slate-400 hover:text-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <IndianRupee className="w-4 h-4 shrink-0" aria-hidden />
                  Salary
                </button>
              </div>

              {profileTab === 'shift' && (
              <section
                role="tabpanel"
                aria-label="Shift schedule"
                className={`rounded-xl border p-3 sm:p-4 space-y-4 min-w-0 overflow-hidden ${sectionClass}`}
              >
                <div className="min-w-0">
                  <label
                    htmlFor={`work-profile-shift-name-${staff?._id || 's'}`}
                    className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}
                  >
                    Shift name
                  </label>
                  <div ref={shiftComboRef} className="relative mt-1.5 min-w-0">
                    <div
                      className={`flex min-h-[48px] items-stretch rounded-xl border overflow-hidden shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/35 ${
                        darkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span
                        className={`flex shrink-0 items-center justify-center border-r px-2.5 ${darkMode ? 'border-slate-800 bg-slate-900/80 text-indigo-400' : 'border-slate-100 bg-slate-50 text-indigo-600'}`}
                        aria-hidden
                      >
                        <Tag className="w-4 h-4" />
                      </span>
                      <input
                        ref={shiftNameInputRef}
                        id={`work-profile-shift-name-${staff?._id || 's'}`}
                        type="text"
                        value={scheduleForm.shiftName}
                        onChange={(e) => {
                          const v = e.target.value;
                          setScheduleForm((p) => ({ ...p, shiftName: v }));
                          setShiftSearchQuery(String(v).trim().toLowerCase());
                          setShiftPickerOpen(true);
                        }}
                        onFocus={openShiftPicker}
                        placeholder="Search team shifts or type a new name"
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={shiftPickerOpen}
                        aria-controls={`work-profile-shift-list-${staff?._id || 's'}`}
                        aria-autocomplete="list"
                        className={`min-w-0 flex-1 border-0 bg-transparent py-2.5 pl-3 pr-2 text-sm font-bold outline-none ring-0 placeholder:font-bold ${
                          darkMode ? 'text-white placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'
                        }`}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={shiftPickerOpen ? 'Close shift list' : 'Open shift list'}
                        aria-expanded={shiftPickerOpen}
                        onClick={() => {
                          if (shiftPickerOpen) {
                            setShiftPickerOpen(false);
                          } else {
                            openShiftPicker();
                          }
                        }}
                        className={`touch-manipulation shrink-0 px-2.5 transition-colors ${darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${shiftPickerOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {shiftPickerOpen && (
                      <div
                        id={`work-profile-shift-list-${staff?._id || 's'}`}
                        role="listbox"
                        className={`absolute left-0 right-0 top-full z-30 mt-1.5 max-h-64 overflow-hidden rounded-xl border shadow-xl ring-1 ring-black/5 ${
                          darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={startAddNewShift}
                          className={`flex w-full items-center gap-2.5 border-b px-3 py-2.5 text-left text-sm font-black transition-colors ${
                            darkMode
                              ? 'border-slate-800 bg-slate-950/80 text-indigo-300 hover:bg-indigo-500/10'
                              : 'border-slate-100 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-50'
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                              darkMode ? 'border-indigo-500/30 bg-indigo-500/15' : 'border-indigo-200 bg-white'
                            }`}
                          >
                            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                          </span>
                          <span>Add new shift</span>
                          <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Type name
                          </span>
                        </button>

                        {shiftList.length === 0 ? (
                          <div className={`px-3 py-3 text-[11px] font-bold leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            No shifts from your team yet. Use &ldquo;Add new shift&rdquo; above, then set punch-in and punch-out below.
                          </div>
                        ) : filteredShifts.length === 0 ? (
                          <div className={`px-3 py-3 text-[11px] font-bold leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            No matching shift. Saving will use <span className="text-indigo-500">&ldquo;{String(scheduleForm.shiftName || '').trim() || '…'}&rdquo;</span> as a new name.
                          </div>
                        ) : (
                          <ul className="custom-scrollbar max-h-[13.5rem] overflow-y-auto py-1">
                            {filteredShifts.map((shift) => (
                              <li key={shift.key} role="presentation">
                                <button
                                  type="button"
                                  role="option"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => applyShiftTemplate(shift)}
                                  className={`flex w-full flex-col gap-1.5 px-3 py-2.5 text-left transition-colors ${
                                    darkMode
                                      ? 'hover:bg-indigo-500/15 active:bg-indigo-500/25'
                                      : 'hover:bg-indigo-50 active:bg-indigo-100/80'
                                  }`}
                                >
                                  <span className={`truncate text-sm font-black ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{shift.name}</span>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-black tabular-nums tracking-wide ${
                                        darkMode
                                          ? 'border-slate-700 bg-slate-950 text-cyan-300'
                                          : 'border-slate-200 bg-slate-50 text-indigo-600'
                                      }`}
                                    >
                                      <span className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        In
                                      </span>
                                      {formatTime12Hour(shift.punchInStart)}
                                    </span>
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-black tabular-nums tracking-wide ${
                                        darkMode
                                          ? 'border-slate-700 bg-slate-950 text-violet-300'
                                          : 'border-slate-200 bg-slate-50 text-violet-600'
                                      }`}
                                    >
                                      <span className={`text-[8px] font-black uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Out
                                      </span>
                                      {formatTime12Hour(shift.punchInEnd)}
                                    </span>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-w-0 overflow-hidden md:grid md:grid-cols-2 md:gap-4">
                  <div className="min-w-0 w-full overflow-hidden">
                    <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Expected punch-in</label>
                    <input
                      type="time"
                      value={scheduleForm.punchInStart}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, punchInStart: e.target.value }))}
                      className={`mt-1 block w-full min-w-0 max-w-full box-border min-h-[44px] px-2 py-2 rounded-xl border text-base font-bold tabular-nums leading-normal appearance-none [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-datetime-edit]:min-w-0 ${inputClass}`}
                    />
                    <p className={`mt-1 text-[10px] font-bold tabular-nums truncate ${darkMode ? 'text-cyan-300' : 'text-indigo-600'}`}>
                      {formatTime12Hour(scheduleForm.punchInStart)}
                    </p>
                  </div>
                  <div className="min-w-0 w-full overflow-hidden">
                    <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Punch out</label>
                    <input
                      type="time"
                      value={scheduleForm.punchInEnd}
                      onChange={(e) =>
                        setScheduleForm((p) => ({
                          ...p,
                          punchInEnd: e.target.value,
                          autoPunchOutTime: e.target.value,
                        }))
                      }
                      className={`mt-1 block w-full min-w-0 max-w-full box-border min-h-[44px] px-2 py-2 rounded-xl border text-base font-bold tabular-nums leading-normal appearance-none [&::-webkit-datetime-edit-fields-wrapper]:p-0 [&::-webkit-datetime-edit]:min-w-0 ${inputClass}`}
                    />
                    <p className={`mt-1 text-[10px] font-bold tabular-nums truncate ${darkMode ? 'text-violet-300' : 'text-violet-600'}`}>
                      {formatTime12Hour(scheduleForm.punchInEnd)}
                    </p>
                  </div>
                </div>
                <p className={`text-[10px] sm:text-[11px] font-bold leading-relaxed ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  Saving punch-in and punch-out enables reminders (5 min before and at punch-in). Punch-out also sets shift end and optional auto punch-out.
                </p>
              </section>
              )}

              {profileTab === 'pay' && (
              <section
                role="tabpanel"
                aria-label="Salary"
                className={`rounded-xl border p-3 sm:p-4 space-y-3 min-w-0 ${sectionClass}`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="min-w-0">
                    <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Salary</label>
                    <select
                      value={scheduleForm.salaryMode}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, salaryMode: e.target.value }))}
                      className={`w-full max-w-full min-w-0 box-border mt-1 min-h-[44px] px-3 py-2 rounded-xl border text-sm font-bold ${inputClass}`}
                    >
                      <option value="none">No salary</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={scheduleForm.salaryAmount}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, salaryAmount: e.target.value }))}
                      placeholder={scheduleForm.salaryMode === 'hourly' ? 'Per hour' : scheduleForm.salaryMode === 'daily' ? 'Per day' : '—'}
                      className={`w-full max-w-full min-w-0 box-border mt-1 min-h-[44px] px-3 py-2 rounded-xl border text-sm font-bold ${inputClass}`}
                    />
                  </div>
                </div>
                <p className={`text-[11px] font-bold leading-snug ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {scheduleForm.salaryMode === 'hourly' && 'Hourly rate applies to logged work time.'}
                  {scheduleForm.salaryMode === 'daily' && 'Daily rate applies per day worked.'}
                  {scheduleForm.salaryMode === 'none' && 'Salary tracking is off for this person.'}
                </p>
              </section>
              )}
            </>
          )}
        </div>

        <footer
          className={`flex-shrink-0 flex gap-2 px-4 py-3 border-t pb-[max(0.75rem,env(safe-area-inset-bottom))] ${darkMode ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-white'}`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 sm:flex-none px-4 py-3 rounded-xl text-[11px] font-black tracking-widest ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSaveShift}
            className="flex-[2] sm:flex-1 px-4 py-3 rounded-xl text-[11px] font-black tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {isSavingWorkSchedule ? 'Saving…' : 'Save work profile'}
          </button>
        </footer>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modal, document.body);
  }
  return modal;
}

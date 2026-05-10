import React from 'react';
import { X, Clock, Briefcase, ChevronDown, ArrowRight, IndianRupee } from 'lucide-react';

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
 * Full-screen sheet on mobile, centered dialog on desktop — work schedule, pay, and manager reports toggle.
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
  canManageIndividualPermissions,
  canManageWorkHours,
  onToggleReportsPermission,
  reportsPermissionUpdating,
  onSaveWorkSchedule,
  isSavingWorkSchedule,
  showToast,
}) {
  if (!isOpen || !staff) return null;

  const canSaveShift =
    Boolean(String(scheduleForm.punchInStart || '').trim() && String(scheduleForm.punchInEnd || '').trim()) &&
    !isSavingWorkSchedule;

  const sheetBg = darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const inputClass = darkMode
    ? 'bg-slate-950 border-slate-700 text-white placeholder:text-slate-600'
    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400';
  const labelClass = darkMode ? 'text-slate-400' : 'text-slate-600';
  const sectionClass = darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50/80';

  const handleSave = async () => {
    if (!scheduleForm.punchInStart || !scheduleForm.punchInEnd) {
      showToast?.('Set both shift start and end time.', 'error');
      return;
    }
    const normalizedName = String(scheduleForm.shiftName || '').trim();
    const key = normalizedName.toLowerCase();
    const matchedShift = key ? existingShiftMap?.get?.(key) : null;
    const hasShiftWindow = Boolean(scheduleForm.punchInStart && scheduleForm.punchInEnd);
    const normalizedForm = {
      ...scheduleForm,
      enabled: scheduleForm.enabled === true && hasShiftWindow,
      shiftName: matchedShift?.name || normalizedName,
    };
    const saved = await onSaveWorkSchedule?.(staff, normalizedForm);
    if (saved) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center sm:p-4"
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
        className={`relative w-full sm:max-w-lg md:max-w-xl max-h-[min(92vh,720px)] sm:max-h-[85vh] flex flex-col rounded-t-[1.25rem] sm:rounded-2xl border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 ${sheetBg}`}
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

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-5">
          {canManageIndividualPermissions && staff.role === 'Manager' && (
            <section className={`rounded-xl border p-4 ${sectionClass}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 ${labelClass}`}>Access</p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Reports section</p>
                  <p className={`text-[11px] font-bold mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Let this manager open Reports &amp; analytics.
                  </p>
                </div>
                {staff?.permissions?.reports === true && (
                  <span
                    className={`self-start text-[9px] font-black px-2 py-1 rounded-lg border tracking-widest uppercase ${darkMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}
                  >
                    On
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onToggleReportsPermission?.(staff)}
                disabled={reportsPermissionUpdating}
                className={`mt-3 w-full sm:w-auto px-4 py-3 rounded-xl text-[11px] font-black tracking-widest transition-all disabled:opacity-60 ${
                  staff?.permissions?.reports === true
                    ? darkMode
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : darkMode
                      ? 'bg-slate-800 text-slate-200 border border-slate-700'
                      : 'bg-white text-slate-800 border border-slate-200'
                }`}
              >
                {reportsPermissionUpdating ? 'Updating…' : staff?.permissions?.reports === true ? 'Turn off reports' : 'Turn on reports'}
              </button>
            </section>
          )}

          {canManageWorkHours && staff.role !== 'owner' && (
            <>
              <section className={`rounded-xl border p-4 space-y-4 ${sectionClass}`}>
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${labelClass}`}>Shift schedule</p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer touch-manipulation">
                  <input
                    type="checkbox"
                    checked={scheduleForm.enabled === true}
                    onChange={(e) => setScheduleForm((p) => ({ ...p, enabled: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-500 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`text-sm font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Use scheduled shift for reminders &amp; attendance</span>
                </label>

                <div>
                  <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Shift name</label>
                  <div className="relative mt-1.5">
                    <input
                      list={`work-profile-shift-${staff?._id || 's'}`}
                      value={scheduleForm.shiftName}
                      onChange={(e) => {
                        const value = e.target.value;
                        const selectedShift = existingShiftMap?.get?.(String(value || '').trim().toLowerCase());
                        if (selectedShift) {
                          setScheduleForm((p) => ({
                            ...p,
                            shiftName: selectedShift.name,
                            punchInStart: selectedShift.punchInStart || '',
                            punchInEnd: selectedShift.punchInEnd || '',
                            autoPunchOutTime: selectedShift.punchInEnd || '',
                          }));
                          return;
                        }
                        setScheduleForm((p) => ({ ...p, shiftName: value }));
                      }}
                      placeholder="Existing shift or new name"
                      autoComplete="off"
                      className={`w-full pl-3 pr-10 py-3 rounded-xl border text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 ${inputClass}`}
                    />
                    <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <datalist id={`work-profile-shift-${staff?._id || 's'}`}>
                      {existingShifts.map((shift) => (
                        <option key={shift.key} value={shift.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Opens</label>
                    <input
                      type="time"
                      value={scheduleForm.punchInStart}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, punchInStart: e.target.value }))}
                      className={`w-full mt-1 min-h-[48px] px-3 py-2.5 rounded-xl border text-base sm:text-sm font-black tabular-nums ${inputClass}`}
                    />
                    <p className={`mt-1 text-[11px] font-bold tabular-nums ${darkMode ? 'text-cyan-300' : 'text-indigo-600'}`}>
                      {formatTime12Hour(scheduleForm.punchInStart)}
                    </p>
                  </div>
                  <div className="hidden sm:flex pb-3 justify-center text-[10px] font-black uppercase text-slate-500">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Closes</label>
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
                      className={`w-full mt-1 min-h-[48px] px-3 py-2.5 rounded-xl border text-base sm:text-sm font-black tabular-nums ${inputClass}`}
                    />
                    <p className={`mt-1 text-[11px] font-bold tabular-nums ${darkMode ? 'text-violet-300' : 'text-violet-600'}`}>
                      {formatTime12Hour(scheduleForm.punchInEnd)}
                    </p>
                  </div>
                </div>
              </section>

              <section className={`rounded-xl border p-4 space-y-3 ${sectionClass}`}>
                <div className="flex items-center gap-2">
                  <IndianRupee className={`w-4 h-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${labelClass}`}>Pay (optional)</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Mode</label>
                    <select
                      value={scheduleForm.salaryMode}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, salaryMode: e.target.value }))}
                      className={`w-full mt-1 min-h-[48px] px-3 py-2.5 rounded-xl border text-sm font-bold ${inputClass}`}
                    >
                      <option value="none">No salary</option>
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>
                  <div>
                    <label className={`text-[10px] font-black uppercase tracking-wider ${labelClass}`}>Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={scheduleForm.salaryAmount}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, salaryAmount: e.target.value }))}
                      placeholder={scheduleForm.salaryMode === 'hourly' ? 'Per hour' : scheduleForm.salaryMode === 'daily' ? 'Per day' : '—'}
                      className={`w-full mt-1 min-h-[48px] px-3 py-2.5 rounded-xl border text-sm font-bold ${inputClass}`}
                    />
                  </div>
                </div>
                <p className={`text-[11px] font-bold leading-snug ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {scheduleForm.salaryMode === 'hourly' && 'Hourly rate applies to logged work time.'}
                  {scheduleForm.salaryMode === 'daily' && 'Daily rate applies per day worked.'}
                  {scheduleForm.salaryMode === 'none' && 'Salary tracking is off for this person.'}
                </p>
              </section>
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
}

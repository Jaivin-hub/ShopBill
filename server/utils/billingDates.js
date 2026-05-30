/** Calendar-day helpers for subscription billing. */

const DEFAULT_BILLING_TIMEZONE = 'Asia/Kolkata';

const calendarDayUtc = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/** YYYY-MM-DD in shop timezone (default India — matches “access until” copy). */
const calendarDayKeyInTimezone = (d, timeZone = DEFAULT_BILLING_TIMEZONE) => {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
};

/**
 * Inclusive last day: access through planEndDate calendar day in timezone.
 */
const hasBillingAccessInTimezone = (planEndDate, now = new Date(), timeZone = DEFAULT_BILLING_TIMEZONE) => {
    if (!planEndDate) return false;
    const endKey = calendarDayKeyInTimezone(planEndDate, timeZone);
    const todayKey = calendarDayKeyInTimezone(now, timeZone);
    if (!endKey || !todayKey) return false;
    return endKey >= todayKey;
};

const daysBetweenCalendar = (fromDate, toDate, timeZone = DEFAULT_BILLING_TIMEZONE) => {
    const fromKey = calendarDayKeyInTimezone(fromDate, timeZone);
    const toKey = calendarDayKeyInTimezone(toDate, timeZone);
    if (!fromKey || !toKey) return 0;
    const fromMs = new Date(`${fromKey}T12:00:00.000Z`).getTime();
    const toMs = new Date(`${toKey}T12:00:00.000Z`).getTime();
    return Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));
};

const formatDateKeyUtc = (d) => {
    const date = d instanceof Date ? d : new Date(d);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const formatDateInEnIn = (d, timeZone = DEFAULT_BILLING_TIMEZONE) => {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone,
    });
};

/** @deprecated App access uses planEndDate only — not used for lockout */
const GRACE_DAYS_AFTER_FAILED_PAYMENT = 10;
const UPCOMING_PAYMENT_REMINDER_DAYS = [5, 3, 1];

const addCalendarDaysUtc = (startDate, days) => {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
};

module.exports = {
    DEFAULT_BILLING_TIMEZONE,
    calendarDayUtc,
    calendarDayKeyInTimezone,
    hasBillingAccessInTimezone,
    daysBetweenCalendar,
    formatDateKeyUtc,
    formatDateInEnIn,
    addCalendarDaysUtc,
    GRACE_DAYS_AFTER_FAILED_PAYMENT,
    UPCOMING_PAYMENT_REMINDER_DAYS,
};

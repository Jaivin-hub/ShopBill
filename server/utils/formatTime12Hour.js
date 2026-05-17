/** HH:mm (24h) → h:mm AM/PM for staff-facing notifications and messages. */
const HHMM_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function formatHHmmTo12Hour(value) {
    const text = String(value || '').trim();
    if (!text) return '';
    const match = text.match(HHMM_PATTERN);
    if (!match) return text;
    const hour24 = Number(match[1]);
    const minute = match[2];
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${minute} ${period}`;
}

module.exports = { formatHHmmTo12Hour, HHMM_PATTERN };

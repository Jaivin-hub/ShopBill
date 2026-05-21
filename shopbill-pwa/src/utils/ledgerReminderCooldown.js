/** One week before the same customer can receive another ledger reminder. */
export const REMINDER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const getReminderStorageKey = (outletId) =>
  `ledger_sent_reminders_${outletId || 'default'}`;

export const pruneExpiredReminders = (map) => {
  if (!map || typeof map !== 'object') return {};
  const now = Date.now();
  const out = {};
  for (const [id, ts] of Object.entries(map)) {
    if (typeof ts === 'number' && now - ts < REMINDER_COOLDOWN_MS) {
      out[id] = ts;
    }
  }
  return out;
};

export const loadSentReminders = (outletId) => {
  try {
    const raw = localStorage.getItem(getReminderStorageKey(outletId));
    if (!raw) return {};
    return pruneExpiredReminders(JSON.parse(raw));
  } catch {
    return {};
  }
};

export const saveSentReminders = (outletId, map) => {
  try {
    const pruned = pruneExpiredReminders(map);
    localStorage.setItem(getReminderStorageKey(outletId), JSON.stringify(pruned));
    return pruned;
  } catch {
    return pruneExpiredReminders(map);
  }
};

export const isReminderOnCooldown = (customerId, sentReminders) => {
  const ts = sentReminders?.[customerId];
  if (!ts) return false;
  return Date.now() - ts < REMINDER_COOLDOWN_MS;
};

export const getReminderCooldownRemainingMs = (customerId, sentReminders) => {
  const ts = sentReminders?.[customerId];
  if (!ts) return 0;
  const remaining = REMINDER_COOLDOWN_MS - (Date.now() - ts);
  return remaining > 0 ? remaining : 0;
};

export const formatReminderCooldownTitle = (remainingMs) => {
  const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  if (days >= 2) return `Reminder sent — available again in ${days} days`;
  if (days === 1) return 'Reminder sent — available again in 1 day';
  const hours = Math.ceil(remainingMs / (60 * 60 * 1000));
  if (hours > 1) return `Reminder sent — available again in ${hours} hours`;
  return 'Reminder sent — try again later this week';
};

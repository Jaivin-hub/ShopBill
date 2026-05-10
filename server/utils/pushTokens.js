/**
 * Collect unique FCM tokens for users who have not disabled push in app settings.
 * Missing pushNotificationsEnabled is treated as enabled (backward compatible).
 */
function collectPushTokens(userDocs) {
    const tokens = [];
    for (const u of userDocs || []) {
        if (!u || u.pushNotificationsEnabled === false) continue;
        for (const d of u.deviceTokens || []) {
            if (d && typeof d.token === 'string' && d.token) tokens.push(d.token);
        }
    }
    return [...new Set(tokens)];
}

module.exports = { collectPushTokens };

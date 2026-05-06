/**
 * Firebase Admin SDK - used for sending push notifications.
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env
 */
let admin = null;

function normalizePrivateKey(input) {
    if (!input || typeof input !== 'string') return '';
    let key = input.trim();
    // Strip accidental wrapping quotes from env panels
    key = key.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    // Support escaped newlines from env values
    key = key.replace(/\\n/g, '\n');
    // Support base64-encoded private key as fallback
    if (!key.includes('BEGIN PRIVATE KEY')) {
        try {
            const decoded = Buffer.from(key, 'base64').toString('utf8');
            if (decoded.includes('BEGIN PRIVATE KEY')) {
                key = decoded;
            }
        } catch {
            // keep original key if decode fails
        }
    }
    return key;
}

function getAdmin() {
    if (admin) return admin;
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.warn('[Push] Firebase Admin not configured: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
        return null;
    }
    try {
        const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim();
        const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
        const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
        console.log(`[Push] Firebase env check project=${projectId} email=${clientEmail} keyHeader=${privateKey.slice(0, 26)} keyLen=${privateKey.length}`);
        admin = require('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
            console.log(`[Push] Firebase Admin initialized for project: ${projectId}`);
        }
        return admin;
    } catch (err) {
        console.error('[Push] Firebase Admin init failed:', err.message, err.stack);
        return null;
    }
}

const ALLOWED_SOUND = new Set(['chat', 'alert', 'ledger', 'attendance', 'default']);

/** FCM `data` must be string → string; objects as values cause send failures or empty client payloads. */
function stringifyDataMap(obj) {
    const out = {};
    if (!obj || typeof obj !== 'object') return out;
    for (const [k, v] of Object.entries(obj)) {
        const key = String(k);
        if (v == null) {
            out[key] = '';
            continue;
        }
        if (typeof v === 'object') {
            try {
                out[key] = JSON.stringify(v);
            } catch {
                out[key] = String(v);
            }
            continue;
        }
        out[key] = String(v);
    }
    return out;
}

function normalizeSoundCategory(raw) {
    const s = String(raw || 'default').toLowerCase();
    return ALLOWED_SOUND.has(s) ? s : 'default';
}

/** Android notification channel id (native/TWA; ignored on pure web). */
function androidChannelForSound(soundCategory) {
    if (soundCategory === 'chat') return 'pocketpos_chat';
    if (soundCategory === 'alert') return 'pocketpos_alerts';
    if (soundCategory === 'ledger') return 'pocketpos_ledger';
    if (soundCategory === 'attendance') return 'pocketpos_attendance';
    return 'pocketpos_default';
}

async function sendPushNotification(tokens, payload) {
    const fb = getAdmin();
    if (!fb) {
        console.warn('[Push] Admin not initialized - check FIREBASE_* env vars');
        return { success: 0, failure: tokens?.length || 0 };
    }
    if (!tokens || tokens.length === 0) {
        console.log('[Push] No tokens provided, skipping send');
        return { success: 0, failure: 0 };
    }
    const deduped = [...new Set(tokens)];
    const { title, body, data = {}, soundCategory: rawSound = 'default' } = payload;
    const soundCategory = normalizeSoundCategory(rawSound);
    const androidChannelId = androidChannelForSound(soundCategory);
    const ts = new Date().toISOString();
    const traceId = `push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[Push][${traceId}] ${ts} firebaseAdmin.sendPushNotification: ${deduped.length} tokens | sound=${soundCategory} | title="${title}" | body="${(body || '').slice(0, 50)}..." | data=${JSON.stringify(data)}`);
    try {
        const baseClientUrl = String(process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://pocketpos.io').trim().replace(/\/+$/, '');
        const preData = stringifyDataMap({ ...data, soundCategory });
        const rawLink = preData.link || (preData.chatId ? `/chat/${preData.chatId}` : '/notifications');
        const link = rawLink.startsWith('http')
            ? rawLink
            : (baseClientUrl ? `${baseClientUrl}${rawLink.startsWith('/') ? '' : '/'}${rawLink}` : rawLink);
        const linkPath = rawLink.startsWith('http') ? rawLink : (rawLink.startsWith('/') ? rawLink : `/${rawLink}`);
        console.log(`[Push][${traceId}] WebPush target link="${link}" raw="${rawLink}" clientUrl="${baseClientUrl || '(missing)'}"`);
        const normalizedData = stringifyDataMap({
            ...preData,
            title: String(title || preData.title || ''),
            body: String(body || preData.body || ''),
            soundCategory,
            link: preData.link || linkPath,
        });
        const webpushData = stringifyDataMap({
            ...normalizedData,
            title: String(title || normalizedData.title || ''),
            body: String(body || normalizedData.body || ''),
            soundCategory,
            link: normalizedData.link || linkPath,
        });
        const result = await fb.messaging().sendEachForMulticast({
            tokens: deduped,
            android: {
                priority: 'high',
                notification: {
                    title,
                    body,
                    sound: 'default',
                    channelId: androidChannelId,
                    defaultSound: true,
                    defaultVibrateTimings: true,
                },
                ttl: 60 * 60 * 1000
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                    TTL: String(60 * 60 * 24), // 24h
                },
                data: webpushData,
                notification: {
                    title,
                    body,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    requireInteraction: false,
                    silent: false,
                    tag: normalizedData.notificationId
                        ? `pp-${soundCategory}-${normalizedData.notificationId}`
                        : normalizedData.chatId
                            ? `pp-chat-${normalizedData.chatId}`
                            : `pp-${soundCategory}-${traceId.slice(-6)}`,
                },
                fcmOptions: {
                    link,
                },
            },
            apns: {
                headers: {
                    'apns-priority': '10',
                    'apns-push-type': 'alert'
                },
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        contentAvailable: false
                    }
                },
            },
            data: normalizedData,
        });
        console.log(`[Push][${traceId}] ${new Date().toISOString()} firebaseAdmin RESULT: success=${result.successCount} failure=${result.failureCount} total=${deduped.length}`);
        const invalidTokens = [];
        const failed = [];
        if (result.failureCount > 0 && result.responses) {
            result.responses.forEach((resp, i) => {
                if (!resp.success) {
                    const err = resp.error;
                    const code = err?.code || err?.message || 'unknown_error';
                    const tokenTail = (deduped[i] || '').slice(-12);
                    failed.push({ index: i, code, tokenTail });
                    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
                        invalidTokens.push(deduped[i]);
                    }
                    console.warn(`[Push][${traceId}] Failed token ${i + 1}/${deduped.length}: ${code} | token preview: ...${tokenTail}`);
                } else {
                    console.log(`[Push][${traceId}] Delivered token ${i + 1}/${deduped.length} tokenTail=...${(deduped[i] || '').slice(-12)}`);
                }
            });
        }
        return {
            success: result.successCount,
            failure: result.failureCount,
            invalidTokens,
            failed,
            traceId
        };
    } catch (err) {
        console.error(`[Push][${traceId}] Send error:`, err.message, err.code || '', err.stack);
        return { success: 0, failure: deduped.length, invalidTokens: [], failed: [{ code: err.code || err.message || 'send_error' }], traceId };
    }
}

module.exports = { getAdmin, sendPushNotification };

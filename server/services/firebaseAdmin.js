/**
 * Firebase Admin SDK - used for sending push notifications.
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env
 */
let admin = null;

function getAdmin() {
    if (admin) return admin;
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
        console.warn('[Push] Firebase Admin not configured: missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
        return null;
    }
    try {
        admin = require('firebase-admin');
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
            console.log(`[Push] Firebase Admin initialized for project: ${process.env.FIREBASE_PROJECT_ID}`);
        }
        return admin;
    } catch (err) {
        console.error('[Push] Firebase Admin init failed:', err.message, err.stack);
        return null;
    }
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
    const { title, body, data = {} } = payload;
    const ts = new Date().toISOString();
    const traceId = `push-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    console.log(`[Push][${traceId}] ${ts} firebaseAdmin.sendPushNotification: ${deduped.length} tokens | title="${title}" | body="${(body || '').slice(0, 50)}..." | data=${JSON.stringify(data)}`);
    try {
        const normalizedData = Object.fromEntries(
            Object.entries(data).map(([k, v]) => [String(k), String(v ?? '')])
        );
        const baseClientUrl = String(process.env.CLIENT_URL || '').trim().replace(/\/+$/, '');
        const rawLink = normalizedData.link || (normalizedData.chatId ? `/chat/${normalizedData.chatId}` : '/notifications');
        const link = rawLink.startsWith('http')
            ? rawLink
            : (baseClientUrl ? `${baseClientUrl}${rawLink.startsWith('/') ? '' : '/'}${rawLink}` : rawLink);
        console.log(`[Push][${traceId}] WebPush target link="${link}" raw="${rawLink}" clientUrl="${baseClientUrl || '(missing)'}"`);
        const result = await fb.messaging().sendEachForMulticast({
            tokens: deduped,
            notification: { title, body, sound: 'default' },
            android: {
                priority: 'high',
                notification: { sound: 'default', channelId: 'default' },
                ttl: 60 * 60 * 1000
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                    TTL: String(60 * 60 * 24) // 24h
                },
                notification: {
                    title,
                    body,
                    icon: '/pwa-192x192.png',
                    badge: '/pwa-192x192.png',
                    requireInteraction: false,
                    silent: false
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

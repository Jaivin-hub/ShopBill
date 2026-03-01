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
    console.log(`[Push] ${ts} firebaseAdmin.sendPushNotification: ${deduped.length} tokens | title="${title}" | body="${(body || '').slice(0, 50)}..." | data=${JSON.stringify(data)}`);
    try {
        const result = await fb.messaging().sendEachForMulticast({
            tokens: deduped,
            notification: { title, body, sound: 'default' },
            webpush: {
                notification: { title, body, requireInteraction: false },
                fcmOptions: {
                    link: data.link || (data.chatId ? '/chat/' + data.chatId : '/'),
                },
            },
            apns: {
                payload: { aps: { sound: 'default', contentAvailable: false } },
            },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [String(k), String(v ?? '')])
            ),
        });
        console.log(`[Push] ${new Date().toISOString()} firebaseAdmin RESULT: success=${result.successCount} failure=${result.failureCount} total=${deduped.length}`);
        if (result.failureCount > 0 && result.responses) {
            result.responses.forEach((resp, i) => {
                if (!resp.success) {
                    const err = resp.error;
                    console.warn(`[Push] Failed token ${i + 1}/${deduped.length}: ${err?.code || err?.message} | token preview: ...${(deduped[i] || '').slice(-12)}`);
                }
            });
        }
        return { success: result.successCount, failure: result.failureCount };
    } catch (err) {
        console.error('[Push] Send error:', err.message, err.code || '', err.stack);
        return { success: 0, failure: deduped.length };
    }
}

module.exports = { getAdmin, sendPushNotification };

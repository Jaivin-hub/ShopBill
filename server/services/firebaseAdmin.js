/**
 * Firebase Admin SDK - used for sending push notifications.
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env
 */
let admin = null;

function getAdmin() {
    if (admin) return admin;
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
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
        }
        return admin;
    } catch (err) {
        console.warn('[Firebase] Init failed:', err.message);
        return null;
    }
}

async function sendPushNotification(tokens, payload) {
    const fb = getAdmin();
    if (!fb || !tokens || tokens.length === 0) return { success: 0, failure: tokens ? tokens.length : 0 };
    const deduped = [...new Set(tokens)];
    const { title, body, data = {} } = payload;
    try {
        const result = await fb.messaging().sendEachForMulticast({
            tokens: deduped,
            notification: { title, body },
            webpush: {
                fcmOptions: {
                    link: data.link || (data.chatId ? '/chat/' + data.chatId : '/'),
                },
            },
            data: Object.fromEntries(
                Object.entries(data).map(([k, v]) => [String(k), String(v ?? '')])
            ),
        });
        return { success: result.successCount, failure: result.failureCount };
    } catch (err) {
        console.error('[Firebase] Send error:', err);
        return { success: 0, failure: deduped.length };
    }
}

module.exports = { getAdmin, sendPushNotification };

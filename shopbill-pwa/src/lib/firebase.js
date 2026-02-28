/**
 * Firebase client for push notifications (FCM).
 * Requires VITE_FIREBASE_* env vars. Push is optional.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app = null;
let messaging = null;

function getApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) return null;
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

function getMessagingInstance() {
  if (!getApp()) return null;
  if (!messaging) messaging = getMessaging(getApp());
  return messaging;
}

export async function isPushSupported() {
  return await isSupported();
}

export async function requestNotificationPermissionAndToken(vapidKey) {
  if (!('Notification' in window)) return null;
  if (!vapidKey || typeof vapidKey !== 'string') return null;
  try {
    if (!(await isSupported())) return null;
    if ((await Notification.requestPermission()) !== 'granted') return null;
    const m = getMessagingInstance();
    if (!m) return null;
    const token = await getToken(m, { vapidKey });
    return token || null;
  } catch (err) {
    console.warn('[Firebase] getToken error:', err?.message || err);
    return null;
  }
}

export function onForegroundMessage(callback) {
  const m = getMessagingInstance();
  if (!m || typeof callback !== 'function') return () => {};
  return onMessage(m, callback);
}

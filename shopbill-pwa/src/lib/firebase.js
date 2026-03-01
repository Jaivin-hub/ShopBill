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

/** Scope for Firebase SW to avoid conflict with PWA Workbox SW */
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

/** Register FCM service worker and wait for activation (avoids conflict with PWA Workbox SW) */
async function getFCMServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  let reg = await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE);
  if (reg?.active) return reg;
  try {
    reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: FCM_SW_SCOPE });
  } catch (e) {
    console.warn('[Firebase] SW register failed:', e?.message);
    return null;
  }
  const sw = reg.installing || reg.waiting;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const waitMs = isMobile ? 12000 : 8000;
  if (sw) {
    await new Promise((resolve) => {
      const done = () => { if (reg.active) resolve(); };
      sw.addEventListener('statechange', done);
      if (reg.active) done();
      else setTimeout(resolve, waitMs);
    });
  }
  return reg.active ? reg : null;
}

export async function requestNotificationPermissionAndToken(vapidKey) {
  if (!('Notification' in window)) return null;
  if (!vapidKey || typeof vapidKey !== 'string') return null;
  try {
    if (!(await isSupported())) return null;
    if ((await Notification.requestPermission()) !== 'granted') return null;
    const swReg = await getFCMServiceWorkerRegistration();
    if (!swReg) return null;
    const m = getMessagingInstance();
    if (!m) return null;
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: swReg });
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

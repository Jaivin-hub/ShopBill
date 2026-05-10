/**
 * Firebase client for push notifications (FCM).
 * Requires VITE_FIREBASE_* env vars. Push is optional.
 */
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD3r9_7L1TttIFFiP9lXEnatE22p5m9SRk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pocketpos-d0f89.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pocketpos-d0f89',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pocketpos-d0f89.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '918619248030',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:918619248030:web:05b66603fe70426211728f',
};

let app = null;
let messaging = null;

function getApp() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.messagingSenderId || !firebaseConfig.appId) {
    console.warn('[Push][Firebase] Missing firebase config fields; app init skipped');
    return null;
  }
  if (!app) {
    console.log('[Push][Firebase] Initializing Firebase app');
    app = initializeApp(firebaseConfig);
  }
  return app;
}

function getMessagingInstance() {
  if (!getApp()) return null;
  if (!messaging) messaging = getMessaging(getApp());
  return messaging;
}

export async function isPushSupported() {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const standalone =
      (typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && /** @type {any} */ (navigator).standalone === true);
    if (ios && standalone && typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator) {
      console.log('[Push][Firebase] iOS home-screen PWA: push treated as supported (Safari sometimes misreports isSupported)');
      return true;
    }
  } catch {
    /* ignore */
  }
  const supported = await isSupported();
  console.log(`[Push][Firebase] isSupported=${supported}`);
  return supported;
}

/** Scope for Firebase SW to avoid conflict with PWA Workbox SW */
const FCM_SW_SCOPE = '/firebase-cloud-messaging-push-scope';

/** Register FCM service worker and wait for activation (avoids conflict with PWA Workbox SW) */
async function getFCMServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push][Firebase] serviceWorker not available');
    return null;
  }
  const scopeNorm = FCM_SW_SCOPE.endsWith('/') ? FCM_SW_SCOPE : `${FCM_SW_SCOPE}/`;
  let reg = await navigator.serviceWorker.getRegistration(scopeNorm);
  if (reg?.active) {
    console.log('[Push][Firebase] Reusing active FCM SW registration');
    return reg;
  }
  try {
    console.log('[Push][Firebase] Registering FCM service worker scope=', scopeNorm);
    reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: scopeNorm, updateViaCache: 'none' });
    console.log('[Push][Firebase] FCM service worker register call succeeded');
    try {
      await reg.update();
    } catch (updErr) {
      console.warn('[Push][Firebase] reg.update():', updErr?.message || updErr);
    }
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
  if (!reg.active) {
    console.warn('[Push][Firebase] FCM service worker not active after wait');
    return null;
  }
  console.log('[Push][Firebase] FCM service worker active');
  return reg;
}

/** Wait until the Firebase messaging SW (separate scope from Workbox) is active — required for getToken. */
export async function ensureFcmServiceWorkerReady() {
  return getFCMServiceWorkerRegistration();
}

export async function requestNotificationPermissionAndToken(vapidKey) {
  if (!('Notification' in window)) {
    console.warn('[Push][Firebase] Notification API unavailable');
    return null;
  }
  if (!vapidKey || typeof vapidKey !== 'string') {
    console.warn('[Push][Firebase] Missing/invalid VAPID key');
    return null;
  }
  try {
    if (!(await isPushSupported())) {
      console.warn('[Push][Firebase] Firebase messaging unsupported in this browser');
      return null;
    }
    if (Notification.permission === 'denied') {
      console.warn('[Push][Firebase] Notifications are blocked; enable them in browser settings for this site');
      return null;
    }
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    console.log(`[Push][Firebase] Notification permission result=${permission}`);
    if (permission !== 'granted') return null;
    const swReg = await getFCMServiceWorkerRegistration();
    if (!swReg) return null;
    const m = getMessagingInstance();
    if (!m) {
      console.warn('[Push][Firebase] Messaging instance unavailable');
      return null;
    }
    const token = await getToken(m, { vapidKey, serviceWorkerRegistration: swReg });
    if (token) {
      console.log(`[Push][Firebase] FCM token generated tokenTail=...${token.slice(-12)}`);
    } else {
      console.warn('[Push][Firebase] getToken returned empty token');
    }
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

import { loadEnv } from 'vite';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

/** Generates firebase-messaging-sw.js with env-injected config for push notifications */
export default function firebaseSwPlugin() {
  return {
    name: 'firebase-sw-config',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || process.cwd(), '');
      const cfg = {
        apiKey: env.VITE_FIREBASE_API_KEY || 'FIREBASE_API_KEY_PLACEHOLDER',
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'FIREBASE_AUTH_DOMAIN_PLACEHOLDER',
        projectId: env.VITE_FIREBASE_PROJECT_ID || 'FIREBASE_PROJECT_ID_PLACEHOLDER',
        storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'FIREBASE_STORAGE_BUCKET_PLACEHOLDER',
        messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.VITE_FIREBASE_SENDER_ID || 'FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER',
        appId: env.VITE_FIREBASE_APP_ID || 'FIREBASE_APP_ID_PLACEHOLDER',
      };
      const content = `/* eslint-disable no-restricted-globals */
// Firebase Messaging Service Worker - auto-generated with env config
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: '${cfg.apiKey}',
  authDomain: '${cfg.authDomain}',
  projectId: '${cfg.projectId}',
  storageBucket: '${cfg.storageBucket}',
  messagingSenderId: '${cfg.messagingSenderId}',
  appId: '${cfg.appId}',
};

function resolveOpenUrl(raw) {
  try {
    if (!raw || typeof raw !== 'string') return new URL('/notifications', self.location.origin).href;
    const t = raw.trim();
    if (t.startsWith('http://') || t.startsWith('https://')) return t;
    return new URL(t.startsWith('/') ? t : '/' + t, self.location.origin).href;
  } catch (e) {
    return self.location.origin + '/notifications';
  }
}

function vibratePatternForCategory(soundCategory) {
  const c = String(soundCategory || 'default').toLowerCase();
  if (c === 'chat') return [100, 40, 100];
  if (c === 'alert') return [200, 80, 200, 80, 280];
  if (c === 'ledger') return [80, 50, 80, 50, 120];
  if (c === 'attendance') return [60, 40, 60, 40, 60, 40, 100];
  return [120, 60, 120];
}

function normalizePushPayload(raw) {
  if (!raw || typeof raw !== 'object') return { data: {}, notification: {} };
  const notification = raw.notification && typeof raw.notification === 'object' ? raw.notification : {};
  let data = raw.data;
  if (data == null) data = {};
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (_) {
      data = {};
    }
  }
  if (typeof data !== 'object') data = {};
  const out = { data, notification: { ...notification } };
  if (data.title && !out.notification.title) out.notification.title = data.title;
  if (data.body && !out.notification.body) out.notification.body = data.body;
  if (data['gcm.notification.title']) out.notification.title = data['gcm.notification.title'];
  if (data['gcm.notification.body']) out.notification.body = data['gcm.notification.body'];
  return out;
}

function broadcastSoundToClients(soundCategory) {
  const cat = String(soundCategory || 'default').toLowerCase();
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      try {
        client.postMessage({ type: 'play-push-sound', category: cat });
      } catch (_) {
        void 0;
      }
    });
  });
}

function showLocalPush(title, body, data) {
  const d = data && typeof data === 'object' ? data : {};
  let soundCat = d.soundCategory;
  if (!soundCat && (d.type === 'chat_message' || d.notificationType === 'chat_message')) soundCat = 'chat';
  if (!soundCat) {
    const nt = String(d.notificationType || d.type || '');
    if (nt.startsWith('attendance_')) soundCat = 'attendance';
    else if (['ledger_payment', 'ledger_credit', 'credit_sale', 'credit_limit_updated', 'customer_added'].includes(nt)) soundCat = 'ledger';
    else if (nt === 'inventory_low' || nt === 'credit_exceeded') soundCat = 'alert';
  }
  const soundCategory = String(soundCat || 'default').toLowerCase();
  const rawPath = d.link || d.url || (d.chatId ? '/chat/' + d.chatId : '/notifications');
  const targetUrl = resolveOpenUrl(rawPath);
  const uniqueTag = d.notificationId || d.chatId || ('pocketpos-' + Date.now());
  const options = {
    body: body || 'New update',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: uniqueTag,
    renotify: true,
    silent: false,
    vibrate: vibratePatternForCategory(soundCategory),
    data: Object.assign({}, d, { url: targetUrl, soundCategory: soundCategory }),
    requireInteraction: false,
  };
  const shown = self.registration.showNotification(title || 'Pocket POS', options);
  return Promise.resolve(shown).then(() => broadcastSoundToClients(soundCategory));
}

const hasValidConfig = firebaseConfig.projectId && !firebaseConfig.projectId.includes('PLACEHOLDER');
let firebaseBackgroundHandlerActive = false;
try {
  if (hasValidConfig) {
    console.log('[Push][SW] Initializing firebase messaging service worker');
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      console.log('[Push][SW] Background message received:', payload);
      const n = payload.notification || {};
      const data = Object.assign({}, payload.data || {});
      const title = n.title || data.title || 'Pocket POS';
      const body = n.body || data.body || data.message || 'New update';
      return showLocalPush(title, body, data);
    });
    firebaseBackgroundHandlerActive = true;
  }
} catch (e) {
  console.warn('[firebase-messaging-sw] Init failed:', e);
}

if (!firebaseBackgroundHandlerActive) {
  console.warn('[Push][SW] Firebase background handler inactive — using generic push fallback (check Vite env / PLACEHOLDER config)');
  self.addEventListener('push', (event) => {
    try {
      let raw = {};
      if (event && event.data) {
        try {
          raw = event.data.json();
        } catch (e2) {
          raw = { notification: { body: event.data.text() } };
        }
      }
      const { data, notification } = normalizePushPayload(raw);
      const title = notification.title || data.title || 'Pocket POS';
      const body = notification.body || data.body || data.message || 'New update';
      console.log('[Push][SW] generic push event:', { title, body, soundCategory: data.soundCategory });
      event.waitUntil(showLocalPush(title, body, data));
    } catch (err) {
      console.warn('[Push][SW] generic push handler failed:', err);
    }
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = event.notification && event.notification.data && event.notification.data.url;
  const targetUrl = resolveOpenUrl(raw || '/notifications');
  console.log('[Push][SW] notificationclick targetUrl:', targetUrl);
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'notification-click', url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
      return null;
    })
  );
});
`;
      const outPath = resolve(config.root, 'public', 'firebase-messaging-sw.js');
      writeFileSync(outPath, content);
    },
  };
}

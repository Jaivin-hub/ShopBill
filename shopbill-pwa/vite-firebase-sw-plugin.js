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

const hasValidConfig = firebaseConfig.projectId && !firebaseConfig.projectId.includes('PLACEHOLDER');
try {
  if (hasValidConfig) {
    console.log('[Push][SW] Initializing firebase messaging service worker');
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      console.log('[Push][SW] Background message received:', payload);
      const { title, body } = payload.notification || {};
      const data = payload.data || {};
      const targetUrl = data.link || data.url || (data.chatId ? '/chat/' + data.chatId : '/notifications');
      const options = {
        body: body || 'New message',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: data.chatId || 'chat',
        silent: false,
        data: { url: targetUrl, ...data },
        requireInteraction: false,
      };
      return self.registration.showNotification(title || 'Pocket POS', options);
    });
  }
} catch (e) {
  console.warn('[firebase-messaging-sw] Init failed:', e);
}

// Fallback push handler for browsers where Firebase background callback is inconsistent.
self.addEventListener('push', (event) => {
  try {
    let payload = {};
    if (event?.data) {
      try {
        payload = event.data.json();
      } catch {
        payload = { notification: { body: event.data.text() } };
      }
    }

    const data = payload?.data || {};
    const notification = payload?.notification || {};
    const title = notification.title || data.title || 'Pocket POS';
    const body = notification.body || data.body || 'New update';
    const targetUrl = data.link || data.url || (data.chatId ? '/chat/' + data.chatId : '/notifications');

    const options = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: data.chatId || data.notificationId || 'pocketpos',
      silent: false,
      requireInteraction: false,
      data: { url: targetUrl, ...data }
    };

    console.log('[Push][SW] generic push event received:', { title, body, targetUrl });
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.warn('[Push][SW] generic push handler failed:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/notifications';
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

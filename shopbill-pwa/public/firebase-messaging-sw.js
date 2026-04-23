/* eslint-disable no-restricted-globals */
// Firebase Messaging Service Worker - auto-generated with env config
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'AIzaSyD3r9_7L1TttIFFiP9lXEnatE22p5m9SRk',
  authDomain: 'pocketpos-d0f89.firebaseapp.com',
  projectId: 'pocketpos-d0f89',
  storageBucket: 'pocketpos-d0f89.firebasestorage.app',
  messagingSenderId: '918619248030',
  appId: '1:918619248030:web:05b66603fe70426211728f',
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
      const uniqueTag = data.notificationId || data.chatId || `pocketpos-${Date.now()}`;
      const options = {
        body: body || 'New message',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: uniqueTag,
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

    const uniqueTag = data.notificationId || data.chatId || `pocketpos-${Date.now()}`;
    const options = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: uniqueTag,
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

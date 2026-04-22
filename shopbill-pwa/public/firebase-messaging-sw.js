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
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      const data = payload.data || {};
      const options = {
        body: body || 'New message',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: data.chatId || 'chat',
        silent: false,
        data: { url: data.chatId ? '/chat/' + data.chatId : '/', ...data },
        requireInteraction: false,
      };
      return self.registration.showNotification(title || 'Pocket POS', options);
    });
  }
} catch (e) {
  console.warn('[firebase-messaging-sw] Init failed:', e);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.link || event.notification?.data?.url || '/notifications';
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

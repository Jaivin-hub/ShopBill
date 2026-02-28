/* eslint-disable no-restricted-globals */
// Firebase Messaging Service Worker - handles background push notifications
// VAPID key must be passed from the main app via postMessage or configured here
// This file is loaded from the root - paths relative to domain root

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'FIREBASE_API_KEY_PLACEHOLDER',
  authDomain: 'FIREBASE_AUTH_DOMAIN_PLACEHOLDER',
  projectId: 'FIREBASE_PROJECT_ID_PLACEHOLDER',
  storageBucket: 'FIREBASE_STORAGE_BUCKET_PLACEHOLDER',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID_PLACEHOLDER',
  appId: 'FIREBASE_APP_ID_PLACEHOLDER',
};

// Only init if config is valid (replace placeholders with your Firebase config)
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
      data: { url: data.chatId ? '/chat/' + data.chatId : '/', ...data },
      requireInteraction: false,
    };
    return self.registration.showNotification(title || 'Pocket POS', options);
  });
  }
} catch (e) {
  console.warn('[firebase-messaging-sw] Init failed:', e);
}

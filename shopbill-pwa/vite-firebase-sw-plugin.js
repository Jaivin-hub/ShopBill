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
`;
      const outPath = resolve(config.root, 'public', 'firebase-messaging-sw.js');
      writeFileSync(outPath, content);
    },
  };
}

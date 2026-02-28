# Push Notifications Setup (Firebase Cloud Messaging)

Chat push notifications use Firebase Cloud Messaging (FCM). Follow these steps to enable them.

## 1. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/) and create/select a project.
2. Add a **Web app** and copy the Firebase config object.
3. In **Project Settings → Cloud Messaging**, generate a **Web Push certificate** (VAPID key pair).
4. In [Google Cloud Console](https://console.cloud.google.com/) for the same project, enable **FCM Registration API** (required for SDK 6.7+).

## 2. Server Environment (.env)

Add to `server/.env`:

```
# Firebase Admin (for sending push)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

To get these credentials:
- Firebase Console → Project Settings → Service accounts → Generate new private key.

## 3. PWA Environment (.env)

Create or update `shopbill-pwa/.env`:

```
# Firebase client (for receiving push)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
VITE_FIREBASE_VAPID_KEY=BKagOny0KF_2pCJQ3m...  # From Web Push certificates in Firebase Console
```

## 4. Firebase Messaging Service Worker

Edit `shopbill-pwa/public/firebase-messaging-sw.js` and replace placeholders with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

## 5. Install Dependencies

```bash
# Server
cd server && npm install

# PWA (includes firebase package)
cd shopbill-pwa && npm install
```

## Behavior

- When a PRO/PREMIUM user logs in, the app requests notification permission and registers the FCM token with the backend.
- When someone sends a chat message, the server sends push notifications to all recipients' registered device tokens.
- Message ringtone: Settings → Chat message sound toggle (PRO/PREMIUM).
- Seen bubble: Shows for all users (owner, manager, cashier) who have read the message.

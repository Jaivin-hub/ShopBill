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

The service worker is **auto-generated** at build/dev from your `shopbill-pwa/.env` (VITE_FIREBASE_*). No manual edit needed if env is set.

## 5. Install Dependencies

```bash
# Server
cd server && npm install

# PWA (includes firebase package)
cd shopbill-pwa && npm install
```

## Behavior

- When a user logs in, the app may request notification permission and register the FCM token.
- **Mobile:** Go to Settings → Push notifications → tap **Enable** (required for iOS; must be a user tap).
- When someone sends a chat message, the server sends push to all recipients' device tokens.
- Message ringtone: Settings → Chat message sound toggle (PRO/PREMIUM).

## Mobile PWA Troubleshooting

**Push notifications not showing when app is closed:**
1. Add the app to Home Screen and open from there (not from Safari tab).
2. Go to Settings → Push notifications → tap **Enable** and allow when prompted.
3. Ensure `shopbill-pwa/.env` has all VITE_FIREBASE_* vars and rebuild (`npm run build`).
4. After deploy, remove from Home Screen and re-add, then open again.
5. iOS 16.4+ required for web push on PWA.

**Message ringtone not playing on mobile:**
1. Tap anywhere on the app screen once after opening (unlocks audio on iOS).
2. Ensure Chat message sound is ON in Settings.

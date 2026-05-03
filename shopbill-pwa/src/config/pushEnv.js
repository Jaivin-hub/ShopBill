/** Web Push / FCM — Vite exposes only VITE_* at build time (not REACT_APP_*). */
export const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function isPushConfigured() {
  return typeof FIREBASE_VAPID_KEY === 'string' && FIREBASE_VAPID_KEY.length > 20;
}

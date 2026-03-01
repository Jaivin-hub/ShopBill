/**
 * Request push notification permission from user gesture (required for iOS).
 * Call from click/touch handler so it runs in gesture context.
 */
import { requestNotificationPermissionAndToken, isPushSupported } from '../lib/firebase';
import apiClient from '../lib/apiClient';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const STORAGE_KEY = 'push_token_registered';

export async function requestPushFromGesture() {
  if (!VAPID_KEY || !localStorage.getItem('userToken')) return;
  try {
    if (localStorage.getItem(STORAGE_KEY) === '1') return;
    if (!(await isPushSupported())) return;
    const token = await requestNotificationPermissionAndToken(VAPID_KEY);
    if (token) {
      await apiClient.post('/user/device-token', { token, platform: 'web' });
      localStorage.setItem(STORAGE_KEY, '1');
    }
  } catch (e) {}
}

/**
 * Request push notification permission from user gesture (required for iOS).
 * Call from click/touch handler so it runs in gesture context.
 */
import { requestNotificationPermissionAndToken, isPushSupported } from '../lib/firebase';
import apiClient from '../lib/apiClient';
import { FIREBASE_VAPID_KEY, isPushConfigured } from '../config/pushEnv';

const STORAGE_KEY = 'push_token_registered';
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isAndroid = () => /Android/i.test(navigator.userAgent);

/**
 * Call from submit/tap before any await (e.g. login). iOS Safari only allows Notification.requestPermission
 * inside a user gesture; waiting for the login API finishes breaks that chain.
 */
export async function primeNotificationPermissionFromGesture() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'default') return;
  try {
    await Notification.requestPermission();
  } catch {
    void 0;
  }
}

export async function requestPushFromGesture() {
  if (!isPushConfigured() || !localStorage.getItem('userToken')) {
    if (!isPushConfigured()) {
      console.warn('[Push][Gesture] Skipping: VITE_FIREBASE_VAPID_KEY not set in build');
    }
    return;
  }
  try {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.pushNotificationsEnabled === false) {
        console.log('[Push][Gesture] Skipping: push disabled in Settings');
        return;
      }
    }
  } catch (_) {
    /* ignore */
  }
  try {
    if (!(await isPushSupported())) {
      console.log('[Push][Gesture] Push unsupported on this browser/device');
      return;
    }
    console.log('[Push][Gesture] User gesture detected, requesting token...');
    const token = await requestNotificationPermissionAndToken(FIREBASE_VAPID_KEY);
    if (token) {
      await apiClient.post('/user/device-token', { token, platform: isAndroid() ? 'android-web' : (isMobile() ? 'ios-web' : 'web') }, {
        headers: { 'x-skip-attendance-prompt': '1' }
      });
      localStorage.setItem(STORAGE_KEY, '1');
      console.log(`[Push][Gesture] Device token registered tokenTail=...${token.slice(-12)}`);
    } else {
      console.log('[Push][Gesture] No token returned after gesture');
    }
  } catch (error) {
    console.warn('[Push][Gesture] Registration failed:', error?.message || error);
  }
}

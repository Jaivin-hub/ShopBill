/**
 * Hook to request notification permission and register FCM token with backend.
 * Call when user is logged in.
 */
import { useEffect, useRef } from 'react';
import { requestNotificationPermissionAndToken, isPushSupported } from '../lib/firebase';
import apiClient from '../lib/apiClient';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export function usePushNotifications(enabled) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !VAPID_KEY) return;
    const token = localStorage.getItem('userToken');
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const supported = await isPushSupported();
        if (!supported || cancelled) return;
        const fcmToken = await requestNotificationPermissionAndToken(VAPID_KEY);
        if (!fcmToken || cancelled) return;
        if (registeredRef.current) return;
        await apiClient.post('/user/device-token', { token: fcmToken, platform: 'web' });
        registeredRef.current = true;
      } catch (err) {
        if (!cancelled) console.warn('[Push] Register failed:', err?.message || err);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);
}

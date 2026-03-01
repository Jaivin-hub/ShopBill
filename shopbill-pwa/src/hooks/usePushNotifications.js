/**
 * Hook to request push notification permission and register FCM token.
 * On desktop: auto-request after short delay.
 * On mobile (iOS): requires user gesture - handled by pushOnGesture on first tap.
 */
import { useEffect, useRef } from 'react';
import { requestNotificationPermissionAndToken, isPushSupported } from '../lib/firebase';
import apiClient from '../lib/apiClient';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export function usePushNotifications(enabled) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!enabled || !VAPID_KEY) return;
    if (!localStorage.getItem('userToken')) return;
    if (localStorage.getItem('push_token_registered') === '1') return;
    if (isMobile()) return; // Mobile: push is requested from user gesture (pushOnGesture)

    let cancelled = false;
    const attempt = async () => {
      try {
        if (!(await isPushSupported()) || cancelled) return;
        const fcmToken = await requestNotificationPermissionAndToken(VAPID_KEY);
        if (!fcmToken || cancelled) return;
        if (registeredRef.current) return;
        await apiClient.post('/user/device-token', { token: fcmToken, platform: 'web' });
        registeredRef.current = true;
        localStorage.setItem('push_token_registered', '1');
      } catch (err) {
        if (!cancelled) console.warn('[Push] Register failed:', err?.message || err);
      }
    };

    const t = setTimeout(attempt, 1000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [enabled]);
}

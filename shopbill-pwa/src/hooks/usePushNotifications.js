/**
 * Hook to request notification permission and register FCM token with backend.
 * On mobile, delays request to allow SW to activate; retries once on failure.
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
    const token = localStorage.getItem('userToken');
    if (!token) return;

    let cancelled = false;
    const attempt = async (retry = false) => {
      try {
        const supported = await isPushSupported();
        if (!supported || cancelled) return;
        if (retry) await new Promise(r => setTimeout(r, 2000));
        const fcmToken = await requestNotificationPermissionAndToken(VAPID_KEY);
        if (!fcmToken || cancelled) return;
        if (registeredRef.current) return;
        await apiClient.post('/user/device-token', { token: fcmToken, platform: 'web' });
        registeredRef.current = true;
      } catch (err) {
        if (!cancelled && !retry && isMobile()) {
          setTimeout(() => attempt(true), 3000);
        } else if (!cancelled) {
          console.warn('[Push] Register failed:', err?.message || err);
        }
      }
    };

    const delay = isMobile() ? 2500 : 500;
    const t = setTimeout(() => attempt(), delay);

    const onVisible = () => {
      if (!cancelled && !registeredRef.current && document.visibilityState === 'visible') {
        attempt();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}

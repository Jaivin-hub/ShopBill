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
    if (!enabled || !VAPID_KEY) {
      console.log('[Push][Hook] Skipping: disabled or missing VAPID key');
      return;
    }
    if (!localStorage.getItem('userToken')) {
      console.log('[Push][Hook] Skipping: no auth token in storage');
      return;
    }

    let cancelled = false;
    const attempt = async () => {
      try {
        if (!(await isPushSupported()) || cancelled) {
          console.log('[Push][Hook] Attempt skipped: unsupported or cancelled');
          return;
        }
        console.log(`[Push][Hook] Notification.permission=${Notification.permission}`);
        if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            console.log('[Push][Hook] SW registrations:', regs.map(r => ({
              scope: r.scope,
              hasActive: Boolean(r.active),
              hasWaiting: Boolean(r.waiting),
              hasInstalling: Boolean(r.installing),
            })));
          } catch (swErr) {
            console.warn('[Push][Hook] Could not read service worker registrations:', swErr?.message || swErr);
          }
        }
        // iOS/Android web should still register token automatically after permission is granted.
        // Do not trigger permission prompt without gesture on mobile.
        if (isMobile() && Notification.permission !== 'granted') {
          console.log(`[Push][Hook] Mobile permission not granted yet (${Notification.permission}), waiting for gesture`);
          return;
        }
        try {
          const readyReg = await navigator.serviceWorker.ready;
          const sub = await readyReg.pushManager.getSubscription();
          console.log('[Push][Hook] Existing PushManager subscription:', sub ? { endpointTail: String(sub.endpoint || '').slice(-32) } : null);
        } catch (pmErr) {
          console.warn('[Push][Hook] PushManager subscription check failed:', pmErr?.message || pmErr);
        }
        console.log('[Push][Hook] Attempting push token registration...');
        const fcmToken = await requestNotificationPermissionAndToken(VAPID_KEY);
        if (!fcmToken || cancelled) {
          console.log('[Push][Hook] No token generated or attempt cancelled');
          return;
        }
        if (registeredRef.current) {
          console.log('[Push][Hook] Token already registered in this session');
          return;
        }
        await apiClient.post('/user/device-token', {
          token: fcmToken,
          platform: isMobile() ? 'ios-web' : 'web'
        });
        console.log(`[Push][Hook] Device token registered tokenTail=...${fcmToken.slice(-12)}`);
        registeredRef.current = true;
        localStorage.setItem('push_token_registered', '1');
      } catch (err) {
        if (!cancelled) console.warn('[Push] Register failed:', err?.message || err);
      }
    };

    const timers = [
      setTimeout(attempt, 800),
      setTimeout(attempt, 3000),
      setTimeout(attempt, 7000),
    ];
    let interval = null;
    let retryCount = 0;
    // Keep retrying in background for delayed iOS SW/token readiness.
    interval = setInterval(() => {
      if (cancelled || registeredRef.current || retryCount >= 5) {
        if (interval) clearInterval(interval);
        return;
      }
      retryCount += 1;
      attempt();
    }, 30000);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (interval) clearInterval(interval);
    };
  }, [enabled]);
}

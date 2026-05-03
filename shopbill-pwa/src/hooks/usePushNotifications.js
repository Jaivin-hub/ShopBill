/**
 * Hook to request push notification permission and register FCM token.
 * On desktop: auto-request after short delay.
 * On mobile (iOS): requires user gesture - handled by pushOnGesture on first tap.
 */
import { useEffect, useRef } from 'react';
import { requestNotificationPermissionAndToken, isPushSupported, ensureFcmServiceWorkerReady } from '../lib/firebase';
import apiClient from '../lib/apiClient';
import { FIREBASE_VAPID_KEY, isPushConfigured } from '../config/pushEnv';

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/**
 * @param {boolean} enabled — e.g. !!currentUser
 * @param {string|undefined} userKey — user id; when it changes, token is re-posted for the new account
 */
export function usePushNotifications(enabled, userKey) {
  /** Last FCM token POSTed to API this session (token refresh must re-register). */
  const lastPostedTokenRef = useRef('');
  const lastUserKeyRef = useRef('');

  useEffect(() => {
    if (!enabled) {
      return;
    }
    if (!isPushConfigured()) {
      console.error('[Push][Hook] VITE_FIREBASE_VAPID_KEY is missing or invalid in this build — web push cannot register. Add it in .env / hosting env and rebuild.');
      return;
    }
    if (!localStorage.getItem('userToken')) {
      console.log('[Push][Hook] Skipping: no auth token in storage');
      return;
    }

    if (userKey != null && lastUserKeyRef.current !== String(userKey)) {
      lastPostedTokenRef.current = '';
      lastUserKeyRef.current = String(userKey);
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
          const fcmReg = await ensureFcmServiceWorkerReady();
          if (!fcmReg?.active) {
            console.warn('[Push][Hook] FCM SW not active yet; getToken will register/wait (separate scope from Workbox)');
          }
          if (fcmReg) {
            const sub = await fcmReg.pushManager.getSubscription();
            console.log('[Push][Hook] FCM scope PushManager subscription:', sub ? { endpointTail: String(sub.endpoint || '').slice(-32) } : null);
          }
        } catch (pmErr) {
          console.warn('[Push][Hook] PushManager subscription check failed:', pmErr?.message || pmErr);
        }
        console.log('[Push][Hook] Attempting push token registration...');
        const fcmToken = await requestNotificationPermissionAndToken(FIREBASE_VAPID_KEY);
        if (!fcmToken || cancelled) {
          console.log('[Push][Hook] No token generated or attempt cancelled');
          return;
        }
        if (lastPostedTokenRef.current === fcmToken) {
          console.log('[Push][Hook] Token unchanged since last POST, skipping duplicate register');
          return;
        }
        await apiClient.post('/user/device-token', {
          token: fcmToken,
          platform: isMobile() ? 'ios-web' : 'web'
        }, {
          headers: { 'x-skip-attendance-prompt': '1' }
        });
        console.log(`[Push][Hook] Device token registered tokenTail=...${fcmToken.slice(-12)}`);
        lastPostedTokenRef.current = fcmToken;
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
      if (cancelled || lastPostedTokenRef.current || retryCount >= 5) {
        if (interval) clearInterval(interval);
        return;
      }
      retryCount += 1;
      attempt();
    }, 30000);

    const onVisibleOrFocus = () => {
      if (cancelled || lastPostedTokenRef.current) return;
      if (document.visibilityState === 'visible') attempt();
    };
    window.addEventListener('focus', onVisibleOrFocus);
    document.addEventListener('visibilitychange', onVisibleOrFocus);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      if (interval) clearInterval(interval);
      window.removeEventListener('focus', onVisibleOrFocus);
      document.removeEventListener('visibilitychange', onVisibleOrFocus);
    };
  }, [enabled, userKey]);
}

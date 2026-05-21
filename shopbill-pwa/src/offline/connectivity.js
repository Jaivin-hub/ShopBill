export function isBrowserOnline() {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

/**
 * After the browser "online" event, wait briefly so TCP/DNS is ready before API calls.
 */
export function waitForNetworkReady(maxWaitMs = 10000) {
  return new Promise((resolve) => {
    if (!isBrowserOnline()) {
      resolve(false);
      return;
    }

    const started = Date.now();
    const settleMs = 500;
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const check = () => {
      if (!isBrowserOnline()) return finish(false);
      if (Date.now() - started >= settleMs) return finish(true);
      setTimeout(check, 100);
    };

    check();
    setTimeout(() => finish(isBrowserOnline()), maxWaitMs);
  });
}

export function subscribeConnectivity(onChange) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => onChange(true);
  const handleOffline = () => onChange(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  const onVisibility = () => {
    if (document.visibilityState === 'visible' && isBrowserOnline()) {
      onChange(true);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

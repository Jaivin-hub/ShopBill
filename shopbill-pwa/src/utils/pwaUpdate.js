/** Injected at build/dev server start by vite-build-version-plugin.js */

export const APP_BUILD_VERSION =
  typeof __APP_BUILD_VERSION__ !== 'undefined' ? __APP_BUILD_VERSION__ : 'dev-local';

const VERSION_STORAGE_KEY = 'pocketpos_app_build_version';
const UPDATE_APPLYING_KEY = 'pocketpos_pwa_update_applying';

export function getStoredBuildVersion() {
  try {
    return localStorage.getItem(VERSION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function storeBuildVersion(version) {
  try {
    if (version) localStorage.setItem(VERSION_STORAGE_KEY, version);
  } catch {
    /* private mode */
  }
}

export function markUpdateAcknowledged(version) {
  if (version) storeBuildVersion(version);
  try {
    sessionStorage.setItem(UPDATE_APPLYING_KEY, version || '1');
  } catch {
    /* ignore */
  }
}

export function isUpdateInProgress() {
  try {
    return !!sessionStorage.getItem(UPDATE_APPLYING_KEY);
  } catch {
    return false;
  }
}

export function clearUpdateInProgress() {
  try {
    sessionStorage.removeItem(UPDATE_APPLYING_KEY);
  } catch {
    /* ignore */
  }
}

/** Fetch latest deploy id from network (never cached). */
export async function fetchRemoteBuildVersion() {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.version || null;
  } catch {
    return null;
  }
}

/**
 * True when the server has a newer build than this tab, and the user has not
 * already tapped Update for that build (stored ack matches remote).
 */
export function shouldShowUpdatePrompt(remoteVersion) {
  if (!remoteVersion) return false;
  if (remoteVersion === APP_BUILD_VERSION) return false;
  if (getStoredBuildVersion() === remoteVersion) return false;
  if (isUpdateInProgress()) return false;
  return true;
}

/** @deprecated use shouldShowUpdatePrompt */
export function isRemoteBuildNewer(remoteVersion) {
  return shouldShowUpdatePrompt(remoteVersion);
}

export async function clearAllCaches() {
  if (!('caches' in window)) return;
  try {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  } catch (err) {
    console.warn('[PWA] cache clear failed:', err);
  }
}

export async function unregisterAllServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch (err) {
    console.warn('[PWA] SW unregister failed:', err);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll registration.update() until a waiting worker exists or timeout. */
export async function waitForWaitingWorker(registration, maxMs = 12000) {
  if (!registration) return null;
  const deadline = Date.now() + maxMs;

  while (Date.now() < deadline) {
    try {
      await registration.update();
    } catch {
      /* ignore */
    }

    if (registration.waiting) return registration.waiting;

    const installing = registration.installing;
    if (installing) {
      await new Promise((resolve) => {
        const done = () => resolve();
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' || registration.waiting) done();
        });
        setTimeout(done, 1500);
      });
      if (registration.waiting) return registration.waiting;
    }

    await delay(350);
  }

  return registration.waiting || null;
}

/** Resolve when a new service worker controls the page. */
export function waitForControllerChange(maxMs = 10000) {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve(false);
      return;
    }

    const previous = navigator.serviceWorker.controller;

    const finish = (ok) => {
      navigator.serviceWorker.removeEventListener('controllerchange', onChange);
      resolve(ok);
    };

    const onChange = () => {
      const next = navigator.serviceWorker.controller;
      if (!previous || (next && next !== previous)) {
        finish(true);
      } else if (next) {
        finish(true);
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', onChange);
    setTimeout(() => finish(false), maxMs);
  });
}

function postSkipWaiting(worker) {
  try {
    worker.postMessage({ type: 'SKIP_WAITING' });
  } catch (err) {
    console.warn('[PWA] SKIP_WAITING postMessage failed:', err);
  }
}

/**
 * Activate the newest service worker, wipe caches, and hard-reload so installed
 * PWAs load the deploy that matches /version.json (not stale precached JS).
 */
export async function applyPwaUpdate(registration, updateHandler, targetVersion = null) {
  const ackVersion =
    targetVersion || (await fetchRemoteBuildVersion()) || APP_BUILD_VERSION;

  let reg = registration;
  let usedUnregister = false;

  try {
    if (!reg && 'serviceWorker' in navigator) {
      reg = await navigator.serviceWorker.getRegistration();
    }

    const needsNewBuild = ackVersion && ackVersion !== APP_BUILD_VERSION;

    if (reg) {
      await waitForWaitingWorker(reg, 12000);

      if (reg.waiting && navigator.serviceWorker.controller) {
        postSkipWaiting(reg.waiting);
        const activated = await waitForControllerChange(10000);
        if (!activated) {
          console.warn('[PWA] skipWaiting did not activate; unregistering service workers');
          await unregisterAllServiceWorkers();
          usedUnregister = true;
        }
      } else if (needsNewBuild) {
        // version.json is ahead but no waiting worker — old SW still controls stable /assets/*
        console.warn('[PWA] No waiting worker for new build; unregister + hard reload');
        await unregisterAllServiceWorkers();
        usedUnregister = true;
      }
    } else if (needsNewBuild) {
      await unregisterAllServiceWorkers();
      usedUnregister = true;
    }

    if (!usedUnregister && typeof updateHandler === 'function') {
      try {
        await updateHandler(true);
        if (reg?.waiting && navigator.serviceWorker.controller) {
          postSkipWaiting(reg.waiting);
          await waitForControllerChange(8000);
        }
      } catch (err) {
        console.warn('[PWA] updateHandler failed:', err);
        if (needsNewBuild) {
          await unregisterAllServiceWorkers();
          usedUnregister = true;
        }
      }
    }
  } catch (err) {
    console.error('[PWA] apply update error:', err);
    await unregisterAllServiceWorkers();
    usedUnregister = true;
  }

  await clearAllCaches();
  markUpdateAcknowledged(ackVersion);

  const url = new URL(window.location.href);
  url.searchParams.set('_pv', ackVersion || String(Date.now()));
  window.location.replace(url.toString());
}

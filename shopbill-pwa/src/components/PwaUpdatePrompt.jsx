import React, { useState, useEffect, useCallback, useRef } from 'react';

import { RefreshCw } from 'lucide-react';

import {

  APP_BUILD_VERSION,

  applyPwaUpdate,

  clearAllCaches,

  clearUpdateInProgress,

  isUpdateInProgress,

  fetchRemoteBuildVersion,

  getStoredBuildVersion,

  markUpdateAcknowledged,

  shouldShowUpdatePrompt,

  storeBuildVersion,

} from '../utils/pwaUpdate';



const CHECK_INTERVAL_MS = 2 * 60 * 1000;

const INITIAL_CHECK_MS = 1500;



/**

 * Detects new production builds via:

 * 1) waiting service worker (prompt registerType)

 * 2) /version.json mismatch (same SW URL across deploys)

 */

const PwaUpdatePrompt = () => {

  const [show, setShow] = useState(false);

  const [remoteVersion, setRemoteVersion] = useState(null);

  const [registration, setRegistration] = useState(null);

  const updateHandlerRef = useRef(null);

  const applyingRef = useRef(false);

  const remoteVersionRef = useRef(null);



  const promptUpdate = useCallback((reg, remote) => {

    if (remote && !shouldShowUpdatePrompt(remote)) return;

    if (reg) setRegistration(reg);

    if (remote) {

      setRemoteVersion(remote);

      remoteVersionRef.current = remote;

    }

    setShow(true);

  }, []);



  const checkBuildVersion = useCallback(async () => {

    const remote = await fetchRemoteBuildVersion();

    remoteVersionRef.current = remote;

    if (!shouldShowUpdatePrompt(remote)) {

      if (remote === APP_BUILD_VERSION) {

        storeBuildVersion(APP_BUILD_VERSION);

        clearUpdateInProgress();

      }

      return false;

    }

    let reg = null;

    try {

      reg = await navigator.serviceWorker?.getRegistration?.();

    } catch {

      /* ignore */

    }

    promptUpdate(reg, remote);

    return true;

  }, [promptUpdate]);



  const checkServiceWorkerUpdate = useCallback(

    async (forceCheck = false) => {

      if (!('serviceWorker' in navigator)) return false;



      try {

        const reg = await navigator.serviceWorker.getRegistration();

        if (!reg) return false;



        const remote =

          remoteVersionRef.current || (await fetchRemoteBuildVersion());

        remoteVersionRef.current = remote;



        if (remote && !shouldShowUpdatePrompt(remote)) {

          return false;

        }



        if (forceCheck) {

          try {

            await reg.update();

          } catch (err) {

            console.warn('[PWA] registration.update failed:', err);

          }

        }



        if (reg.waiting && navigator.serviceWorker.controller) {

          if (remote && !shouldShowUpdatePrompt(remote)) return false;

          promptUpdate(reg, remote);

          return true;

        }



        if (reg.installing) {

          reg.installing.addEventListener('statechange', () => {

            if (reg.waiting && navigator.serviceWorker.controller) {

              const r = remoteVersionRef.current;

              if (r && !shouldShowUpdatePrompt(r)) return;

              promptUpdate(reg, r);

            }

          });

        }

      } catch (err) {

        console.warn('[PWA] SW check failed:', err);

      }



      return false;

    },

    [promptUpdate]

  );



  const runAllChecks = useCallback(

    async (forceSw = false) => {

      if (applyingRef.current || isUpdateInProgress()) return;

      const sw = await checkServiceWorkerUpdate(forceSw);

      if (sw) return;

      await checkBuildVersion();

    },

    [checkServiceWorkerUpdate, checkBuildVersion]

  );



  useEffect(() => {

    void (async () => {

      const remote = await fetchRemoteBuildVersion();

      remoteVersionRef.current = remote;

      if (remote === APP_BUILD_VERSION) {

        storeBuildVersion(APP_BUILD_VERSION);

        clearUpdateInProgress();

      } else if (remote && getStoredBuildVersion() === remote) {

        clearUpdateInProgress();

      }

    })();



    const onUpdate = (e) => {

      const updateHandler = e.detail?.updateHandler;

      if (updateHandler) updateHandlerRef.current = updateHandler;

      void runAllChecks(false);

    };



    window.addEventListener('pwa-update-available', onUpdate);



    const initial = setTimeout(() => runAllChecks(true), INITIAL_CHECK_MS);

    const interval = setInterval(() => runAllChecks(true), CHECK_INTERVAL_MS);



    const onVisible = () => {

      if (!document.hidden && !applyingRef.current) void runAllChecks(true);

    };

    document.addEventListener('visibilitychange', onVisible);



    const onFocus = () => {

      if (!applyingRef.current) void runAllChecks(true);

    };

    window.addEventListener('focus', onFocus);



    return () => {

      window.removeEventListener('pwa-update-available', onUpdate);

      document.removeEventListener('visibilitychange', onVisible);

      window.removeEventListener('focus', onFocus);

      clearTimeout(initial);

      clearInterval(interval);

    };

  }, [runAllChecks]);



  const handleUpdate = async () => {

    if (applyingRef.current) return;

    applyingRef.current = true;

    setShow(false);



    const target =
      remoteVersion || remoteVersionRef.current || (await fetchRemoteBuildVersion()) || APP_BUILD_VERSION;

    try {
      let reg = registration;
      if (!reg && 'serviceWorker' in navigator) {
        reg = await navigator.serviceWorker.getRegistration();
      }
      if (!updateHandlerRef.current && window.__swRegistration) {
        updateHandlerRef.current = window.__swRegistration;
      }
      await applyPwaUpdate(reg, updateHandlerRef.current, target);

    } catch (err) {

      console.error('[PWA] apply update failed:', err);

      await clearAllCaches();

      const url = new URL(window.location.href);

      url.searchParams.set('_pv', target || String(Date.now()));

      window.location.replace(url.toString());

    }

  };



  if (!show) return null;



  return (

    <div

      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-950/95 p-4 backdrop-blur-md"

      role="dialog"

      aria-modal="true"

      aria-labelledby="pwa-update-title"

    >

      <div className="w-full max-w-sm rounded-2xl border border-indigo-400 bg-indigo-600 p-6 text-white shadow-2xl">

        <div className="flex flex-col items-center text-center">

          <div className="mb-4 rounded-full bg-indigo-500 p-4 shadow-inner">

            <RefreshCw className="h-8 w-8 animate-spin text-white" aria-hidden />

          </div>

          <h4 id="pwa-update-title" className="text-2xl font-extrabold leading-tight">

            Update required

          </h4>

          <p className="mt-2 text-sm text-indigo-100">

            A new version of Pocket POS is available. Update now to get the latest fixes and features.

          </p>

          {remoteVersion ? (

            <p className="mt-1 text-[10px] font-mono text-indigo-200/80">

              {APP_BUILD_VERSION.slice(0, 12)} → {remoteVersion.slice(0, 12)}

            </p>

          ) : null}

          <button

            type="button"

            onClick={handleUpdate}

            className="mt-6 w-full rounded-xl bg-white py-3 font-bold text-indigo-600 shadow-xl transition-all hover:bg-indigo-50 active:scale-95"

          >

            Update now

          </button>

        </div>

      </div>

    </div>

  );

};



export default PwaUpdatePrompt;



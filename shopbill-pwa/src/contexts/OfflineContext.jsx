import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../lib/apiClient';
import { subscribeConnectivity, isBrowserOnline, waitForNetworkReady } from '../offline/connectivity';
import { getActiveStoreId } from '../offline/db';
import { countPendingSync, flushSyncQueue } from '../offline/syncQueue';

const OfflineContext = createContext(null);

const PENDING_POLL_MS = 8000;
const MAX_AUTO_SYNC_ROUNDS = 5;

export function OfflineProvider({ children, isAuthenticated }) {
  const [isOnline, setIsOnline] = useState(isBrowserOnline);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const syncInFlightRef = useRef(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const autoSyncTimerRef = useRef(null);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const refreshPendingCount = useCallback(async () => {
    const count = await countPendingSync(getActiveStoreId());
    setPendingCount(count);
    return count;
  }, []);

  const syncNow = useCallback(async () => {
    if (!isBrowserOnline()) {
      return { synced: 0, failed: 0, skipped: true, reason: 'offline' };
    }

    if (syncInFlightRef.current) {
      return syncInFlightRef.current;
    }

    const run = async () => {
      setIsSyncing(true);
      try {
        const result = await flushSyncQueue(apiClient, { storeId: getActiveStoreId() });
        if (!result.skipped) setLastSyncAt(Date.now());
        const remaining = result.remaining ?? (await refreshPendingCount());
        return { ...result, remaining };
      } catch (e) {
        await refreshPendingCount();
        return { synced: 0, failed: 0, error: e };
      } finally {
        setIsSyncing(false);
        syncInFlightRef.current = null;
      }
    };

    syncInFlightRef.current = run();
    return syncInFlightRef.current;
  }, [refreshPendingCount]);

  const runAutoSync = useCallback(async () => {
    if (!isAuthenticatedRef.current || !isBrowserOnline()) return;

    const ready = await waitForNetworkReady();
    if (!ready || !isBrowserOnline()) return;

    let remaining = await refreshPendingCount();
    if (remaining === 0) return;

    for (let round = 0; round < MAX_AUTO_SYNC_ROUNDS && remaining > 0; round += 1) {
      if (!isBrowserOnline()) break;
      const result = await syncNow();
      remaining = result?.remaining ?? (await refreshPendingCount());
      if ((result?.synced ?? 0) === 0 && remaining > 0) {
        await new Promise((r) => setTimeout(r, 1200 * (round + 1)));
      }
    }
  }, [syncNow, refreshPendingCount]);

  const scheduleAutoSync = useCallback(() => {
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }
    autoSyncTimerRef.current = setTimeout(() => {
      autoSyncTimerRef.current = null;
      runAutoSync();
    }, 100);
  }, [runAutoSync]);

  useEffect(() => {
    return () => {
      if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return subscribeConnectivity((online) => {
      setIsOnline(online);
      if (online) {
        scheduleAutoSync();
      }
    });
  }, [scheduleAutoSync]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPendingCount(0);
      return undefined;
    }
    refreshPendingCount();
    return undefined;
  }, [isAuthenticated, refreshPendingCount]);

  // While online: keep trying until the queue is empty.
  useEffect(() => {
    if (!isAuthenticated || !isOnline) return undefined;

    scheduleAutoSync();

    const interval = setInterval(async () => {
      if (!isBrowserOnline()) return;
      const pending = await refreshPendingCount();
      if (pending > 0) {
        await runAutoSync();
      }
    }, PENDING_POLL_MS);

    return () => clearInterval(interval);
  }, [isAuthenticated, isOnline, scheduleAutoSync, runAutoSync, refreshPendingCount]);

  const value = useMemo(
    () => ({
      isOnline,
      pendingCount,
      isSyncing,
      lastSyncAt,
      syncNow,
      refreshPendingCount,
      runAutoSync,
    }),
    [isOnline, pendingCount, isSyncing, lastSyncAt, syncNow, refreshPendingCount, runAutoSync]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    return {
      isOnline: isBrowserOnline(),
      pendingCount: 0,
      isSyncing: false,
      lastSyncAt: null,
      syncNow: async () => ({}),
      refreshPendingCount: async () => 0,
      runAutoSync: async () => {},
    };
  }
  return ctx;
}

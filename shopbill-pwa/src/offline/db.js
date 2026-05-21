import Dexie from 'dexie';

export const offlineDb = new Dexie('PocketPOSOffline');

offlineDb.version(1).stores({
  catalog: '[storeId+kind], storeId, kind, updatedAt',
  syncQueue: '++id, storeId, status, type, createdAt',
  meta: 'key',
});

/** Match App outlet selection (lastSelectedOutletId + activeStoreId). */
export function getActiveStoreId() {
  try {
    const lastSelected = localStorage.getItem('lastSelectedOutletId');
    if (lastSelected && String(lastSelected).trim()) {
      return String(lastSelected).trim();
    }
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return String(currentUser?.activeStoreId || '').trim() || null;
  } catch {
    return null;
  }
}

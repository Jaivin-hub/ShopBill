import { offlineDb, getActiveStoreId } from './db';

const CATALOG_KINDS = ['inventory', 'customers', 'offers'];

export async function savePosCatalog(storeId, { inventory, customers, offers }) {
  if (!storeId) return;
  const updatedAt = Date.now();
  const rows = [
    { storeId, kind: 'inventory', data: inventory ?? [], updatedAt },
    { storeId, kind: 'customers', data: customers ?? [], updatedAt },
    { storeId, kind: 'offers', data: offers ?? [], updatedAt },
  ];
  await offlineDb.catalog.bulkPut(rows);
  await offlineDb.meta.put({ key: `catalog:${storeId}`, value: { updatedAt } });
}

export async function loadPosCatalog(storeId) {
  if (!storeId) return null;
  const rows = await offlineDb.catalog.where('storeId').equals(storeId).toArray();
  if (!rows.length) return null;
  const out = { inventory: [], customers: [], offers: [] };
  rows.forEach((row) => {
    if (row.kind === 'inventory') out.inventory = row.data || [];
    if (row.kind === 'customers') out.customers = row.data || [];
    if (row.kind === 'offers') out.offers = row.data || [];
  });
  const hasAny = out.inventory.length > 0 || out.customers.length > 0;
  return hasAny ? out : null;
}

export async function hasPosCatalog(storeId) {
  const loaded = await loadPosCatalog(storeId);
  return Boolean(loaded?.inventory?.length);
}

export { CATALOG_KINDS, getActiveStoreId };

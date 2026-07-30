import { offlineDb } from './db';
import { isBrowserOnline } from './connectivity';
import { listPendingSync } from './syncQueue';

const MAX_RECENT = 10;
const KIND = 'recentSales';

export function saleRecordFromOfflineBody(body, clientMutationId, createdAtMs) {
  const id = clientMutationId || body?.offlineClientId || `offline-${Date.now()}`;
  const customerName = body?.customer || 'Walk-in Customer';
  const customerId = body?.customerId
    ? { _id: body.customerId, name: customerName }
    : null;
  return {
    _id: id,
    offlinePending: true,
    subtotalAmount: Number(body?.subtotalAmount) || Number(body?.totalAmount) || 0,
    billDiscount: Number(body?.billDiscount) || 0,
    totalAmount: Number(body?.totalAmount) || 0,
    paymentMethod: body?.paymentMethod || 'Cash',
    paidVia: body?.paidVia || null,
    customerName,
    customerId,
    timestamp: new Date(createdAtMs || Date.now()).toISOString(),
    amountPaid: Number(body?.amountPaid) || 0,
    amountCredited: Number(body?.amountCredited) || 0,
    items: Array.isArray(body?.items) ? body.items.map((it) => ({ ...it })) : [],
  };
}

export async function loadRecentSalesCache(storeId) {
  if (!storeId) return null;
  const row = await offlineDb.catalog.get([storeId, KIND]);
  if (!row?.data) return null;
  return {
    sales: Array.isArray(row.data.sales) ? row.data.sales : [],
    lastReadAt: row.data.lastReadAt ?? null,
  };
}

export async function saveRecentSalesCache(storeId, { sales, lastReadAt }) {
  if (!storeId) return;
  const trimmed = (sales || []).slice(0, MAX_RECENT);
  await offlineDb.catalog.put({
    storeId,
    kind: KIND,
    data: {
      sales: trimmed,
      lastReadAt: lastReadAt != null ? lastReadAt : null,
    },
    updatedAt: Date.now(),
  });
}

export async function mergeRecentSalesForDisplay(storeId) {
  const cached = await loadRecentSalesCache(storeId);
  const base = cached?.sales || [];
  const pending = await listPendingSync(storeId);
  const pendingSales = pending
    .filter((job) => job.type === 'sale' && job.body)
    .map((job) => saleRecordFromOfflineBody(job.body, job.clientMutationId, job.createdAt))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const seen = new Set();
  const merged = [];
  for (const sale of [...pendingSales, ...base]) {
    const key = String(sale._id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(sale);
    if (merged.length >= MAX_RECENT) break;
  }

  return {
    sales: merged,
    lastReadAt: cached?.lastReadAt ?? null,
  };
}

export async function fetchRecentSalesWithCache({ apiClient, salesUrl, storeId }) {
  const parseLastReadAt = (value) => {
    if (value == null) return null;
    return value instanceof Date ? value : new Date(value);
  };

  if (isBrowserOnline()) {
    try {
      const response = await apiClient.get(`${salesUrl}?limit=10`);
      const sales = response.data?.sales || [];
      const lastReadAt = response.data?.lastReadAt ?? null;
      await saveRecentSalesCache(storeId, { sales, lastReadAt });
      return {
        sales,
        lastReadAt: parseLastReadAt(lastReadAt),
        source: 'network',
      };
    } catch (error) {
      if (error?.cancelled || error?.message?.includes?.('cancelled')) {
        return { sales: [], lastReadAt: null, source: 'unavailable', cancelled: true };
      }
      const merged = await mergeRecentSalesForDisplay(storeId);
      if (merged.sales.length) {
        return {
          sales: merged.sales,
          lastReadAt: parseLastReadAt(merged.lastReadAt),
          source: 'cache',
          error,
        };
      }
      return { sales: [], lastReadAt: null, source: 'unavailable', error };
    }
  }

  const merged = await mergeRecentSalesForDisplay(storeId);
  return {
    sales: merged.sales,
    lastReadAt: parseLastReadAt(merged.lastReadAt),
    source: merged.sales.length ? 'cache' : 'unavailable',
  };
}

export async function prependRecentSale(storeId, sale) {
  const cached = await loadRecentSalesCache(storeId);
  const sales = [sale, ...(cached?.sales || [])]
    .filter((s, index, arr) => arr.findIndex((x) => String(x._id) === String(s._id)) === index)
    .slice(0, MAX_RECENT);
  await saveRecentSalesCache(storeId, {
    sales,
    lastReadAt: cached?.lastReadAt ?? null,
  });
  return sales;
}

export function buildOfflineSaleRecord(salePayload) {
  return saleRecordFromOfflineBody(salePayload, salePayload.offlineClientId, Date.now());
}

export async function markRecentSalesReadLocal(storeId) {
  const now = new Date().toISOString();
  const cached = await loadRecentSalesCache(storeId);
  await saveRecentSalesCache(storeId, {
    sales: cached?.sales || [],
    lastReadAt: now,
  });
  return now;
}

export async function findCachedSaleById(storeId, saleId) {
  const merged = await mergeRecentSalesForDisplay(storeId);
  return merged.sales.find((s) => String(s._id) === String(saleId)) || null;
}

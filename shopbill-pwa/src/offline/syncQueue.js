import API from '../config/api.js';
import { offlineDb, getActiveStoreId } from './db';
import { isBrowserOnline } from './connectivity';

function resolveStoreId(storeId) {
  const sid = String(storeId || getActiveStoreId() || '').trim();
  return sid || null;
}

export async function enqueueMutation({
  storeId,
  type,
  url,
  method = 'POST',
  body,
  clientMutationId,
}) {
  const sid = resolveStoreId(storeId);
  if (!sid) throw new Error('No active store for offline queue.');
  const id = clientMutationId || (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await offlineDb.syncQueue.add({
    storeId: sid,
    type,
    url,
    method,
    body,
    clientMutationId: id,
    status: 'pending',
    createdAt: Date.now(),
    attempts: 0,
    lastError: '',
  });
  return id;
}

export async function countPendingSync(storeId) {
  const rows = await listPendingSync(storeId);
  return rows.length;
}

export async function listPendingSync(storeId) {
  const all = await offlineDb.syncQueue.toArray();
  const rows = all.filter((r) => r.status === 'pending');
  const sid = resolveStoreId(storeId);
  if (!sid) {
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  }
  const forStore = rows.filter((r) => String(r.storeId) === String(sid));
  // Outlet id in queue may differ from current header — still flush all pending.
  if (forStore.length > 0 || rows.length === 0) {
    return forStore.sort((a, b) => a.createdAt - b.createdAt);
  }
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getPendingSyncSummary(storeId) {
  const rows = await listPendingSync(storeId);
  const firstError = rows.find((r) => r.lastError)?.lastError || '';
  return { count: rows.length, firstError };
}

const isNetworkError = (error) => {
  if (!error) return true;
  if (error?.cancelled) return false;
  const msg = String(error.message || '');
  if (msg.includes('Network Error') || msg.includes('timeout')) return true;
  return !error.response;
};

function normalizeSyncUrl(url) {
  const raw = String(url || '');
  const base = (import.meta.env.VITE_API_BASE_URL || 'https://server.pocketpos.io/api').replace(/\/$/, '');
  if (raw.startsWith(base)) {
    const path = raw.slice(base.length);
    return path.startsWith('/') ? path : `/${path}`;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return raw.startsWith('/') ? raw : `/${raw}`;
}

const SYNC_TYPE_ORDER = { customer: 0, bill_draft_save: 1, sale: 2, bill_draft_delete: 3 };
const MAX_SYNC_PASSES = 8;

const isMongoObjectId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ''));

async function getMappedCustomerId(offlineClientId) {
  if (!offlineClientId) return null;
  const row = await offlineDb.meta.get(`custMap:${offlineClientId}`);
  return row?.value ? String(row.value) : null;
}

async function saveCustomerMapping(offlineClientId, serverId) {
  if (!offlineClientId || !serverId) return;
  await offlineDb.meta.put({
    key: `custMap:${offlineClientId}`,
    value: String(serverId),
  });
}

async function getMappedDraftId(offlineDraftId) {
  if (!offlineDraftId) return null;
  const row = await offlineDb.meta.get(`draftMap:${offlineDraftId}`);
  return row?.value ? String(row.value) : null;
}

async function saveDraftMapping(offlineDraftId, serverId) {
  if (!offlineDraftId || !serverId) return;
  await offlineDb.meta.put({
    key: `draftMap:${offlineDraftId}`,
    value: String(serverId),
  });
}

async function resolveDraftJobUrl(job) {
  let url = normalizeSyncUrl(job.url);
  const match = url.match(/^\/bill-drafts\/([^/?]+)/);
  if (!match) return url;
  const id = match[1];
  if (isMongoObjectId(id)) return url;
  const mapped = await getMappedDraftId(id);
  if (!mapped) return null;
  return `/bill-drafts/${mapped}`;
}

function sanitizeCustomerBody(body) {
  if (!body || typeof body !== 'object') return {};
  return {
    name: body.name,
    phone: body.phone,
    creditLimit: body.creditLimit,
    initialDue: body.initialDue ?? 0,
  };
}

function sanitizeSaleBody(body) {
  if (!body || typeof body !== 'object') return {};
  const out = { ...body };
  delete out.offlineClientId;
  if (out.customerId && !isMongoObjectId(out.customerId)) {
    delete out.customerId;
  }
  return out;
}

const isWalkInCustomerId = (id) => {
  const s = String(id || '').toLowerCase();
  return !s || s === 'walk_in' || s === 'walk-in';
};

async function sanitizeBillDraftBody(body) {
  if (!body || typeof body !== 'object') return {};
  const out = { ...body };
  delete out.offlineDraftId;
  if (out.customerId && !isMongoObjectId(out.customerId) && !isWalkInCustomerId(out.customerId)) {
    const mapped = await getMappedCustomerId(out.customerId);
    if (mapped) out.customerId = mapped;
    else delete out.customerId;
  } else if (out.customerId && !isMongoObjectId(out.customerId)) {
    delete out.customerId;
  }
  return out;
}

async function resolveSaleBody(job) {
  const raw = job.body || {};
  if (!raw.customerId || isWalkInCustomerId(raw.customerId)) {
    return sanitizeSaleBody(raw);
  }
  const cid = String(raw.customerId);
  if (isMongoObjectId(cid)) return sanitizeSaleBody(raw);
  const mapped = await getMappedCustomerId(cid);
  if (!mapped) return null;
  return sanitizeSaleBody({ ...raw, customerId: mapped });
}

function syncHeaders(job) {
  return {
    'x-offline-client-id': job.clientMutationId,
    'x-skip-attendance-prompt': '1',
  };
}

async function findExistingCustomerByPhone(apiClient, phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length !== 10) return null;
  try {
    const res = await apiClient.get(normalizeSyncUrl(API.customers), {
      headers: { 'x-skip-attendance-prompt': '1' },
    });
    const list = Array.isArray(res.data) ? res.data : [];
    return list.find((c) => String(c.phone || '').replace(/\D/g, '') === digits) || null;
  } catch {
    return null;
  }
}

async function processSyncJob(apiClient, job) {
  if (job.type === 'bill_draft_delete') {
    const url = await resolveDraftJobUrl(job);
    if (!url) {
      return {
        ok: false,
        retryLater: true,
        error: 'Waiting for draft to sync first',
      };
    }
    try {
      await apiClient.request({
        method: 'DELETE',
        url,
        headers: syncHeaders(job),
      });
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 404) throw err;
    }
    await offlineDb.syncQueue.update(job.id, {
      status: 'synced',
      syncedAt: Date.now(),
      lastError: '',
    });
    return { ok: true };
  }

  let body = job.body;
  if (job.type === 'customer') {
    body = sanitizeCustomerBody(job.body);
  } else if (job.type === 'bill_draft_save') {
    body = await sanitizeBillDraftBody(job.body);
  } else if (job.type === 'sale') {
    body = await resolveSaleBody(job);
    if (body === null) {
      return {
        ok: false,
        retryLater: true,
        error: 'Waiting for customer account to sync first',
      };
    }
  }

  let url = normalizeSyncUrl(job.url);
  if (job.type === 'bill_draft_save') {
    const resolved = await resolveDraftJobUrl({ ...job, url });
    if (job.method === 'PUT' && resolved === null) {
      return {
        ok: false,
        retryLater: true,
        error: 'Waiting for draft to be created on server',
      };
    }
    if (resolved) url = resolved;
    if (job.method === 'POST') url = normalizeSyncUrl(API.billDrafts || '/bill-drafts');
  }

  const config = {
    method: job.method || 'POST',
    url,
    data: body,
    headers: syncHeaders(job),
  };

  const response = await apiClient.request(config);

  if (job.type === 'customer') {
    const created = response?.data?.customer;
    const serverId = created?._id || created?.id;
    if (serverId && job.clientMutationId) {
      await saveCustomerMapping(job.clientMutationId, serverId);
    }
  }

  if (job.type === 'bill_draft_save' && job.method === 'POST') {
    const created = response?.data?.draft;
    const serverId = created?._id || created?.id;
    const offlineId = job.body?.offlineDraftId;
    if (serverId && offlineId && String(offlineId).startsWith('offline-draft-')) {
      await saveDraftMapping(offlineId, serverId);
    }
  }

  await offlineDb.syncQueue.update(job.id, {
    status: 'synced',
    syncedAt: Date.now(),
    lastError: '',
  });

  return { ok: true };
}

async function handleCustomerDuplicate(apiClient, job, error) {
  if (job.type !== 'customer' || error?.response?.status !== 400) return false;
  const phone = job.body?.phone;
  const existing = await findExistingCustomerByPhone(apiClient, phone);
  if (!existing?._id) return false;
  await saveCustomerMapping(job.clientMutationId, existing._id);
  await offlineDb.syncQueue.update(job.id, {
    status: 'synced',
    syncedAt: Date.now(),
    lastError: '',
  });
  return true;
}

async function runSyncPass(apiClient, storeId, onItemSynced) {
  const pending = (await listPendingSync(storeId)).sort(
    (a, b) => (SYNC_TYPE_ORDER[a.type] ?? 9) - (SYNC_TYPE_ORDER[b.type] ?? 9)
  );

  let synced = 0;
  let failed = 0;

  for (const job of pending) {
    if (!isBrowserOnline()) break;
    try {
      const result = await processSyncJob(apiClient, job);
      if (result.ok) {
        synced += 1;
        onItemSynced?.(job);
        continue;
      }
      if (result.retryLater) {
        failed += 1;
        await offlineDb.syncQueue.update(job.id, {
          attempts: (job.attempts || 0) + 1,
          lastError: result.error || 'Waiting for customer account',
        });
        continue;
      }
    } catch (error) {
      if (error?.cancelled) {
        failed += 1;
        await offlineDb.syncQueue.update(job.id, {
          attempts: (job.attempts || 0) + 1,
          lastError: 'Sync was interrupted — tap Sync now again',
        });
        continue;
      }

      if (await handleCustomerDuplicate(apiClient, job, error)) {
        synced += 1;
        onItemSynced?.(job);
        continue;
      }

      if (isNetworkError(error) || !isBrowserOnline()) break;

      failed += 1;
      const errMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Sync failed';
      await offlineDb.syncQueue.update(job.id, {
        attempts: (job.attempts || 0) + 1,
        lastError: typeof errMsg === 'string' ? errMsg : 'Sync failed',
      });
    }
  }

  return { synced, failed };
}

export async function flushSyncQueue(apiClient, { onItemSynced, storeId } = {}) {
  if (!isBrowserOnline() || !apiClient) return { synced: 0, failed: 0, skipped: true };

  let totalSynced = 0;
  let totalFailed = 0;

  for (let pass = 0; pass < MAX_SYNC_PASSES; pass += 1) {
    const before = await countPendingSync(storeId);
    if (before === 0) break;

    const { synced, failed } = await runSyncPass(apiClient, storeId, onItemSynced);
    totalSynced += synced;
    totalFailed += failed;

    const after = await countPendingSync(storeId);
    if (after === 0 || synced === 0) break;
  }

  const summary = await getPendingSyncSummary(storeId);
  return {
    synced: totalSynced,
    failed: totalFailed,
    skipped: false,
    remaining: summary.count,
    firstError: summary.firstError,
  };
}

export async function enqueueOfflineCustomer(customerData, storeId) {
  return enqueueMutation({
    storeId,
    type: 'customer',
    url: API.customers,
    method: 'POST',
    body: {
      ...customerData,
      offlineClientId: customerData.offlineClientId || undefined,
    },
    clientMutationId: customerData.offlineClientId,
  });
}

export async function enqueueOfflineSale(saleData, storeId) {
  return enqueueMutation({
    storeId,
    type: 'sale',
    url: API.sales,
    method: 'POST',
    body: {
      ...saleData,
      offlineClientId: saleData.offlineClientId || undefined,
    },
    clientMutationId: saleData.offlineClientId,
  });
}

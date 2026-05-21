import API from '../config/api';
import { isBrowserOnline } from './connectivity';
import { offlineDb } from './db';
import { listPendingSync, enqueueMutation } from './syncQueue';

const KIND = 'billDrafts';
const MAX_DRAFTS = 60;
export const OFFLINE_DRAFT_PREFIX = 'offline-draft-';

const isMongoObjectId = (id) => /^[a-f0-9]{24}$/i.test(String(id || ''));

export function isOfflineDraftId(id) {
  return String(id || '').startsWith(OFFLINE_DRAFT_PREFIX);
}

function buildLabel(body) {
  const lines = body?.items || [];
  const first = lines[0]?.name || 'Bill';
  return `${String(first).slice(0, 40)}${lines.length > 1 ? ` +${lines.length - 1}` : ''}`;
}

export function draftFromSaveBody(body, { _id, updatedAt, offlinePending = false } = {}) {
  const now = updatedAt || new Date().toISOString();
  const lines = Array.isArray(body.items) ? body.items.map((it) => ({ ...it })) : [];
  return {
    _id,
    label: buildLabel(body),
    items: lines,
    totalAmount: Number(body.totalAmount) || 0,
    customerId: body.customerId || null,
    customerName: body.customerName || '',
    updatedAt: now,
    createdAt: now,
    offlinePending: Boolean(offlinePending),
  };
}

export async function loadBillDraftsCache(storeId) {
  if (!storeId) return [];
  const row = await offlineDb.catalog.get([storeId, KIND]);
  return Array.isArray(row?.data) ? row.data : [];
}

export async function saveBillDraftsCache(storeId, drafts) {
  if (!storeId) return;
  await offlineDb.catalog.put({
    storeId,
    kind: KIND,
    data: (drafts || []).slice(0, MAX_DRAFTS),
    updatedAt: Date.now(),
  });
}

async function getMappedCustomerId(offlineClientId) {
  if (!offlineClientId) return null;
  const row = await offlineDb.meta.get(`custMap:${offlineClientId}`);
  return row?.value ? String(row.value) : null;
}

function resolveCustomerIdForDraft(customerId) {
  if (!customerId || String(customerId) === 'walk_in') return { customerId: null, customerName: '' };
  const cid = String(customerId);
  if (isMongoObjectId(cid)) return { customerId: cid, customerName: null };
  return { customerId: cid, customerName: null };
}

/** Merge server/cache list with pending save/delete jobs. */
export async function mergeBillDraftsForDisplay(storeId, baseDrafts = []) {
  const pending = await listPendingSync(storeId);
  const deletedIds = new Set();
  const byId = new Map();

  (baseDrafts || []).forEach((d) => {
    if (d?._id) byId.set(String(d._id), { ...d });
  });

  pending
    .filter((j) => j.type === 'bill_draft_delete')
    .forEach((j) => {
      const id = j.body?.draftId || j.clientMutationId?.replace(/^del-/, '');
      if (id) deletedIds.add(String(id));
    });

  const saves = pending
    .filter((j) => j.type === 'bill_draft_save' && j.body)
    .sort((a, b) => a.createdAt - b.createdAt);

  for (const job of saves) {
    const draftId = job.body.offlineDraftId || job.clientMutationId;
    if (!draftId || deletedIds.has(String(draftId))) continue;
    const draft = draftFromSaveBody(job.body, {
      _id: draftId,
      updatedAt: new Date(job.createdAt).toISOString(),
      offlinePending: true,
    });
    byId.set(String(draftId), draft);
  }

  deletedIds.forEach((id) => byId.delete(id));

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
  );
}

export async function fetchBillDraftsWithCache({ apiClient, draftsUrl, storeId }) {
  if (isBrowserOnline()) {
    try {
      const res = await apiClient.get(draftsUrl, { headers: { 'x-skip-attendance-prompt': '1' } });
      const serverDrafts = res.data?.drafts || [];
      const merged = await mergeBillDraftsForDisplay(storeId, serverDrafts);
      await saveBillDraftsCache(storeId, merged);
      return { drafts: merged, source: 'network' };
    } catch (error) {
      if (error?.cancelled) return { drafts: [], source: 'unavailable', cancelled: true };
      const cached = await loadBillDraftsCache(storeId);
      const merged = await mergeBillDraftsForDisplay(storeId, cached);
      if (merged.length) return { drafts: merged, source: 'cache', error };
      return { drafts: [], source: 'unavailable', error };
    }
  }

  const cached = await loadBillDraftsCache(storeId);
  const merged = await mergeBillDraftsForDisplay(storeId, cached);
  return {
    drafts: merged,
    source: merged.length ? 'cache' : 'unavailable',
  };
}

async function upsertDraftInCache(storeId, draft) {
  const list = await loadBillDraftsCache(storeId);
  const id = String(draft._id);
  const next = [draft, ...list.filter((d) => String(d._id) !== id)].slice(0, MAX_DRAFTS);
  await saveBillDraftsCache(storeId, next);
  return next;
}

export async function saveBillDraftOffline({ storeId, body, draftId }) {
  const sid = storeId;
  if (!sid) throw new Error('No active store selected.');

  const isServerDraft = draftId && isMongoObjectId(draftId);
  let offlineDraftId;
  if (isServerDraft) {
    offlineDraftId = String(draftId);
  } else if (draftId && isOfflineDraftId(draftId)) {
    offlineDraftId = String(draftId);
  } else {
    offlineDraftId = `${OFFLINE_DRAFT_PREFIX}${
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now()
    }`;
  }

  const payload = { ...body, offlineDraftId };

  if (payload.customerId && !isMongoObjectId(payload.customerId)) {
    const mapped = await getMappedCustomerId(payload.customerId);
    if (mapped) payload.customerId = mapped;
  }

  const clientMutationId = isServerDraft ? `draft-${draftId}` : offlineDraftId;
  const pending = await listPendingSync(sid);
  const existing = pending.find(
    (j) => j.type === 'bill_draft_save' && String(j.clientMutationId) === String(clientMutationId)
  );

  const jobFields = {
    type: 'bill_draft_save',
    url: isServerDraft ? API.billDraftById(draftId) : API.billDrafts,
    method: isServerDraft ? 'PUT' : 'POST',
    body: payload,
    clientMutationId,
  };

  if (existing) {
    await offlineDb.syncQueue.update(existing.id, {
      body: payload,
      url: jobFields.url,
      method: jobFields.method,
      createdAt: Date.now(),
    });
  } else {
    await enqueueMutation({ storeId: sid, ...jobFields });
  }

  const draft = draftFromSaveBody(payload, {
    _id: isServerDraft ? draftId : offlineDraftId,
    offlinePending: !isServerDraft,
  });
  const drafts = await upsertDraftInCache(sid, draft);
  return { draft, drafts, source: 'offline' };
}

export async function saveBillDraftWithCache({
  apiClient,
  draftsUrl,
  draftById,
  storeId,
  body,
  draftId,
}) {
  if (draftId && isOfflineDraftId(draftId)) {
    return saveBillDraftOffline({ storeId, body, draftId });
  }

  if (isBrowserOnline()) {
    try {
      let draft;
      let list;
      if (draftId && isMongoObjectId(draftId)) {
        const res = await apiClient.put(draftById(draftId), body, {
          headers: { 'x-skip-attendance-prompt': '1' },
        });
        draft = res.data?.draft;
        const cached = await loadBillDraftsCache(storeId);
        list = await mergeBillDraftsForDisplay(storeId, cached);
        if (draft?._id) {
          list = await upsertDraftInCache(storeId, draft);
        } else {
          await fetchBillDraftsWithCache({ apiClient, draftsUrl, storeId });
          list = (await loadBillDraftsCache(storeId));
        }
      } else {
        const res = await apiClient.post(draftsUrl, body, {
          headers: { 'x-skip-attendance-prompt': '1' },
        });
        draft = res.data?.draft;
        if (draft?._id) {
          list = await upsertDraftInCache(storeId, draft);
          list = await mergeBillDraftsForDisplay(storeId, list);
          await saveBillDraftsCache(storeId, list);
        } else {
          const fetched = await fetchBillDraftsWithCache({ apiClient, draftsUrl, storeId });
          list = fetched.drafts;
          draft = list[0];
        }
      }
      return { draft, drafts: list, source: 'network' };
    } catch (error) {
      if (error?.cancelled) throw error;
    }
  }
  return saveBillDraftOffline({ storeId, body, draftId });
}

async function cancelPendingDraftSave(storeId, draftId) {
  const id = String(draftId);
  const pending = await listPendingSync(storeId);
  for (const j of pending) {
    if (j.type !== 'bill_draft_save') continue;
    const matches =
      String(j.clientMutationId) === id ||
      String(j.clientMutationId) === `draft-${id}` ||
      String(j.body?.offlineDraftId) === id;
    if (!matches) continue;
    await offlineDb.syncQueue.update(j.id, {
      status: 'synced',
      syncedAt: Date.now(),
      lastError: 'cancelled',
    });
  }
}

export async function deleteBillDraftOffline({ storeId, draftId }) {
  const sid = storeId;
  if (!sid || !draftId) return { drafts: [] };

  const id = String(draftId);

  if (isMongoObjectId(id)) {
    await enqueueMutation({
      storeId: sid,
      type: 'bill_draft_delete',
      method: 'DELETE',
      url: API.billDraftById(id),
      body: { draftId: id },
      clientMutationId: `del-${id}`,
    });
  } else {
    await cancelPendingDraftSave(sid, id);
  }

  const list = (await loadBillDraftsCache(sid)).filter((d) => String(d._id) !== id);
  await saveBillDraftsCache(sid, list);
  const merged = await mergeBillDraftsForDisplay(sid, list);
  await saveBillDraftsCache(sid, merged);
  return { drafts: merged, source: 'offline' };
}

export async function deleteBillDraftWithCache({ apiClient, draftById, storeId, draftId }) {
  if (isBrowserOnline() && isMongoObjectId(draftId)) {
    try {
      await apiClient.delete(draftById(draftId), { headers: { 'x-skip-attendance-prompt': '1' } });
      const list = (await loadBillDraftsCache(storeId)).filter((d) => String(d._id) !== String(draftId));
      await saveBillDraftsCache(storeId, list);
      const merged = await mergeBillDraftsForDisplay(storeId, list);
      await saveBillDraftsCache(storeId, merged);
      return { drafts: merged, source: 'network' };
    } catch (error) {
      if (error?.cancelled) throw error;
    }
  }
  return deleteBillDraftOffline({ storeId, draftId });
}

export async function removeDraftFromCacheAfterSale(storeId, draftId) {
  if (!storeId || !draftId) return;
  const list = (await loadBillDraftsCache(storeId)).filter((d) => String(d._id) !== String(draftId));
  await saveBillDraftsCache(storeId, list);
}

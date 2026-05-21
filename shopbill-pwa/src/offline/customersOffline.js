import API from '../config/api';
import { isBrowserOnline } from './connectivity';
import { loadPosCatalog, savePosCatalog } from './catalogCache';
import { enqueueMutation, listPendingSync } from './syncQueue';
import { getActiveStoreId } from './db';

export const OFFLINE_CUSTOMER_PREFIX = 'offline-cust-';

export function isOfflineCustomerId(id) {
  const s = String(id || '');
  return s.startsWith(OFFLINE_CUSTOMER_PREFIX) || !/^[a-f0-9]{24}$/i.test(s);
}

export function customerRecordFromOfflineBody(body, clientMutationId) {
  const id = clientMutationId || body?.offlineClientId;
  const phone = String(body?.phone || '').replace(/[^0-9]/g, '');
  return {
    _id: id,
    id,
    name: body?.name || 'Customer',
    phone,
    creditLimit: Math.max(0, parseFloat(body?.creditLimit) || 0),
    outstandingCredit: Math.max(0, parseFloat(body?.initialDue) || 0),
    offlinePending: true,
  };
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

export function findCustomerByPhone(customers, phone) {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  return (customers || []).find(
    (c) => normalizePhone(c.phone || c.mobile) === digits
  );
}

export async function mergeCustomersWithPending(storeId, baseCustomers = []) {
  const pending = await listPendingSync(storeId);
  const pendingRows = pending
    .filter((job) => job.type === 'customer' && job.body)
    .map((job) => customerRecordFromOfflineBody(job.body, job.clientMutationId));

  const seen = new Set();
  const merged = [];
  for (const c of [...pendingRows, ...baseCustomers]) {
    const key = String(c._id || c.id);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(c);
  }
  return merged;
}

async function appendCustomerToCatalog(storeId, customer) {
  const cached = await loadPosCatalog(storeId);
  const existing = cached?.customers || [];
  const id = String(customer._id || customer.id);
  const next = [customer, ...existing.filter((c) => String(c._id || c.id) !== id)];
  await savePosCatalog(storeId, {
    inventory: cached?.inventory || [],
    customers: next,
    offers: cached?.offers || [],
  });
}

/**
 * Register a credit customer (online API or offline queue + local catalog).
 */
export async function registerCustomerWithCache({ apiClient, payload, storeId: storeIdArg }) {
  const storeId = storeIdArg || getActiveStoreId();
  if (!storeId) throw new Error('No active store selected.');

  const name = String(payload?.name || '').trim();
  const phone = normalizePhone(payload?.phone);
  const creditLimit = Math.max(0, parseFloat(payload?.creditLimit) || 0);
  const initialDue = Math.max(0, parseFloat(payload?.initialDue) || 0);

  if (!name) throw new Error('Customer name is required.');
  if (phone.length < 10) throw new Error('Phone number must be 10 digits.');
  if (!/^[6-9]/.test(phone)) throw new Error('Phone number must start with 6, 7, 8, or 9.');

  const cached = await loadPosCatalog(storeId);
  const merged = await mergeCustomersWithPending(storeId, cached?.customers || []);
  const duplicate = findCustomerByPhone(merged, phone);
  if (duplicate) {
    throw new Error(`Phone number is already associated with customer: ${duplicate.name}`);
  }

  const body = { name, phone, creditLimit, initialDue };

  if (isBrowserOnline()) {
    const response = await apiClient.post(API.customers, body);
    const customer = response.data?.customer ?? (response.data?._id ? response.data : null);
    if (!customer?._id && !customer?.id) {
      throw new Error('Customer created but invalid response.');
    }
    const normalized = { ...customer, id: customer._id || customer.id };
    await appendCustomerToCatalog(storeId, normalized);
    return { customer: normalized, source: 'network' };
  }

  const offlineId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? `${OFFLINE_CUSTOMER_PREFIX}${crypto.randomUUID()}`
      : `${OFFLINE_CUSTOMER_PREFIX}${Date.now()}`;

  const localCustomer = {
    _id: offlineId,
    id: offlineId,
    name,
    phone,
    creditLimit,
    outstandingCredit: initialDue,
    offlinePending: true,
  };

  await enqueueMutation({
    storeId,
    type: 'customer',
    url: API.customers,
    method: 'POST',
    body: { ...body, offlineClientId: offlineId },
    clientMutationId: offlineId,
  });

  await appendCustomerToCatalog(storeId, localCustomer);
  return { customer: localCustomer, source: 'offline' };
}

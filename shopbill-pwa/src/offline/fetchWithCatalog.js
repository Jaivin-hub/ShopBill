import { isBrowserOnline } from './connectivity';
import { loadPosCatalog, savePosCatalog } from './catalogCache';
import { mergeCustomersWithPending } from './customersOffline';

/**
 * Load inventory list: network when online, else IndexedDB catalog from last Billing/Stock sync.
 * @returns {{ data: array|null, source: 'network'|'cache'|'unavailable', error?: Error }}
 */
export async function fetchInventoryWithCache({ apiClient, inventoryUrl, storeId }) {
  const mergeAndSave = async (inventory, existing) => {
    if (!storeId) return;
    await savePosCatalog(storeId, {
      inventory: inventory || [],
      customers: existing?.customers || [],
      offers: existing?.offers || [],
    });
  };

  if (isBrowserOnline()) {
    try {
      const response = await apiClient.get(inventoryUrl);
      const inventory = Array.isArray(response.data) ? response.data : [];
      const existing = storeId ? await loadPosCatalog(storeId) : null;
      await mergeAndSave(inventory, existing);
      return { data: inventory, source: 'network' };
    } catch (error) {
      if (error?.cancelled) {
        return { data: [], source: 'unavailable', error, cancelled: true };
      }
      const existing = storeId ? await loadPosCatalog(storeId) : null;
      if (existing && Array.isArray(existing.inventory)) {
        return { data: existing.inventory, source: 'cache', error };
      }
      return { data: [], source: 'unavailable', error };
    }
  }

  const cached = storeId ? await loadPosCatalog(storeId) : null;
  if (cached && Array.isArray(cached.inventory)) {
    return { data: cached.inventory, source: 'cache' };
  }
  return { data: [], source: 'unavailable' };
}

/**
 * Load full POS catalog (inventory + customers + offers).
 */
export async function fetchPosCatalogWithCache({ apiClient, inventoryUrl, customersUrl, offersUrl, storeId }) {
  if (isBrowserOnline()) {
    try {
      const [invResponse, custResponse, offersResponse] = await Promise.all([
        apiClient.get(inventoryUrl),
        apiClient.get(customersUrl),
        apiClient.get(offersUrl).catch(() => ({ data: { offers: [] } })),
      ]);
      const inventory = invResponse.data || [];
      const customers = storeId
        ? await mergeCustomersWithPending(storeId, custResponse.data || [])
        : (custResponse.data || []);
      const loadedOffers = Array.isArray(offersResponse?.data)
        ? offersResponse.data
        : (Array.isArray(offersResponse?.data?.offers) ? offersResponse.data.offers : []);
      if (storeId) {
        await savePosCatalog(storeId, { inventory, customers, offers: loadedOffers });
      }
      return {
        inventory,
        customers,
        offers: loadedOffers,
        source: 'network',
      };
    } catch (error) {
      if (error?.cancelled) {
        return {
          inventory: [],
          customers: [],
          offers: [],
          source: 'unavailable',
          error,
          cancelled: true,
        };
      }
      const fallback = storeId ? await loadPosCatalog(storeId) : null;
      if (fallback && Array.isArray(fallback.inventory)) {
        const customers = storeId
          ? await mergeCustomersWithPending(storeId, fallback.customers || [])
          : (fallback.customers || []);
        return {
          inventory: fallback.inventory,
          customers,
          offers: fallback.offers || [],
          source: 'cache',
          error,
        };
      }
      return { inventory: [], customers: [], offers: [], source: 'unavailable', error };
    }
  }

  const cached = storeId ? await loadPosCatalog(storeId) : null;
  if (cached && Array.isArray(cached.inventory)) {
    const customers = await mergeCustomersWithPending(storeId, cached.customers || []);
    return {
      inventory: cached.inventory,
      customers,
      offers: cached.offers || [],
      source: 'cache',
    };
  }
  return { inventory: [], customers: [], offers: [], source: 'unavailable' };
}

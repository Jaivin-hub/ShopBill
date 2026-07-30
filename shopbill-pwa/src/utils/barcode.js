/** Alphanumeric barcode safe for CODE128 (scanner + billing lookup via `hsn`). */
export function sanitizeBarcodeValue(raw) {
    const value = String(raw || '').trim().toUpperCase();
    if (!value) return '';
    return value.replace(/[^0-9A-Z\-_.]/g, '').slice(0, 32);
}

/** True when product/variant has no HSN/barcode yet and may need generation. */
export function productNeedsBarcode(item, variant = null) {
    if (!item) return false;
    if (variant) {
        return !sanitizeBarcodeValue(variant.hsn || variant.sku || '');
    }
    if (item.variants?.length > 0) return false;
    return !sanitizeBarcodeValue(item.hsn || item.barcode || item.sku || '');
}

/** Resolve barcode string for a product or variant (existing code or generated). */
export function resolveBarcodeValue(item, variant = null) {
    const fromVariant = variant
        ? sanitizeBarcodeValue(variant.hsn || variant.sku || '')
        : '';
    if (fromVariant) return fromVariant;

    const fromItem = sanitizeBarcodeValue(item?.hsn || item?.barcode || item?.sku || '');
    if (fromItem) return fromItem;

    return generateProductBarcodeCode(item, variant);
}

/** Generate a unique internal barcode when product has none. */
export function generateProductBarcodeCode(item, variant = null, { fresh = false } = {}) {
    if (fresh) {
        const stamp = Date.now().toString(36).toUpperCase();
        const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
        return sanitizeBarcodeValue(`PP${stamp}${rand}`);
    }
    const id = String(variant?._id || variant?.id || item?._id || item?.id || '');
    const suffix = id.replace(/[^a-fA-F0-9]/g, '').slice(-10).toUpperCase() || Date.now().toString(36).toUpperCase().slice(-10);
    return sanitizeBarcodeValue(`PP${suffix}`);
}

export function getBarcodeLabelTitle(item, variant = null) {
    const base = String(item?.name || 'Product').trim();
    if (!variant) return base;
    const label = String(variant.label || '').trim();
    const extra = [variant.size, variant.color].filter(Boolean).join(' · ');
    const bits = [label, extra].filter(Boolean);
    return bits.length ? `${base} — ${bits.join(' ')}` : base;
}

/** Find product (and optional variant) by scanned / printed barcode. */
export function findInventoryByBarcode(inventory, decodedText) {
    const normalized = String(decodedText || '').toLowerCase().trim();
    if (!normalized || !Array.isArray(inventory)) return null;

    for (const item of inventory) {
        if (item.hsn && String(item.hsn).toLowerCase().trim() === normalized) {
            return { item, variant: null };
        }
        if (Array.isArray(item.variants)) {
            for (const variant of item.variants) {
                const vcode = String(variant.hsn || variant.sku || '').toLowerCase().trim();
                if (vcode && vcode === normalized) {
                    return { item, variant };
                }
            }
        }
    }
    return null;
}

export function getBarcodeLabelPrice(item, variant = null) {
    if (variant && variant.price != null) return Number(variant.price) || 0;
    if (item?.variants?.length > 0) {
        const prices = item.variants.map((v) => Number(v.price) || 0).filter((p) => p > 0);
        if (prices.length) return Math.min(...prices);
    }
    return Number(item?.price) || 0;
}

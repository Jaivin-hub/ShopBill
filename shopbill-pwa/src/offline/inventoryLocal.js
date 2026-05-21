/** Optimistic stock deduction for offline sales (mirrors cart lines). */
export function applyCartToLocalInventory(inventory, cart) {
  if (!Array.isArray(inventory) || !Array.isArray(cart)) return inventory;
  const next = inventory.map((item) => ({
    ...item,
    variants: Array.isArray(item.variants)
      ? item.variants.map((v) => ({ ...v }))
      : item.variants,
  }));

  cart.forEach((cartItem) => {
    const itemId = cartItem._id ?? cartItem.id;
    const inv = next.find((i) => String(i._id) === String(itemId) || String(i.id) === String(itemId));
    if (!inv) return;
    const qty = Math.max(1, Number(cartItem.quantity) || 1);
    if (cartItem.variantId && Array.isArray(inv.variants)) {
      const variant = inv.variants.find((v) => String(v._id) === String(cartItem.variantId));
      if (variant) variant.quantity = Math.max(0, (Number(variant.quantity) || 0) - qty);
    } else {
      inv.quantity = Math.max(0, (Number(inv.quantity) || 0) - qty);
    }
  });

  return next;
}

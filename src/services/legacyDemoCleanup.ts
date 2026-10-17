// Exact IDs from the retired local catalogue, not guesses based on names/prices.
// Keep this small manifest independent of the isolated test fixture dataset.
const RETIRED_PRODUCT_IDS = new Set(['prod-mayuri-wine', 'prod-padmavathi-rust', 'prod-swarna-mustard', 'prod-chandrakala-blue', 'prod-suryakanthi-vermillion', 'prod-hamsadhwani-emerald', 'prod-devayani-magenta', 'prod-chandramukhi-organza', 'prod-neelambari-indigo', 'prod-vanamali-tussar', 'prod-kamakshi-purple', 'prod-telia-rumal']);
const KEYS = [
  'parinaya_cart_preview_v1', 'parinaya_wishlist_preview_v1',
  'parinaya_cart_demo_v2', 'parinaya_wishlist_demo_v2',
  'parinaya_cart_v1', 'parinaya_wishlist_v1',
];
export const CLEANUP_MARKER = 'parinaya_legacy_content_cleanup_v1';

export function removeRetiredDemoItems(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  try {
    if (storage.getItem(CLEANUP_MARKER) === 'done') return;
    for (const key of KEYS) {
      const value = storage.getItem(key);
      if (!value) continue;
      let rows: unknown;
      try { rows = JSON.parse(value); } catch { continue; }
      if (!Array.isArray(rows)) continue;
      const remaining = rows.filter(row => {
        if (!row || typeof row !== 'object') return true;
        const id = row.productId ?? row.product?.id;
        return !RETIRED_PRODUCT_IDS.has(id);
      });
      if (remaining.length !== rows.length) storage.setItem(key, JSON.stringify(remaining));
    }
    storage.setItem(CLEANUP_MARKER, 'done');
  } catch {
    // Storage may be blocked/full. Unconnected repositories never load these
    // legacy records, so a failed migration cannot restore displayed data.
  }
}

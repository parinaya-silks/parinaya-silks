import test from 'node:test';
import assert from 'node:assert/strict';
import { storeService } from './storeService.ts';
import { INITIAL_PRODUCTS } from '../../tests/fixtures/commerce.ts';
import { removeRetiredDemoItems, CLEANUP_MARKER } from './legacyDemoCleanup.ts';

test('ordinary storefront isolates demo identity and orders and rejects simulated mutations', () => {
  const saved = new Map<string, string>([
    ['parinaya_customer_demo_v2', JSON.stringify({ name: 'Demo identity', email: 'demo@example.test' })],
    ['parinaya_orders_demo_v2', JSON.stringify([{ id: 'fake-order', paymentStatus: 'Paid' }])],
  ]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  } });
  assert.equal(storeService.getCustomer().email, '');
  assert.deepEqual(storeService.getOrders(), []);
  assert.deepEqual(storeService.getCustomersList(), []);
  assert.deepEqual(storeService.getCart(), []);
  assert.deepEqual(storeService.getWishlist(), []);
  assert.deepEqual(storeService.getCoupons(), []);
  assert.throws(() => storeService.createOrder({} as never), /checkout is not connected/);
  assert.throws(() => storeService.updateCustomerProfile({ email: 'fake@example.test' }), /not connected/);
  assert.throws(() => storeService.addCustomerAddress({} as never), /not connected/);
  assert.throws(() => storeService.removeCustomerAddress('fake'), /not connected/);
  assert.deepEqual(storeService.getProducts(), []);
  const product = INITIAL_PRODUCTS[0];
  assert.throws(() => storeService.addToCart(product), /not connected/);
  assert.throws(() => storeService.toggleWishlist(product), /not connected/);
  assert.deepEqual(storeService.getCart(), []);
  assert.deepEqual(storeService.getWishlist(), []);
  assert.deepEqual(storeService.getOrders(), []);
  assert.equal(JSON.parse(saved.get('parinaya_orders_demo_v2')!)[0].id, 'fake-order');
});

function memoryStorage(entries: Array<[string, string]>) {
  const values = new Map(entries);
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
test('versioned migration removes only retired product IDs from named bag/wishlist keys', () => {
  const genuine = { productId: 'owner-real-item', product: { id: 'owner-real-item', name: 'Owner data' } };
  const saved = memoryStorage([
    ['parinaya_cart_preview_v1', JSON.stringify([{ productId: INITIAL_PRODUCTS[0].id }, genuine])],
    ['parinaya_wishlist_demo_v2', JSON.stringify([{ product: { id: INITIAL_PRODUCTS[1].id } }, genuine])],
    ['parinaya_customer_demo_v2', 'private existing profile'],
    ['parinaya_orders_demo_v2', 'existing order history'],
    ['firebase:authUser:preserve-test', 'existing auth state'],
    ['theme', 'ivory'],
  ]);
  removeRetiredDemoItems(saved);
  assert.deepEqual(JSON.parse(saved.getItem('parinaya_cart_preview_v1')!), [genuine]);
  assert.deepEqual(JSON.parse(saved.getItem('parinaya_wishlist_demo_v2')!), [genuine]);
  assert.equal(saved.getItem('firebase:authUser:preserve-test'), 'existing auth state');
  assert.equal(saved.getItem('parinaya_customer_demo_v2'), 'private existing profile');
  assert.equal(saved.getItem('parinaya_orders_demo_v2'), 'existing order history');
  assert.equal(saved.getItem('theme'), 'ivory');
  assert.equal(saved.getItem(CLEANUP_MARKER), 'done');
  const before = Array.from(saved.values);
  removeRetiredDemoItems(saved);
  assert.deepEqual(Array.from(saved.values), before);
});
test('cleanup leaves malformed or unknown storage intact and fails closed when storage is blocked', () => {
  const saved = memoryStorage([['parinaya_cart_preview_v1', 'not-json'], ['parinaya_wishlist_v1', JSON.stringify([{ other: true }])]]);
  removeRetiredDemoItems(saved);
  assert.equal(saved.getItem('parinaya_cart_preview_v1'), 'not-json');
  assert.deepEqual(JSON.parse(saved.getItem('parinaya_wishlist_v1')!), [{ other: true }]);
  assert.doesNotThrow(() => removeRetiredDemoItems({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }));
  assert.deepEqual(storeService.getProducts(), []);
  assert.deepEqual(storeService.getWishlist(), []);
});

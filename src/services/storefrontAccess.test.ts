import test from 'node:test';
import assert from 'node:assert/strict';
import { storeService } from './storeService.ts';

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
  const product = storeService.getProducts().find(p => p.inStock)!;
  storeService.addToCart(product);
  storeService.toggleWishlist(product);
  assert.equal(storeService.getCart()[0].productId, product.id);
  assert.equal(storeService.getWishlist()[0].productId, product.id);
  assert.ok(saved.has('parinaya_cart_preview_v1'));
  assert.ok(saved.has('parinaya_wishlist_preview_v1'));
  assert.deepEqual(storeService.getOrders(), []);
  assert.equal(JSON.parse(saved.get('parinaya_orders_demo_v2')!)[0].id, 'fake-order');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath } from './routing.ts';

test('all generated policy links resolve to the implemented policy routes', () => {
  for (const [tab, path] of Object.entries({ shipping: '/shipping-policy', returns: '/returns-policy', privacy: '/privacy-policy', terms: '/terms-conditions' })) {
    assert.equal(normalizePath(`/policies?tab=${tab}`), path);
  }
  assert.equal(normalizePath('/policies'), '/shipping-policy');
});
test('customer order links resolve to the actual detail screen', () => {
  assert.equal(normalizePath('/account/orders/ord-1089'), '/order-tracking/ord-1089');
});
test('verification query and shop search links are handled', () => {
  assert.equal(normalizePath('/verify-email?email=test%40example.com'), '/verify-email');
  assert.equal(normalizePath('/shop?search=wine'), '/shop?search=wine');
});

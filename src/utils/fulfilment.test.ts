import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_ORDERS } from '../data/mockData.ts';
import { applyFulfilment, fulfilmentError } from './fulfilment.ts';
import type { Order } from '../types/index.ts';

const order = (values: Partial<Order> = {}): Order => ({ ...structuredClone(INITIAL_ORDERS[0]), paymentStatus: 'Paid', fulfilmentStatus: 'Packed', courierPartner: undefined, trackingNumber: undefined, ...values });

test('unpaid orders cannot dispatch, including direct single order updates', () => {
  assert.throws(() => applyFulfilment(order({ paymentStatus: 'Pending' }), 'Shipped', 'Courier', 'TRACK-1'), /Payment/);
});
test('shipment requires separate courier and tracking details', () => {
  assert.match(fulfilmentError(order(), 'Shipped', 'Courier', '')!, /tracking/);
  assert.match(fulfilmentError(order(), 'Shipped', ' ', 'TRACK-1')!, /Courier/);
});
test('valid shipment preserves payment and appends a recorded event without altering input', () => {
  const before = order();
  const after = applyFulfilment(before, 'Shipped', 'Courier', 'TRACK-1');
  assert.equal(after.paymentStatus, 'Paid');
  assert.equal(after.trackingNumber, 'TRACK-1');
  assert.equal(after.timeline.length, before.timeline.length + 1);
  assert.equal(before.fulfilmentStatus, 'Packed');
});
test('terminal states and skipped stages cannot be advanced or reversed', () => {
  assert.ok(fulfilmentError(order({ fulfilmentStatus: 'Cancelled' }), 'Processing'));
  assert.ok(fulfilmentError(order({ fulfilmentStatus: 'Delivered' }), 'Packed'));
  assert.ok(fulfilmentError(order({ fulfilmentStatus: 'Unfulfilled' }), 'Shipped', 'Courier', 'TRACK-1'));
});
test('processing and packing require paid payment', () => {
  assert.ok(fulfilmentError(order({ fulfilmentStatus: 'Unfulfilled', paymentStatus: 'Failed' }), 'Processing'));
  assert.ok(fulfilmentError(order({ fulfilmentStatus: 'Processing', paymentStatus: 'Pending' }), 'Packed'));
});
test('cancellation and note edits never mark payment paid or refunded', () => {
  const pending = order({ paymentStatus: 'Pending', fulfilmentStatus: 'Unfulfilled' });
  assert.equal(applyFulfilment(pending, 'Cancelled').paymentStatus, 'Pending');
  assert.equal(applyFulfilment(pending, 'Unfulfilled', undefined, undefined, 'Note').paymentStatus, 'Pending');
});

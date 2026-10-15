import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminLocation, safeAdminDestination, hasAdminClaim, adminErrorMessage } from './accessPolicy.ts';
import { prepareAdminProvisioning, FIRST_ADMIN_EMAIL } from '../../scripts/admin-provisioning.ts';

test('admin paths are anchored and return destinations are strictly internal', () => {
  assert.equal(isAdminLocation('/administrator'), false);
  assert.ok(isAdminLocation('/admin/orders/example'));
  for (const destination of ['https://evil.example', '//evil.example', '/admin/../../outside', '/admin\\evil', '/admin/%2f%2fevil', '/admin/orders/x?returnTo=https://evil.example', '/account']) assert.equal(safeAdminDestination(destination), '/admin/dashboard');
  assert.equal(safeAdminDestination('/admin/products/edit/sku-1'), '/admin/products/edit/sku-1');
});
test('admin access requires a literal true claim and unexpired token', () => {
  const future = new Date(Date.now() + 60000).toISOString();
  for (const admin of [false, 'true', 1, undefined]) assert.equal(hasAdminClaim({ admin }, future), false);
  assert.equal(hasAdminClaim({ admin: true }, new Date(0).toISOString()), false);
  assert.equal(hasAdminClaim({ admin: true }, 'invalid'), false);
  assert.equal(hasAdminClaim({ admin: true }, future), true);
});
test('credential errors are neutral and do not echo server messages', () => {
  assert.equal(adminErrorMessage({ code: 'auth/user-not-found' }), adminErrorMessage({ code: 'auth/wrong-password' }));
  assert.ok(!adminErrorMessage({ message: 'secret-value' }).includes('secret-value'));
});
test('trusted provisioning validates UID/email and preserves other claims on rerun/revoke', () => {
  const user = { uid: 'synthetic-admin-uid', email: FIRST_ADMIN_EMAIL, customClaims: { otherRole: 'editor' } };
  assert.throws(() => prepareAdminProvisioning(user, { apply: true, action: 'grant', confirmUid: 'wrong', confirmEmail: FIRST_ADMIN_EMAIL }));
  assert.throws(() => prepareAdminProvisioning({ ...user, email: 'other@example.test' }, { apply: false, action: 'grant' }));
  const first = prepareAdminProvisioning(user, { action: 'grant', apply: true, confirmUid: user.uid, confirmEmail: FIRST_ADMIN_EMAIL });
  const repeated = prepareAdminProvisioning({ ...user, customClaims: first.claims }, { action: 'grant', apply: false });
  assert.deepEqual(repeated.claims, { otherRole: 'editor', admin: true });
  assert.deepEqual(prepareAdminProvisioning({ ...user, customClaims: first.claims }, { action: 'revoke', apply: false }).claims, { otherRole: 'editor' });
});

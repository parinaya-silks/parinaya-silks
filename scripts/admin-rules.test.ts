import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, setLogLevel } from 'firebase/firestore';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Only the isolated loopback Firestore emulator is allowed.');
setLogLevel('silent'); // Expected denial assertions must not dump request details.

test('administrator claims, access records and read-only business rules', async () => {
  const environment = await initializeTestEnvironment({ projectId: 'parinaya-silks', firestore: { host: '127.0.0.1', port: 8080, rules: await readFile('firestore.rules', 'utf8') } });
  try {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      for (const uid of ['rule-admin', 'rule-record-only']) await setDoc(doc(db, 'adminAccess', uid), { enabled: true });
      await setDoc(doc(db, 'adminAccess/rule-revoked'), { enabled: false });
      for (const name of ['products', 'orders', 'customers', 'settings', 'coupons', 'inventory']) await setDoc(doc(db, name, 'fixture'), { synthetic: true });
    });
    const anonymous = environment.unauthenticatedContext().firestore();
    const customer = environment.authenticatedContext('rule-customer', { email: 'customer@example.test' }).firestore();
    const admin = environment.authenticatedContext('rule-admin', { admin: true }).firestore();
    const revoked = environment.authenticatedContext('rule-revoked', { admin: true }).firestore();
    const claimOnly = environment.authenticatedContext('rule-claim-only', { admin: true }).firestore();
    const recordOnly = environment.authenticatedContext('rule-record-only', { admin: false }).firestore();
    for (const name of ['products', 'orders', 'customers', 'settings', 'coupons', 'inventory']) {
      for (const denied of [anonymous, customer, revoked, claimOnly, recordOnly]) {
        await assertFails(getDoc(doc(denied, name, 'fixture')));
        await assertFails(setDoc(doc(denied, name, 'unauthorized-write'), { admin: true }));
      }
      await assertSucceeds(getDoc(doc(admin, name, 'fixture')));
      await assertSucceeds(getDocs(collection(admin, name)));
      await assertFails(setDoc(doc(admin, name, 'browser-write'), { paymentStatus: 'Paid' }));
    }
    await assertSucceeds(getDoc(doc(customer, 'adminAccess/rule-customer')));
    await assertFails(getDoc(doc(customer, 'adminAccess/rule-admin')));
    await assertFails(getDocs(collection(admin, 'adminAccess')));
    for (const db of [anonymous, customer, admin]) {
      await assertFails(setDoc(doc(db, 'adminAccess/rule-customer'), { enabled: true, admin: true }));
      await assertFails(updateDoc(doc(db, 'adminAccess/rule-admin'), { enabled: true }));
      await assertFails(deleteDoc(doc(db, 'adminAccess/rule-admin')));
      await assertFails(setDoc(doc(db, 'users/rule-customer'), { role: 'admin' }));
    }
    // A previously issued admin token loses database access when the trusted
    // access record is disabled, without waiting for token expiration.
    await environment.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'adminAccess/rule-admin'), { enabled: false }));
    await assertFails(getDoc(doc(admin, 'orders/fixture')));
    assert.ok(true);
  } finally { await environment.cleanup(); }
});

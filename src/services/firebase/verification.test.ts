import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp } from 'firebase/app';
import { terminate } from 'firebase/firestore/lite';
import { getFirebaseApp } from './app.ts';
import { validateFirebaseConfiguration } from './config.ts';
import { getFirestoreClient } from './firestore.ts';
import { boundedDocumentRead, classifyReadError, validCheckDocumentPath, verifyFirestoreConnection } from './verification.ts';

const environment = {
  VITE_FIREBASE_API_KEY: `AIza${'C'.repeat(35)}`,
  VITE_FIREBASE_AUTH_DOMAIN: 'parinaya-silks.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'parinaya-silks',
  VITE_FIREBASE_STORAGE_BUCKET: 'parinaya-silks.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: '1:1234567890:web:abcdef123456',
  VITE_FIREBASE_DATABASE_ID: '(default)',
};

test('only a single document path is accepted; roots, collections and URLs are rejected', () => {
  assert.ok(validCheckDocumentPath('public/status'));
  assert.ok(validCheckDocumentPath('public/store/metadata/status'));
  for (const path of ['', '/', 'products', '/public/status', 'public/status/', 'public//status', 'https://example.com', 'public/*', 'public/status?limit=100', ' public/status']) assert.equal(validCheckDocumentPath(path), false);
});

test('read outcomes distinguish existing and absent data', async () => {
  assert.deepEqual(await boundedDocumentRead(async () => true), { status: 'read-succeeded', databaseReadVerified: true });
  assert.deepEqual(await boundedDocumentRead(async () => false), { status: 'read-empty', databaseReadVerified: true });
});

test('rules denial and network/service errors never count as authorized reads or expose raw details', async () => {
  const raw = 'secret contents must never enter diagnostics';
  for (const [code, status] of Object.entries({ 'permission-denied': 'permission-denied', unauthenticated: 'authentication-required', unavailable: 'network-error', 'deadline-exceeded': 'network-error', 'failed-precondition': 'service-error', 'not-found': 'service-error', unexpected: 'read-error' })) {
    const result = await boundedDocumentRead(async () => { throw { code, message: raw }; });
    assert.equal(result.status, status);
    assert.equal(result.databaseReadVerified, false);
    assert.ok(!JSON.stringify(result).includes(raw));
  }
  assert.equal(classifyReadError(new TypeError('Failed to fetch')).status, 'network-error');
});

test('hanging reads have a bounded diagnostic deadline and never report late success', async () => {
  let finish!: (value: boolean) => void;
  const pending = new Promise<boolean>(resolve => { finish = resolve; });
  const result = await boundedDocumentRead(() => pending, 5);
  finish(true);
  assert.deepEqual(result, { status: 'timeout', databaseReadVerified: false });
});

test('database client is reused and reads remain disabled without an approved path', async () => {
  const app = getFirebaseApp(validateFirebaseConfiguration(environment));
  assert.equal(app.status, 'app-initialized');
  assert.equal(getFirestoreClient({ ...environment, VITE_FIREBASE_DATABASE_ID: '' }).status, 'database-config-missing');
  assert.equal(getFirestoreClient({ ...environment, VITE_FIREBASE_DATABASE_ID: 'other' }).status, 'database-config-invalid');
  const first = getFirestoreClient(environment);
  const second = getFirestoreClient(environment);
  if (first.status !== 'database-initialized' || second.status !== 'database-initialized') throw new Error('Expected database initialization.');
  assert.equal(first.database, second.database);
  assert.deepEqual(first.target, { projectId: 'parinaya-silks', databaseId: '(default)' });
  const noPath = await verifyFirestoreConnection({ environment });
  assert.equal(noPath.status, 'check-path-missing');
  assert.equal(noPath.databaseReadVerified, false);
  const badPath = await verifyFirestoreConnection({ environment, documentPath: 'products' });
  assert.equal(badPath.status, 'check-path-invalid');
  await terminate(first.database);
  if (app.status === 'app-initialized') await deleteApp(app.app);
});

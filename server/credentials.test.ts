import test from 'node:test';
import assert from 'node:assert/strict';
import { firebaseServiceAccount } from './credentials.ts';

test('individual server credentials target the approved project and normalize escaped newlines', () => {
  const environment = { FIREBASE_PROJECT_ID: 'parinaya-silks', FIREBASE_CLIENT_EMAIL: 'synthetic@example.test', FIREBASE_PRIVATE_KEY: 'synthetic\\nkey' };
  assert.deepEqual(firebaseServiceAccount(environment), { projectId: 'parinaya-silks', clientEmail: environment.FIREBASE_CLIENT_EMAIL, privateKey: 'synthetic\nkey' });
  assert.equal(firebaseServiceAccount({ ...environment, FIREBASE_PRIVATE_KEY: 'synthetic\nkey' })!.privateKey, 'synthetic\nkey');
  assert.throws(() => firebaseServiceAccount({ ...environment, FIREBASE_PROJECT_ID: 'another-project' }));
  assert.throws(() => firebaseServiceAccount({ FIREBASE_CLIENT_EMAIL: environment.FIREBASE_CLIENT_EMAIL }));
  assert.throws(() => firebaseServiceAccount({ FIREBASE_PRIVATE_KEY: environment.FIREBASE_PRIVATE_KEY }));
  assert.equal(firebaseServiceAccount({ ...environment, FIREBASE_SERVICE_ACCOUNT_JSON: 'unused' })!.clientEmail, environment.FIREBASE_CLIENT_EMAIL);
});

test('existing JSON/file/ADC options remain available without echoing malformed credentials', () => {
  const account = { project_id: 'parinaya-silks', client_email: 'synthetic@example.test', private_key: 'synthetic\nkey' };
  assert.equal(firebaseServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) })!.clientEmail, account.client_email);
  assert.equal(firebaseServiceAccount({ GOOGLE_APPLICATION_CREDENTIALS: 'fixture-file' }, path => { assert.equal(path, 'fixture-file'); return JSON.stringify(account); })!.privateKey, account.private_key);
  assert.equal(firebaseServiceAccount({}), undefined);
  assert.throws(() => firebaseServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...account, project_id: 'another-project' }) }));
  assert.throws(() => firebaseServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: 'synthetic-private-value' }), { message: 'Invalid Firebase service-account JSON.' });
});

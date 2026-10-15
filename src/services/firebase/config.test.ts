import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp } from 'firebase/app';
import { validateFirebaseConfiguration } from './config.ts';
import { getFirebaseApp } from './app.ts';

const environment = {
  VITE_FIREBASE_API_KEY: `AIza${'A'.repeat(35)}`,
  VITE_FIREBASE_AUTH_DOMAIN: 'parinaya-silks.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'parinaya-silks',
  VITE_FIREBASE_STORAGE_BUCKET: 'parinaya-silks.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: '1:1234567890:web:abcdef123456',
};

test('missing configuration reports names without initializing an app', () => {
  const result = getFirebaseApp(validateFirebaseConfiguration({}));
  assert.equal(result.status, 'missing');
  if (result.status === 'missing') assert.equal(result.issues.length, 6);
});

test('wrong project, malformed app ID and decorated configuration are rejected without leaking values', () => {
  for (const [key, value] of Object.entries({
    VITE_FIREBASE_PROJECT_ID: 'another-project',
    VITE_FIREBASE_API_KEY: 'hidden-invalid-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: ' https://invalid.example ',
    VITE_FIREBASE_APP_ID: '1:999:web:abcdef',
  })) {
    const result = validateFirebaseConfiguration({ ...environment, [key]: value });
    assert.equal(result.status, 'invalid');
    assert.ok(!JSON.stringify(result).includes(value));
  }
});

test('valid browser configuration initializes once and survives module reuse', async () => {
  const configuration = validateFirebaseConfiguration(environment);
  assert.equal(configuration.status, 'ready');
  const first = getFirebaseApp(configuration);
  const second = getFirebaseApp(configuration);
  assert.equal(first.status, 'app-initialized');
  assert.equal(second.status, 'app-initialized');
  if (first.status !== 'app-initialized' || second.status !== 'app-initialized') throw new Error('Expected initialization.');
  assert.equal(first.app, second.app);
  assert.equal(first.app.options.projectId, 'parinaya-silks');
  const changed = getFirebaseApp(validateFirebaseConfiguration({ ...environment, VITE_FIREBASE_API_KEY: `AIza${'B'.repeat(35)}` }));
  assert.equal(changed.status, 'initialization-error');
  await deleteApp(first.app);
});

import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Fixture controls are restricted to loopback emulators.');
const app = initializeApp({ projectId: 'parinaya-silks' }, 'admin-emulator-fixture-control');
try {
  const action = process.argv[2];
  if (action === 'disable') await getFirestore(app).doc('adminAccess/test-approved-admin').update({ enabled: false });
  else if (action === 'enable') await getFirestore(app).doc('adminAccess/test-approved-admin').update({ enabled: true });
  else if (action === 'remove-claim') await getAuth(app).setCustomUserClaims('test-approved-admin', {});
  else if (action === 'grant-claim') await getAuth(app).setCustomUserClaims('test-approved-admin', { admin: true });
  else throw new Error('Unknown fixture action.');
} finally { await deleteApp(app); }

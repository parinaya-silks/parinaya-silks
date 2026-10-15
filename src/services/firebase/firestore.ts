import { initializeFirestore, type Firestore } from 'firebase/firestore/lite';
import type { FirebaseApp } from 'firebase/app';
import { getFirebaseApp, type FirebaseAppResult } from './app.ts';
import { readFirebaseConfiguration, validateFirebaseConfiguration, type FirebaseEnvironment } from './config.ts';

export const FIRESTORE_TARGET = { projectId: 'parinaya-silks', databaseId: '(default)' } as const;
type AppFailure = Exclude<FirebaseAppResult, { status: 'app-initialized' }>;
const clients: WeakMap<FirebaseApp, Firestore> = import.meta.hot?.data.firestoreClients ?? new WeakMap();
if (import.meta.hot) import.meta.hot.data.firestoreClients = clients;
export type FirestoreClientResult =
  | { status: 'database-initialized'; database: Firestore; target: typeof FIRESTORE_TARGET }
  | AppFailure
  | { status: 'database-config-missing' | 'database-config-invalid' | 'database-initialization-error'; message: string };

// No emulator connection, authentication, writes, queries or automatic reads.
// initializeFirestore's default database is the owner-confirmed (default) instance.
// Explicit hosted settings also avoid getFirestore's automatic emulator defaults.
export function getFirestoreClient(environment?: FirebaseEnvironment): FirestoreClientResult {
  const env = environment ?? import.meta.env ?? {};
  const app = getFirebaseApp(environment ? validateFirebaseConfiguration(env) : readFirebaseConfiguration());
  if (app.status !== 'app-initialized') return app;
  if (!env.VITE_FIREBASE_DATABASE_ID) {
    return { status: 'database-config-missing', message: 'VITE_FIREBASE_DATABASE_ID is required.' };
  }
  if (env.VITE_FIREBASE_DATABASE_ID !== FIRESTORE_TARGET.databaseId) {
    return { status: 'database-config-invalid', message: 'VITE_FIREBASE_DATABASE_ID must match the confirmed default database.' };
  }
  try {
    let database = clients.get(app.app);
    if (!database) {
      database = initializeFirestore(app.app, { host: 'firestore.googleapis.com', ssl: true });
      clients.set(app.app, database);
    }
    return { status: 'database-initialized', database, target: FIRESTORE_TARGET };
  } catch {
    return { status: 'database-initialization-error', message: 'Firestore client initialization failed. No database read has been verified.' };
  }
}

export function describeFirestoreClient(result: FirestoreClientResult) {
  if (result.status === 'database-initialized') {
    return { status: result.status, target: result.target, appInitialized: true, databaseReadVerified: false };
  }
  return { ...result, databaseReadVerified: false };
}

import { initializeFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFirebaseApp } from './app.ts';

const clients: Map<string, Firestore> = import.meta.hot?.data.databaseClients ?? new Map();
if (import.meta.hot) import.meta.hot.data.databaseClients = clients;

export function getDatabaseClient(): Firestore {
  const result = getFirebaseApp();
  if (result.status !== 'app-initialized' || import.meta.env.VITE_FIREBASE_DATABASE_ID !== '(default)') {
    throw new Error('Firebase access is not configured.');
  }
  const existing = clients.get(result.app.name);
  if (existing) return existing;
  const database = initializeFirestore(result.app, { host: 'firestore.googleapis.com', ssl: true });
  if (import.meta.env.DEV && import.meta.env.MODE === 'admin-test') connectFirestoreEmulator(database, '127.0.0.1', 8080);
  clients.set(result.app.name, database);
  return database;
}

import { doc, getDoc } from 'firebase/firestore/lite';
import { describeFirestoreClient, getFirestoreClient } from './firestore.ts';
import type { FirebaseEnvironment } from './config.ts';

export type ReadOutcome = {
  status: 'read-succeeded' | 'read-empty' | 'permission-denied' | 'authentication-required' | 'network-error' | 'service-error' | 'read-error' | 'timeout';
  databaseReadVerified: boolean;
};

export function validCheckDocumentPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length > 1024 || path !== path.trim()) return false;
  const segments = path.split('/');
  return segments.length >= 2 && segments.length <= 10 && segments.length % 2 === 0 && segments.every(s => /^[a-zA-Z0-9_-]+$/.test(s));
}

// Never include raw SDK messages, document contents, credentials or stacks in a diagnostic.
export function classifyReadError(error: unknown): ReadOutcome {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code).replace(/^firestore\//, '') : '';
  if (code === 'permission-denied') return { status: 'permission-denied', databaseReadVerified: false };
  if (code === 'unauthenticated') return { status: 'authentication-required', databaseReadVerified: false };
  if (['unavailable', 'deadline-exceeded', 'cancelled'].includes(code) || error instanceof TypeError) return { status: 'network-error', databaseReadVerified: false };
  if (['failed-precondition', 'resource-exhausted', 'not-found', 'internal', 'unimplemented'].includes(code)) return { status: 'service-error', databaseReadVerified: false };
  return { status: 'read-error', databaseReadVerified: false };
}

export async function boundedDocumentRead(read: () => Promise<boolean>, timeoutMs = 10000): Promise<ReadOutcome> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<ReadOutcome>(resolve => {
    timer = setTimeout(() => resolve({ status: 'timeout', databaseReadVerified: false }), timeoutMs);
  });
  const operation = Promise.resolve().then(read).then(exists => ({
    status: exists ? 'read-succeeded' as const : 'read-empty' as const,
    databaseReadVerified: true,
  })).catch(classifyReadError);
  try { return await Promise.race([operation, deadline]); }
  finally { clearTimeout(timer); }
}

let pendingRead: Promise<boolean> | undefined;

export async function verifyFirestoreConnection(options: { environment?: FirebaseEnvironment; documentPath?: string } = {}) {
  const env = options.environment ?? import.meta.env ?? {};
  const client = getFirestoreClient(options.environment);
  const initialization = describeFirestoreClient(client);
  if (client.status !== 'database-initialized') return initialization;
  const path = options.documentPath ?? env.VITE_FIREBASE_CHECK_DOCUMENT_PATH;
  if (!path) return { ...initialization, status: 'check-path-missing', message: 'No approved read-check document path is configured. App/client initialization does not verify database access.' };
  if (!validCheckDocumentPath(path)) return { ...initialization, status: 'check-path-invalid', message: 'Use one explicitly approved document path, with collection/document pairs and simple identifiers.' };
  if (pendingRead) return { ...initialization, status: 'check-in-progress', message: 'A previous read is still in progress. No additional read was started.' };

  // Firestore Lite always fetches from the server. Only existence is returned.
  // SDK requests cannot be cancelled here: after a timeout, reject additional
  // checks until this single underlying operation settles; never report late success.
  const operation = getDoc(doc(client.database, path)).then(snapshot => snapshot.exists());
  pendingRead = operation;
  void operation.then(() => { if (pendingRead === operation) pendingRead = undefined; }, () => { if (pendingRead === operation) pendingRead = undefined; });
  const outcome = await boundedDocumentRead(() => operation);
  return { ...initialization, ...outcome, documentPath: path, source: 'server' as const };
}

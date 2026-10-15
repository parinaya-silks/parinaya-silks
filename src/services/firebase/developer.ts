import { getFirestoreClient, describeFirestoreClient } from './firestore.ts';
import { verifyFirestoreConnection } from './verification.ts';

declare global {
  interface Window {
    parinayaFirebase?: {
      status: () => ReturnType<typeof describeFirestoreClient>;
      check: (approvedDocumentPath?: string) => ReturnType<typeof verifyFirestoreConnection>;
    };
  }
}

export function installFirebaseDeveloperTools() {
  if (!import.meta.env.DEV) return;
  window.parinayaFirebase = Object.freeze({
    status: () => describeFirestoreClient(getFirestoreClient()),
    check: (documentPath?: string) => verifyFirestoreConnection({ documentPath }),
  });
}

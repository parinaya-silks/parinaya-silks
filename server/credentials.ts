import { readFileSync } from 'node:fs';
import type { ServiceAccount } from 'firebase-admin/app';

export function firebaseServiceAccount(
  environment: NodeJS.ProcessEnv,
  readCredentialFile: (path: string) => string = path => readFileSync(path, 'utf8'),
): ServiceAccount | undefined {
  const projectId = 'parinaya-silks';
  const email = environment.FIREBASE_CLIENT_EMAIL;
  const key = environment.FIREBASE_PRIVATE_KEY;
  if (email || key) {
    if (!email || !key || environment.FIREBASE_PROJECT_ID !== projectId) {
      throw new Error('Set all three Firebase server credential variables for parinaya-silks.');
    }
    return { projectId, clientEmail: email, privateKey: key.replace(/\\n/g, '\n') };
  }

  let raw = environment.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw && environment.GOOGLE_APPLICATION_CREDENTIALS) {
    raw = readCredentialFile(environment.GOOGLE_APPLICATION_CREDENTIALS);
  }
  if (!raw) return undefined;
  let account;
  try { account = JSON.parse(raw); }
  catch { throw new Error('Invalid Firebase service-account JSON.'); }
  if (!account || account.project_id !== projectId) throw new Error('Credential project mismatch.');
  return { projectId, clientEmail: account.client_email, privateKey: account.private_key };
}

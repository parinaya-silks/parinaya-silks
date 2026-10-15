import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { applicationDefault, initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { ADMIN_PROJECT, FIRST_ADMIN_EMAIL, prepareAdminProvisioning } from './admin-provisioning.ts';

// Trusted workstation/Cloud Shell only. Never imported into browser code.
const args = process.argv.slice(2);
let action: 'grant' | 'revoke' = 'grant';
let apply = false;
let confirmUid: string | undefined;
let confirmEmail: string | undefined;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--apply') apply = true;
  else if (args[i] === '--action' && ['grant', 'revoke'].includes(args[i + 1])) action = args[++i] as 'grant' | 'revoke';
  else if (args[i] === '--confirm-uid' && args[i + 1]) confirmUid = args[++i];
  else if (args[i] === '--confirm-email' && args[i + 1]) confirmEmail = args[++i];
  else { console.error('Use [--action grant|revoke] [--apply --confirm-uid UID --confirm-email APPROVED_EMAIL]. Without --apply, this is read-only.'); process.exit(1); }
}
if (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST || [process.env.GCLOUD_PROJECT, process.env.GOOGLE_CLOUD_PROJECT].some(value => value && value !== ADMIN_PROJECT)) {
  console.error('Unexpected project/emulator environment. No account was modified.'); process.exit(1);
}
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    const inside = relative(process.cwd(), resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    if (!inside.startsWith('..') && !isAbsolute(inside)) throw new Error('Credential file must remain outside this checkout');
    const credential = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
    if (credential.type === 'service_account' && credential.project_id !== ADMIN_PROJECT) throw new Error('Wrong credential project');
  } catch { console.error('Unable to validate the trusted credential file for the intended project.'); process.exit(1); }
}
const app = initializeApp({ credential: applicationDefault(), projectId: ADMIN_PROJECT }, 'parinaya-trusted-provisioning');
try {
  const auth = getAuth(app);
  const user = await auth.getUserByEmail(FIRST_ADMIN_EMAIL);
  const plan = prepareAdminProvisioning(user, { action, apply, confirmUid, confirmEmail });
  console.log(JSON.stringify({ projectId: ADMIN_PROJECT, action, uid: plan.uid, email: plan.email, apply, unrelatedClaimsPreserved: true }, null, 2));
  if (apply) {
    // Re-read identity and unrelated claims immediately before the trusted update.
    const current = await auth.getUser(plan.uid);
    const currentPlan = prepareAdminProvisioning(current, { action, apply, confirmUid, confirmEmail });
    const reference = getFirestore(app).doc(`adminAccess/${plan.uid}`);
    if (action === 'revoke') {
      // Disable the server gate first: old tokens cannot retain record access.
      await reference.set({ enabled: false, email: plan.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      await auth.setCustomUserClaims(plan.uid, currentPlan.claims);
      await auth.revokeRefreshTokens(plan.uid);
    } else {
      if (current.customClaims?.admin !== true) await auth.setCustomUserClaims(plan.uid, currentPlan.claims);
      const previous = await reference.get();
      if (!previous.exists || previous.get('enabled') !== true || previous.get('email') !== plan.email) {
        await reference.set({ enabled: true, email: plan.email, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
    }
    console.log('Trusted administrator access updated. Refresh permissions or sign out and sign in again.');
  } else console.log('Read-only inspection completed. Rerun with --apply and the displayed UID/email confirmations only after reviewing/deploying the restrictive rules.');
} catch (error) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
  console.error(code === 'auth/user-not-found' ? 'The approved account does not exist. Create it in Firebase Authentication and set the password privately, then rerun.' : 'Provisioning did not complete. Check ADC access, account identity and role/rules setup. A partial update is possible; rerun the same confirmed operation to reconcile it.');
  process.exitCode = 1;
} finally { await deleteApp(app); }

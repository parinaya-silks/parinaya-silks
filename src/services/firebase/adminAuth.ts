import { initializeAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, connectAuthEmulator, onIdTokenChanged, getIdTokenResult, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, type Auth, type User } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { getFirebaseApp } from './app.ts';
import { hasAdminClaim, adminErrorMessage } from '../../admin/accessPolicy.ts';

type Clients = { auth: Auth; database: Firestore };
const clients: Map<string, Clients> = import.meta.hot?.data.adminClients ?? new Map();
if (import.meta.hot) import.meta.hot.data.adminClients = clients;

export function getAdminClients(): Clients {
  const app = getFirebaseApp();
  if (app.status !== 'app-initialized' || import.meta.env.VITE_FIREBASE_DATABASE_ID !== '(default)') {
    throw new Error('Firebase administrator access is not configured. Check the Firebase environment settings and reload.');
  }
  const cached = clients.get(app.app.name);
  if (cached) return cached;
  const auth = initializeAuth(app.app, { persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence] });
  const database = initializeFirestore(app.app, { host: 'firestore.googleapis.com', ssl: true });
  // Explicit local test mode only. This branch is removed from production builds.
  if (import.meta.env.DEV && import.meta.env.MODE === 'admin-test') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(database, '127.0.0.1', 8080);
  }
  const result = { auth, database };
  clients.set(app.app.name, result);
  return result;
}

export type AdminSession =
  | { status: 'checking' }
  | { status: 'signed-out' }
  | { status: 'authorized'; user: User }
  | { status: 'restricted'; user: User }
  | { status: 'error'; message: string };

export function watchAdminSession(publish: (state: AdminSession) => void) {
  let active = true;
  let generation = 0;
  let stopRecord: (() => void) | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let refreshing = false;
  const { auth, database } = getAdminClients();
  const clearRecord = () => { stopRecord?.(); stopRecord = undefined; clearTimeout(deadline); };
  const fail = (message: string) => {
    generation++;
    clearRecord();
    if (active) publish({ status: 'error', message });
  };
  const inspect = async (user: User | null) => {
    if (!active) return;
    const current = ++generation;
    clearRecord();
    publish({ status: 'checking' });
    if (!user) { publish({ status: 'signed-out' }); return; }
    deadline = setTimeout(() => { if (active && current === generation) fail('Access verification timed out. Check your connection and try again.'); }, 10000);
    try {
      const token = await getIdTokenResult(user);
      if (!active || current !== generation) return;
      if (!hasAdminClaim(token.claims, token.expirationTime)) {
        clearTimeout(deadline);
        publish({ status: 'restricted', user });
        return;
      }
      stopRecord = onSnapshot(doc(database, 'adminAccess', user.uid), { includeMetadataChanges: true }, snapshot => {
        if (!active || current !== generation) return;
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
          publish({ status: 'checking' });
          clearTimeout(deadline);
          deadline = setTimeout(() => { if (active && current === generation) fail('A server permission check is unavailable. Reconnect and try again.'); }, 10000);
          return;
        }
        clearTimeout(deadline);
        publish(snapshot.exists() && snapshot.data().enabled === true ? { status: 'authorized', user } : { status: 'restricted', user });
      }, () => { if (active && current === generation) fail('Administrator permission could not be verified. Contact the store owner or retry.'); });
    } catch (error) {
      if (active && current === generation) fail(adminErrorMessage(error));
    }
  };
  const stopAuth = onIdTokenChanged(auth, user => { void inspect(user); }, error => fail(adminErrorMessage(error)));
  const refresh = async () => {
    if (refreshing || !active) return;
    if (!auth.currentUser) { void inspect(null); return; }
    refreshing = true;
    // Hide protected UI while refreshing; token and document listeners re-check it.
    generation++;
    clearRecord();
    publish({ status: 'checking' });
    deadline = setTimeout(() => fail('Session refresh timed out. Please retry or sign in again.'), 10000);
    try { await auth.currentUser.getIdToken(true); if (active) await inspect(auth.currentUser); }
    catch (error) { if (active) fail(adminErrorMessage(error)); }
    finally { refreshing = false; }
  };
  const onVisibility = () => { if (document.visibilityState === 'visible') void refresh(); };
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', onVisibility);
  const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 60000);
  return {
    refresh,
    unsubscribe: () => {
      active = false; generation++; stopAuth(); clearRecord(); clearInterval(interval);
      window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}

export async function adminSignIn(email: string, password: string) {
  await signInWithEmailAndPassword(getAdminClients().auth, email.trim(), password);
}

export async function adminSignOut() { await signOut(getAdminClients().auth); }

export async function adminPasswordReset(email: string) {
  try { await sendPasswordResetEmail(getAdminClients().auth, email.trim()); }
  catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
    if (code !== 'auth/user-not-found') throw error;
  }
}

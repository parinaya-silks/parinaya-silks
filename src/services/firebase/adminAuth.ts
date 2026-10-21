import { onIdTokenChanged, getIdTokenResult, signInWithEmailAndPassword, sendPasswordResetEmail, signOut, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {adminSessionWatcher,type AdminSession as Session} from '../../admin/sessionWatcher.ts';

// Compatibility export: existing admin callers use the one shared Auth instance.
export {getAuthClients as getAdminClients} from './auth.ts';
import {getAuthClients as getAdminClients} from './auth.ts';

export type AdminSession=Session<User>;

export function watchAdminSession(publish: (state: AdminSession) => void) {
  const {auth,database}=getAdminClients();
  const watcher=adminSessionWatcher<User>({
    publish,
    token:(user,force)=>getIdTokenResult(user,force),
    record:(user,next,error)=>onSnapshot(doc(database,'adminAccess',user.uid),{includeMetadataChanges:true},snapshot=>next(snapshot.exists()&&snapshot.data().enabled===true,snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites),error),
  });
  const stopAuth=onIdTokenChanged(auth,user=>watcher.session(user),error=>watcher.error(error));
  const focus=()=>{if(document.visibilityState==='visible')void watcher.routine();};
  window.addEventListener('focus',focus);
  document.addEventListener('visibilitychange',focus);
  const interval=setInterval(focus,60000);
  return {refresh:watcher.refresh,unsubscribe:()=>{watcher.unsubscribe();stopAuth();clearInterval(interval);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);}};
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

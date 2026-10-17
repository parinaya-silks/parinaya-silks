import React, { useEffect, useRef, useState } from 'react';
import { AdminAccessFrame, AdminLogin } from './AdminLogin.tsx';
import { AdminPanel } from './AdminPanel.tsx';
import { adminSignOut, watchAdminSession, type AdminSession } from '../services/firebase/adminAuth.ts';
import { safeAdminDestination } from './accessPolicy.ts';

export default function AdminAccess({ requestedPath }: { requestedPath: string }) {
  const [session, setSession] = useState<AdminSession>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const refresh = useRef<(() => Promise<void>) | undefined>(undefined);
  const signOutLock = useRef(false);
  const previousUser = useRef<Extract<AdminSession, { status: 'authorized' }>['user'] | null>(null);
  useEffect(() => {
    setSession({ status: 'checking' });
    try {
      const watcher = watchAdminSession(setSession);
      refresh.current = watcher.refresh;
      return () => { refresh.current = undefined; watcher.unsubscribe(); };
    } catch {
      setSession({ status: 'error', message: 'Administrator sign-in is not configured. Check the Firebase settings, then reload this page.' });
    }
  }, [attempt]);
  useEffect(() => {
    if (session.status === 'authorized' && window.location.pathname === '/admin/login') {
      window.history.replaceState(null, '', safeAdminDestination(requestedPath));
    }
  }, [session.status, requestedPath]);

  const leave = async () => {
    if (signOutLock.current) return;
    if (!window.dispatchEvent(new Event('parinaya:before-admin-navigation', { cancelable: true }))) return;
    signOutLock.current = true; setSigningOut(true);
    try { await adminSignOut(); setSession({ status: 'signed-out' }); }
    catch { setSession({ status: 'error', message: 'Unable to sign out. Retry or close this session before leaving a shared device.' }); }
    finally { setSigningOut(false); signOutLock.current = false; }
  };
  if (session.status === 'authorized') previousUser.current = session.user;
  else if (session.status !== 'checking') previousUser.current = null;
  const checking = signingOut || session.status === 'checking';
  if (previousUser.current && (session.status === 'authorized' || session.status === 'checking')) {
    // Preserve editor state across token/focus refreshes while keeping the
    // previously verified panel hidden and inert until the fresh check passes.
    return <><div hidden={checking} inert={checking || undefined} aria-hidden={checking || undefined}><AdminPanel key={previousUser.current.uid} path={safeAdminDestination(requestedPath)} email={previousUser.current.email || 'Administrator'} onSignOut={() => void leave()} /></div>{checking && <AdminAccessFrame><p role="status">Checking administrator access…</p></AdminAccessFrame>}</>;
  }
  if (checking) return <AdminAccessFrame><h1 className="font-serif text-2xl text-[#780D24]">PARINAYA SILKS</h1><p role="status">{signingOut ? 'Signing out…' : 'Checking administrator access…'}</p></AdminAccessFrame>;
  if (session.status === 'signed-out') return <AdminLogin />;
  if (session.status === 'restricted') return <AdminAccessFrame>
    <h1 className="font-serif text-2xl text-[#780D24]">Access Restricted</h1>
    <p className="text-sm break-words">This account does not have active administrator permission.</p>
    <p className="text-sm text-[#5F5552] break-all">{session.user.email}</p>
    <button className="min-h-12 w-full rounded-lg bg-[#780D24] text-white" onClick={() => void refresh.current?.()}>Refresh permissions</button>
    <button className="min-h-11 w-full underline text-[#780D24]" onClick={() => void leave()}>Sign out</button>
  </AdminAccessFrame>;
  if (session.status === 'error') return <AdminAccessFrame>
    <h1 className="font-serif text-2xl text-[#780D24]">Administrator access unavailable</h1>
    <p role="alert" className="text-sm">{session.message}</p>
    <button className="min-h-12 w-full rounded-lg bg-[#780D24] text-white" onClick={() => setAttempt(v => v + 1)}>Retry access check</button>
    <button className="min-h-11 w-full underline" onClick={() => window.location.reload()}>Reload page</button>
    <button className="min-h-11 w-full underline" onClick={() => void leave()}>Sign out</button>
  </AdminAccessFrame>;
  return <AdminPanel key={session.user.uid} path={safeAdminDestination(requestedPath)} email={session.user.email || 'Administrator'} onSignOut={() => void leave()} />;
}

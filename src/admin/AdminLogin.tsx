import {BrandLogo} from '../components/BrandLogo.tsx';
import React, { useRef, useState } from 'react';
import { adminPasswordReset, adminSignIn } from '../services/firebase/adminAuth.ts';
import { adminErrorMessage } from './accessPolicy.ts';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const locked = useRef(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (reset) {
        await adminPasswordReset(email);
        setMessage('If this account can receive reset emails, password reset instructions will be sent.');
      } else {
        await adminSignIn(email, password);
        setPassword('');
      }
    } catch (failure) { setError(adminErrorMessage(failure)); }
    finally { locked.current = false; setBusy(false); }
  };
  return <AdminAccessFrame>
    <header className="text-center space-y-2">
      <p className="font-serif tracking-wider text-[#780D24]">PARINAYA SILKS</p>
      <h1 className="font-serif text-2xl">{reset ? 'Reset administrator password' : 'Administrator Sign In'}</h1>
      <p className="text-sm text-[#5F5552]">{reset ? 'Request a password reset for your existing account.' : 'Sign in with your approved store account.'}</p>
    </header>
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <div><label htmlFor="admin-email" className="block text-sm font-medium mb-1">Email</label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} value={email} disabled={busy} onChange={e => setEmail(e.target.value)} className="w-full min-h-12 rounded-lg border border-[#E8DDD6] bg-[#FBF7F0] px-3 text-base" /></div>
      {!reset && <div><label htmlFor="admin-password" className="block text-sm font-medium mb-1">Password</label>
        <div className="relative"><input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} disabled={busy} onChange={e => setPassword(e.target.value)} className="w-full min-h-12 rounded-lg border border-[#E8DDD6] bg-[#FBF7F0] pl-3 pr-20 text-base" />
          <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 min-w-16 px-3 text-sm text-[#780D24]">{showPassword ? 'Hide' : 'Show'}</button></div></div>}
      {error && <p role="alert" className="rounded-lg bg-red-50 text-red-900 p-3 text-sm">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-[#F4EEE5] p-3 text-sm">{message}</p>}
      <button type="submit" disabled={busy} className="w-full min-h-12 rounded-lg bg-[#780D24] text-white font-semibold disabled:opacity-60">{busy ? 'Please wait…' : reset ? 'Send reset instructions' : 'Sign In'}</button>
      <button type="button" disabled={busy} onClick={() => { setReset(!reset); setPassword(''); setError(''); setMessage(''); }} className="w-full min-h-11 text-sm text-[#780D24] underline">{reset ? 'Back to Sign In' : 'Forgot Password?'}</button>
    </form>
    <a href="/" className="block min-h-11 text-center text-sm text-[#5F5552] underline py-3">Back to store</a>
  </AdminAccessFrame>;
}

export function AdminAccessFrame({ children }: { children: React.ReactNode }) {
  return <main className="parinaya-admin min-h-screen bg-[#FBF7F0] text-[#231919] flex items-center justify-center px-4 py-10 font-sans">
    <section className="w-full max-w-md rounded-xl border border-[#E8DDD6] bg-white p-6 sm:p-8 shadow-sm space-y-6"><BrandLogo className="w-14 h-14 mx-auto"/>{children}</section>
  </main>;
}

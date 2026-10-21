import React,{useEffect,useRef,useState} from 'react';
import {updateProfile} from 'firebase/auth';
import {useCustomerAuth} from './CustomerAuth.tsx';
import {getAuthClients} from '../services/firebase/auth.ts';
import {ensureCustomerProfile,type CustomerProfile} from './profile.ts';
import {customerErrorMessage} from './policy.ts';
import {resendCustomerVerification,verificationWait} from './service.ts';

export function CustomerAccount({onNavigate,recoveryName='',profileIssue=false,emailSent=false}:{onNavigate:(path:string)=>void;recoveryName?:string;profileIssue?:boolean;emailSent?:boolean}) {
  const {user,leave,refreshVerification}=useCustomerAuth();
  const [profile,setProfile]=useState<CustomerProfile|null>(null),[loading,setLoading]=useState(!profileIssue),[profileError,setProfileError]=useState(profileIssue),[name,setName]=useState(recoveryName||user?.displayName||'');
  const [message,setMessage]=useState(emailSent?'A verification email has been sent. Open the link, then check your status here.':''),[error,setError]=useState(''),[busy,setBusy]=useState(''),[wait,setWait]=useState(user?verificationWait(user.uid):0);
  const lock=useRef(false),mounted=useRef(true),generation=useRef(0);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
  async function loadProfile(recover=false) {
    if(!user)return;const current=++generation.current,uid=user.uid;setLoading(true);
    try {
      if(recover&&!user.displayName&&name.trim())await updateProfile(user,{displayName:name.trim()});
      const value=await ensureCustomerProfile(getAuthClients().database,user,name);
      if(mounted.current&&current===generation.current&&getAuthClients().auth.currentUser?.uid===uid){setProfile(value);setProfileError(false);}
    }catch{if(mounted.current&&current===generation.current)setProfileError(true);}
    finally{if(mounted.current&&current===generation.current)setLoading(false);}
  }
  useEffect(()=>{if(!profileIssue)void loadProfile();},[]);
  useEffect(()=>{if(!user)return;const timer=setInterval(()=>setWait(verificationWait(user.uid)),1000);return()=>clearInterval(timer);},[user?.uid]);
  if(!user)return null;
  async function act(kind:'verify'|'resend'|'signout') {
    if(lock.current||!user)return;lock.current=true;setBusy(kind);setError('');setMessage('');
    try {
      if(kind==='verify')setMessage(await refreshVerification()?'Your email address is verified.':'Your email is not verified yet. Open the link in your inbox, then check again.');
      if(kind==='resend'){await resendCustomerVerification(user);if(mounted.current){setWait(verificationWait(user.uid));setMessage('A verification email has been sent. Check your inbox and spam folder.');}}
      if(kind==='signout')await leave();
    }catch(failure){if(mounted.current)setError(customerErrorMessage(failure));}
    finally{lock.current=false;if(mounted.current)setBusy('');}
  }
  return <div>
    {error&&<p role="alert" className="customer-auth-notice">{error}</p>}{message&&<p role="status" className="customer-auth-notice">{message}</p>}
    <dl className="customer-account-details"><div><dt>Name</dt><dd>{profile?.displayName||user.displayName||'Finish your profile below'}</dd></div><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Email verification</dt><dd>{user.emailVerified?'Verified':'Not yet verified'}</dd></div></dl>
    {loading&&<p role="status" className="customer-auth-notice">Loading your profile…</p>}
    {profileError&&!loading&&<div className="customer-auth-notice" role="alert"><p>Your sign-in worked. We couldn’t finish loading or saving your profile. Your account already exists; do not register again.</p><label className="customer-auth-field mt-3">Name<input autoComplete="name" maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></label><div className="customer-auth-actions mt-3"><button type="button" onClick={()=>void loadProfile(true)} disabled={!name.trim()||Boolean(busy)}>Retry profile setup</button></div></div>}
    {!user.emailVerified&&<div className="customer-auth-actions"><button type="button" disabled={Boolean(busy)} onClick={()=>void act('verify')}>{busy==='verify'?'Checking…':'I’ve verified my email'}</button><button type="button" disabled={Boolean(busy)||wait>0} onClick={()=>void act('resend')}>{busy==='resend'?'Sending…':wait>0?'Resend email in '+wait+'s':'Resend verification email'}</button></div>}
    <p className="text-sm text-[#68707a] leading-relaxed my-5">You can keep browsing while your email is unverified. Orders, saved favourites and checkout will be connected in a later phase.</p>
    <div className="customer-auth-actions"><button type="button" onClick={()=>onNavigate('/shop')}>Browse sarees</button><button type="button" disabled={Boolean(busy)} onClick={()=>void act('signout')}>{busy==='signout'?'Signing out…':'Sign out'}</button></div>
  </div>;
}

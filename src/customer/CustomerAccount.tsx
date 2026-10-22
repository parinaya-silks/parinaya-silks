import React,{useEffect,useRef,useState} from 'react';
import {updateProfile} from 'firebase/auth';
import {useCustomerAuth} from './CustomerAuth.tsx';
import {getAuthClients} from '../services/firebase/auth.ts';
import {ensureCustomerProfile,type CustomerProfile} from './profile.ts';
import {MobileField} from './MobileField.tsx';
import {normalizeMobile,mobileCountry,type CountryCode} from './mobile.ts';
import {pendingProfile} from './pendingProfile.ts';
import {CustomerError,customerErrorMessage} from './policy.ts';

export function CustomerAccount({onNavigate}:{onNavigate:(path:string)=>void}) {
  const {user,leave}=useCustomerAuth();
  const pending=user?pendingProfile(user.uid):undefined;
  const [profile,setProfile]=useState<CustomerProfile|null>(null),[loading,setLoading]=useState(true),[profileError,setProfileError]=useState(false),[name,setName]=useState(user?.displayName||pending?.displayName||'');
  const [mobile,setMobile]=useState(pending?.mobileNumber||''),[country,setCountry]=useState<CountryCode>(mobileCountry(pending?.mobileNumber||'')),[mobileError,setMobileError]=useState('');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const lock=useRef(false),mounted=useRef(true),generation=useRef(0);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;generation.current++;};},[]);
  async function loadProfile(recover=false) {
    if(!user)return;const current=++generation.current,uid=user.uid;setLoading(true);
    try {
      const phone=recover?normalizeMobile(mobile,country):undefined;setMobileError('');
      if(recover&&!user.displayName&&name.trim())await updateProfile(user,{displayName:name.trim()});
      const value=await ensureCustomerProfile(getAuthClients().database,user,name,phone);
      if(mounted.current&&current===generation.current&&getAuthClients().auth.currentUser?.uid===uid){setProfile(value);setProfileError(false);}
    }catch(failure){if(mounted.current&&current===generation.current){setProfileError(true);if(recover)setMobileError(failure instanceof CustomerError?failure.fields.mobileNumber||'':'');}}
    finally{if(mounted.current&&current===generation.current)setLoading(false);}
  }
  useEffect(()=>{void loadProfile();},[]);
  if(!user)return null;
  async function signOut() {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{await leave();}
    catch(failure){if(mounted.current)setError(customerErrorMessage(failure));}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  return <div>
    {error&&<p role="alert" className="customer-auth-notice">{error}</p>}
    <dl className="customer-account-details"><div><dt>Name</dt><dd>{profile?.displayName||user.displayName||'Finish your profile below'}</dd></div><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Mobile number</dt><dd>{profile?.mobileNumber||'Not provided'}</dd></div></dl>
    {loading&&<p role="status" className="customer-auth-notice">Loading your profile…</p>}
    {profileError&&!loading&&<div className="customer-auth-notice" role="alert"><p>Your sign-in worked. We couldn’t finish loading or saving your profile. Your account already exists; do not register again.</p><label className="customer-auth-field mt-3">Name<input autoComplete="name" maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></label><MobileField id="customer-recovery-mobile" value={mobile} country={country} onChange={setMobile} onCountry={setCountry} error={mobileError} disabled={loading||busy}/><div className="customer-auth-actions mt-3"><button type="button" onClick={()=>void loadProfile(true)} disabled={!name.trim()||Boolean(busy)}>Retry profile setup</button></div></div>}
    <div className="customer-auth-actions"><button type="button" onClick={()=>onNavigate('/account/addresses')}>Addresses</button><button type="button" onClick={()=>onNavigate('/shop')}>Browse sarees</button><button type="button" disabled={Boolean(busy)} onClick={()=>void signOut()}>{busy?'Signing out…':'Sign out'}</button></div>
  </div>;
}

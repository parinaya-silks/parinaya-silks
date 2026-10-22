import React,{useEffect,useRef,useState} from 'react';
import {customerAction} from '../orders/client.ts';
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
  const [editing,setEditing]=useState(false);
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
  async function saveProfile(event:React.FormEvent){event.preventDefault();if(!user||lock.current)return;lock.current=true;setBusy(true);setError('');try{const mobileNumber=mobile.trim()?normalizeMobile(mobile,country):null;const saved=await customerAction<CustomerProfile>(user.uid,{action:'profile:update',displayName:name,mobileNumber});setProfile(saved);setEditing(false);}catch(failure){setError(failure instanceof Error?failure.message:'Unable to save your profile.');}finally{lock.current=false;setBusy(false);}}
  return <div>
    {error&&<p role="alert" className="customer-auth-notice">{error}</p>}
    <dl className="customer-account-details"><div><dt>Name</dt><dd>{profile?.displayName||user.displayName||'Finish your profile below'}</dd></div><div><dt>Email address</dt><dd>{user.email}</dd></div><div><dt>Mobile number</dt><dd>{profile?.mobileNumber||'Not provided'}</dd></div></dl>
    {loading&&<p role="status" className="customer-auth-notice">Loading your profile…</p>}
    {profileError&&!loading&&<div className="customer-auth-notice" role="alert"><p>Your sign-in worked. We couldn’t finish loading or saving your profile. Your account already exists; do not register again.</p><label className="customer-auth-field mt-3">Name<input autoComplete="name" maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></label><MobileField id="customer-recovery-mobile" value={mobile} country={country} onChange={setMobile} onCountry={setCountry} error={mobileError} disabled={loading||busy}/><div className="customer-auth-actions mt-3"><button type="button" onClick={()=>void loadProfile(true)} disabled={!name.trim()||Boolean(busy)}>Retry profile setup</button></div></div>}
    {profile&&!profileError&&<><button className="min-h-11 underline text-[#780D24]" onClick={()=>{setName(profile.displayName);setMobile(profile.mobileNumber||'');setCountry(mobileCountry(profile.mobileNumber||''));setEditing(true);}}>Edit name and mobile</button>{editing&&<form className="space-y-3 my-4" onSubmit={saveProfile}><label className="customer-auth-field">Name<input required maxLength={100} autoComplete="name" value={name} onChange={event=>setName(event.target.value)}/></label><MobileField required={!!profile.mobileNumber} id="customer-edit-mobile" value={mobile} country={country} onChange={setMobile} onCountry={setCountry} error={mobileError} disabled={busy}/><p className="text-sm">Your sign-in email is unchanged. Legacy profiles may keep an empty mobile number.</p><div className="customer-auth-actions"><button disabled={busy}>Save profile</button><button type="button" disabled={busy} onClick={()=>setEditing(false)}>Cancel</button></div></form>}</>}
    <div className="customer-auth-actions"><button type="button" onClick={()=>onNavigate('/account/orders')}>My orders</button><button type="button" onClick={()=>onNavigate('/account/addresses')}>Addresses</button><button type="button" onClick={()=>onNavigate('/shop')}>Browse sarees</button><button type="button" disabled={Boolean(busy)} onClick={()=>void signOut()}>{busy?'Signing out…':'Sign out'}</button></div>
  </div>;
}

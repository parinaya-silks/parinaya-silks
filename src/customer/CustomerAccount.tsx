import {ProfilePoints} from './ProfilePoints.tsx';
import {ProfileEditor} from './ProfileEditor.tsx';
import {customerInitials} from './profileModel.ts';
import {AddressManager} from '../delivery/AddressManager.tsx';
import {useAddressBook} from '../delivery/useAddressBook.ts';
import {UserRound,ShoppingBag,MessageCircle,LogOut,ChevronRight,Pencil,Lock} from 'lucide-react';
import './profile.css';
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
  const book=useAddressBook();
  const [notice,setNotice]=useState('');
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
      void customerAction(user.uid,{action:'profile:syncDirectory'}).catch(()=>{});
      if(mounted.current&&current===generation.current&&getAuthClients().auth.currentUser?.uid===uid){setProfile(value);setProfileError(false);}
    }catch(failure){if(mounted.current&&current===generation.current){setProfileError(true);if(recover)setMobileError(failure instanceof CustomerError?failure.fields.mobileNumber||'':'');}}
    finally{if(mounted.current&&current===generation.current)setLoading(false);}
  }
  useEffect(()=>{void loadProfile();const refresh=()=>{if(document.visibilityState==='visible')void loadProfile();};window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
  if(!user)return null;
  async function signOut() {
    if(lock.current)return;lock.current=true;setBusy(true);setError('');
    try{await leave();}
    catch(failure){if(mounted.current)setError(customerErrorMessage(failure));}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  return <div className="customer-profile"><nav className="profile-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>My Account</span></nav><header className="profile-greeting"><div className="profile-avatar" aria-hidden="true">{customerInitials(profile?.displayName||user.displayName||'')}</div><div><h1>Hello, {profile?.displayName||user.displayName||'Customer'}</h1><p>Your details, addresses and rewards, all in one place.</p></div></header>
    {error&&<p role="alert" className="profile-notice">{error}</p>}{notice&&<p role="status" className="profile-notice">{notice}</p>}
    <div className="profile-grid"><div className="profile-left"><section className="profile-card profile-personal"><header><h2><UserRound size={19}/>Personal Details</h2>{profile&&!profileError&&<button className="profile-link" onClick={()=>setEditing(true)}><Pencil size={13}/>Edit Details</button>}</header>
    {loading&&<p role="status">Loading your profile...</p>}{!loading&&!profileError&&<dl className="customer-account-details"><div><dt>Full name</dt><dd>{profile?.displayName||user.displayName||'Not provided'}</dd></div><div><dt>Mobile number</dt><dd>{profile?.mobileNumber||<button className="profile-link" onClick={()=>setEditing(true)}>Add mobile number</button>}</dd></div><div className="profile-email"><dt><Lock size={12}/>Sign-in email (read-only)</dt><dd>{user.email}</dd></div></dl>}
    {profileError&&!loading&&<div className="profile-notice" role="alert"><p>Your sign-in worked. We couldn’t finish loading or saving your profile. Your account already exists; do not register again.</p><label>Name<input autoComplete="name" maxLength={100} value={name} onChange={event=>setName(event.target.value)}/></label><MobileField id="customer-recovery-mobile" value={mobile} country={country} onChange={setMobile} onCountry={setCountry} error={mobileError} disabled={loading||busy}/><button type="button" onClick={()=>void loadProfile(true)} disabled={!name.trim()||busy}>Retry profile setup</button></div>}
    </section><div className="profile-addresses-wrap"><AddressManager key={book.uid} book={book} profile/></div></div><div className="profile-right"><ProfilePoints key={user.uid} uid={user.uid} onNavigate={onNavigate}/><section className="profile-card profile-management" aria-label="Account management"><h2>Account Management</h2><button aria-label="My Orders" onClick={()=>onNavigate('/account/orders')}><ShoppingBag size={21}/><span>My Orders<small>View your orders and delivery updates</small></span><ChevronRight size={16}/></button><button aria-label="Help & Contact" onClick={()=>onNavigate('/contact')}><MessageCircle size={21}/><span>Help & Contact<small>Get help from the Parinaya Silks team</small></span><ChevronRight size={16}/></button><button disabled={busy} onClick={()=>void signOut()}><LogOut size={21}/><span>{busy?'Signing out...':'Sign out'}</span></button></section></div></div>
    {editing&&profile&&<ProfileEditor profile={profile} email={user.email||''} onClose={()=>setEditing(false)} onSaved={value=>{setProfile(value);setEditing(false);setNotice('Your details have been saved.');}}/>}
  </div>;
}

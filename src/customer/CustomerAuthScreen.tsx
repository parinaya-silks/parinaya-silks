import React,{useEffect,useRef,useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {AuthFrame} from './AuthFrame.tsx';
import {useCustomerAuth} from './CustomerAuth.tsx';
import {CustomerAccount} from './CustomerAccount.tsx';
import {CustomerError,customerErrorMessage,safeCustomerReturn,validateCustomerFields} from './policy.ts';
import {customerSignIn,customerRegister,customerPasswordReset,markVerificationSent} from './service.ts';
import {getAuthClients} from '../services/firebase/auth.ts';

export type CustomerMode='login'|'register'|'reset'|'verify'|'account';
export function CustomerAuthScreen({mode,currentPath,onNavigate}:{mode:CustomerMode;currentPath:string;onNavigate:(path:string)=>void}) {
  const session=useCustomerAuth();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[name,setName]=useState(''),[remember,setRemember]=useState(false),[visible,setVisible]=useState(false);
  const [busy,setBusy]=useState(false),[errors,setErrors]=useState<Record<string,string>>({}),[error,setError]=useState(''),[notice,setNotice]=useState(''),[registration,setRegistration]=useState<Awaited<ReturnType<typeof customerRegister>>|null>(null);
  const lock=useRef(false),form=useRef<HTMLFormElement>(null),redirected=useRef(false),mounted=useRef(true);
  const previousUid=useRef<string|null>(null);
  const destination=safeCustomerReturn(new URLSearchParams(currentPath.split('?')[1]||'').get('returnTo'));
  const linked=(path:string)=>destination==='/account'?path:path+'?returnTo='+encodeURIComponent(destination);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    const uid=session.user?.uid||null;
    if(previousUid.current&&previousUid.current!==uid){setRegistration(null);setEmail('');setName('');setPassword('');setConfirm('');setNotice('');setError('');setErrors({});}
    previousUid.current=uid;
  },[session.user?.uid]);
  useEffect(()=>{
    if(session.status==='signed-in'&&(mode==='login'||mode==='register')&&!busy&&!registration&&!redirected.current){redirected.current=true;onNavigate(destination);}
  },[session.status,mode,busy,registration,destination,onNavigate]);
  const showFailure=(failure:unknown)=>{
    setError(customerErrorMessage(failure));setErrors(failure instanceof CustomerError?failure.fields:{});
    requestAnimationFrame(()=>form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  };
  async function submit(event:React.FormEvent) {
    event.preventDefault();if(lock.current)return;setError('');setNotice('');setErrors({});
    try{validateCustomerFields({email,...(mode==='reset'?{}:{password}),...(mode==='register'?{name,confirm}:{})},mode==='register');}catch(failure){showFailure(failure);return;}
    lock.current=true;setBusy(true);
    try {
      if(mode==='reset'){await customerPasswordReset(email);if(mounted.current)setNotice('If an account can receive email at this address, password reset instructions will be sent.');}
      else if(mode==='register'){
        const result=await customerRegister(name,email,password,confirm);
        if(result.emailSent)markVerificationSent(result.user.uid);
        if(mounted.current&&getAuthClients().auth.currentUser?.uid===result.user.uid){setRegistration(result);setPassword('');setConfirm('');}
      }else {
        await customerSignIn(email,password,remember);
        if(mounted.current){setPassword('');redirected.current=true;onNavigate(destination);}
      }
    }catch(failure){if(mounted.current)showFailure(failure);}
    finally{lock.current=false;if(mounted.current)setBusy(false);}
  }
  function field(key:'email'|'password'|'confirm'|'name',label:string,placeholder:string) {
    const values={email,password,confirm,name},setters={email:setEmail,password:setPassword,confirm:setConfirm,name:setName};
    const secret=key==='password'||key==='confirm';
    return <div className="customer-auth-field"><label htmlFor={'customer-'+key}>{label}</label><span className={secret?'customer-auth-password':''}><input id={'customer-'+key} name={key} aria-label={label} type={secret?(visible?'text':'password'):key==='email'?'email':'text'} autoComplete={key==='email'?'username':key==='name'?'name':mode==='register'?'new-password':'current-password'} autoCapitalize={key==='email'?'none':undefined} spellCheck={key==='email'?false:undefined} maxLength={key==='email'?254:key==='name'?100:undefined} value={values[key]} onChange={event=>setters[key](event.target.value)} placeholder={placeholder} required disabled={busy} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key]?'customer-error-'+key:undefined}/>{key==='password'&&<button type="button" aria-label={visible?'Hide password':'Show password'} aria-pressed={visible} onClick={()=>setVisible(value=>!value)}>{visible?<EyeOff size={24}/>:<Eye size={24}/>}</button>}</span>{errors[key]&&<span id={'customer-error-'+key} className="customer-auth-error">{errors[key]}</span>}</div>;
  }
  const currentRegistration=registration?.user.uid===session.user?.uid?registration:null;
  const account=session.status==='signed-in'&&(mode==='account'||mode==='verify'||currentRegistration);
  const title=account?(registration?'Your account is ready':mode==='verify'?'Verify your email':'Your account'):mode==='register'?'Create an account':mode==='reset'?'Forgot password?':mode==='verify'?'Verify your email':'Welcome back';
  const subtitle=account?'Welcome to Parinaya Silks.':mode==='register'?'Create your account to stay connected with Parinaya.':mode==='reset'?'Enter your email and we’ll send reset instructions.':mode==='verify'?'Sign in to check your verification status.':'Sign in to view your orders and saved favourites.';
  if(session.status==='checking')return <AuthFrame title="Your account" subtitle="Restoring your session…" onNavigate={onNavigate}><p role="status" className="customer-auth-loading">Please wait…</p></AuthFrame>;
  if(session.status==='error')return <AuthFrame title="Sign-in unavailable" subtitle="Please try again." onNavigate={onNavigate}><p role="alert" className="customer-auth-notice">{session.message}</p><div className="customer-auth-actions"><button type="button" onClick={session.retry}>Retry sign-in setup</button></div></AuthFrame>;
  return <AuthFrame title={title} subtitle={subtitle} onNavigate={onNavigate}>
    {account&&session.user?<><CustomerAccount key={session.user.uid} onNavigate={onNavigate} recoveryName={currentRegistration?name:''} profileIssue={Boolean(currentRegistration&&(!currentRegistration.profileSaved||!currentRegistration.nameSaved))} emailSent={currentRegistration?.emailSent}/>{currentRegistration&&!currentRegistration.emailSent&&<p role="alert" className="customer-auth-notice mt-4">Your account was created, but the verification email was not sent. Use Resend verification email above.</p>}</>:
      mode==='verify'?<p className="customer-auth-switch"><a href="/login" onClick={event=>{event.preventDefault();onNavigate('/login');}}>Sign in to check verification</a></p>:
      <>
        {error&&<div role="alert" className="customer-auth-notice"><p>{error}</p>{Object.keys(errors).length>0&&<ul>{Object.values(errors).map((message,index)=><li key={index}>{message}</li>)}</ul>}</div>}
        {notice&&<p role="status" className="customer-auth-notice">{notice}</p>}
        <form ref={form} className="customer-auth-form" onSubmit={submit} noValidate aria-label={mode==='register'?'Create customer account':mode==='reset'?'Reset customer password':'Customer sign in'} aria-busy={busy}>
          {mode==='register'&&field('name','Name','Enter your name')}
          {field('email','Email address','Enter your email')}
          {mode!=='reset'&&field('password','Password','Enter your password')}
          {mode==='register'&&field('confirm','Confirm password','Enter your password again')}
          {(mode==='login'||mode==='account')&&<div className="customer-auth-options"><label><input type="checkbox" checked={remember} onChange={event=>setRemember(event.target.checked)} disabled={busy}/>Remember me</label><a href={linked('/forgot-password')} onClick={event=>{event.preventDefault();onNavigate(linked('/forgot-password'));}}>Forgot password?</a></div>}
          <button className="customer-auth-submit" type="submit" disabled={busy}>{busy?'Please wait…':mode==='register'?'Create account':mode==='reset'?'Send reset instructions':'Sign In'}</button>
        </form>
        <p className="customer-auth-switch">{mode==='register'?'Already have an account?':mode==='reset'?'Remember your password?':'New to Parinaya?'}<a href={linked(mode==='login'||mode==='account'?'/register':'/login')} onClick={event=>{event.preventDefault();onNavigate(linked(mode==='login'||mode==='account'?'/register':'/login'));}}>{mode==='login'||mode==='account'?'Create an account':'Sign In'}</a></p>
      </>
    }
  </AuthFrame>;
}

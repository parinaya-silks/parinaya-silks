import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {onIdTokenChanged,signOut,type User} from 'firebase/auth';
import {getAuthClients} from '../services/firebase/auth.ts';
import {customerErrorMessage} from './policy.ts';
import {refreshCustomerVerification} from './service.ts';

type Session={status:'checking'|'signed-out'|'signed-in'|'error';user:User|null;version:number;message?:string};
interface AuthContext extends Session {retry:()=>void;leave:()=>Promise<void>;refreshVerification:()=>Promise<boolean>}
const Context=createContext<AuthContext|null>(null);
export function CustomerAuthProvider({children}:{children:React.ReactNode}) {
  const [session,setSession]=useState<Session>({status:'checking',user:null,version:0}),[attempt,setAttempt]=useState(0);
  const mounted=useRef(true),verification=useRef<{uid:string;promise:Promise<boolean>}|null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    let active=true;
    try{
      const {auth}=getAuthClients();
      const stop=onIdTokenChanged(auth,user=>{if(active)setSession(previous=>({status:user?'signed-in':'signed-out',user,version:previous.version+1}));},error=>{if(active)setSession({status:'error',user:null,version:0,message:customerErrorMessage(error)});});
      return()=>{active=false;stop();};
    }catch(error){setSession({status:'error',user:null,version:0,message:customerErrorMessage(error)});}
    return()=>{active=false;};
  },[attempt]);
  const leave=useCallback(async()=>{await signOut(getAuthClients().auth);if(mounted.current)setSession(previous=>({status:'signed-out',user:null,version:previous.version+1}));},[]);
  const refreshVerification=useCallback(()=>{
    const user=getAuthClients().auth.currentUser;
    if(!user)return Promise.reject(new Error('Sign in to check your email.'));
    if(verification.current?.uid===user.uid)return verification.current.promise;
    const check=refreshCustomerVerification(user).then(verified=>{if(mounted.current&&getAuthClients().auth.currentUser?.uid===user.uid)setSession(previous=>({...previous,user,version:previous.version+1}));return verified;}).finally(()=>{if(verification.current?.promise===check)verification.current=null;});
    verification.current={uid:user.uid,promise:check};return check;
  },[]);
  return <Context.Provider value={{...session,retry:()=>{setSession({status:'checking',user:null,version:0});setAttempt(value=>value+1);},leave,refreshVerification}}>{children}</Context.Provider>;
}
export function useCustomerAuth(){const value=useContext(Context);if(!value)throw new Error('Customer auth provider is missing.');return value;}

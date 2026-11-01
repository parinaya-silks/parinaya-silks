import React,{createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {onIdTokenChanged,signOut,type User} from 'firebase/auth';
import {getAuthClients} from '../services/firebase/auth.ts';
import {clearPendingProfile} from './pendingProfile.ts';
import {customerErrorMessage} from './policy.ts';

type Session={status:'checking'|'signed-out'|'signed-in'|'error';user:User|null;version:number;message?:string};
interface AuthContext extends Session {retry:()=>void;leave:()=>Promise<void>}
const Context=createContext<AuthContext|null>(null);
export function CustomerAuthProvider({children}:{children:React.ReactNode}) {
  const [session,setSession]=useState<Session>({status:'checking',user:null,version:0}),[attempt,setAttempt]=useState(0);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    let active=true;const timeout=setTimeout(()=>{if(active)setSession(previous=>previous.status==='checking'?{...previous,status:'error',message:'Session restoration is taking longer than expected. Please retry.'}:previous);},10000);
    try{
      const {auth}=getAuthClients();
      const stop=onIdTokenChanged(auth,user=>{clearTimeout(timeout);if(active)setSession(previous=>({status:user?'signed-in':'signed-out',user,version:previous.version+1}));},error=>{if(active)setSession(previous=>({...previous,status:'error',message:customerErrorMessage(error)}));});
      return()=>{active=false;clearTimeout(timeout);stop();};
    }catch(error){setSession(previous=>({...previous,status:'error',message:customerErrorMessage(error)}));}
    return()=>{active=false;clearTimeout(timeout);};
  },[attempt]);
  const leave=useCallback(async()=>{const uid=getAuthClients().auth.currentUser?.uid;await signOut(getAuthClients().auth);if(uid)clearPendingProfile(uid);if(mounted.current)setSession(previous=>({status:'signed-out',user:null,version:previous.version+1}));},[]);
  return <Context.Provider value={{...session,retry:()=>{setSession(previous=>({...previous,status:'checking'}));setAttempt(value=>value+1);},leave}}>{children}</Context.Provider>;
}
export function useCustomerAuth(){const value=useContext(Context);if(!value)throw new Error('Customer auth provider is missing.');return value;}

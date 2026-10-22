import React,{useEffect} from 'react';
import {useCustomerAuth} from '../customer/CustomerAuth.tsx';
import {safeCustomerReturn} from '../customer/policy.ts';
export function CustomerGate({path,onNavigate,children}:{path:string;onNavigate:(path:string)=>void;children:React.ReactNode}){
  const session=useCustomerAuth();
  useEffect(()=>{if(session.status==='signed-out')onNavigate('/login?returnTo='+encodeURIComponent(safeCustomerReturn(path)));},[session.status,path,onNavigate]);
  if(session.status==='error')return <section className="p-6 text-center space-y-3"><h1 className="font-serif text-2xl">Sign-in unavailable</h1><button className="min-h-11 underline" onClick={session.retry}>Retry sign-in</button></section>;
  if(session.status!=='signed-in')return <p role="status" className="p-6 text-center">Restoring your account…</p>;
  return <React.Fragment key={session.user!.uid}>{children}</React.Fragment>;
}

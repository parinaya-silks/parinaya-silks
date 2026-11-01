import {Loading,Recovery} from '../loading/Loading.tsx';
import React,{useEffect} from 'react';
import {useCustomerAuth} from '../customer/CustomerAuth.tsx';
import {safeCustomerReturn} from '../customer/policy.ts';
export function CustomerGate({path,onNavigate,children}:{path:string;onNavigate:(path:string)=>void;children:React.ReactNode}){
  const session=useCustomerAuth();
  useEffect(()=>{if(session.status==='signed-out')onNavigate('/login?returnTo='+encodeURIComponent(safeCustomerReturn(path)));},[session.status,path,onNavigate]);
  if(session.user)return <React.Fragment key={session.user.uid}>{session.status==='error'&&<Recovery compact retry={session.retry} label="Retry sign-in" message="Unable to refresh your session. Please retry."/>}{children}</React.Fragment>;
  if(session.status==='error')return <Recovery retry={session.retry} label="Retry sign-in"/>;
  if(session.status!=='signed-in')return <Loading kind="profile" label="Restoring your account" retry={session.retry}/>;
  return <React.Fragment key={session.user!.uid}>{children}</React.Fragment>;
}

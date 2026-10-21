import React from 'react';
import {CustomerAuthScreen} from '../customer/CustomerAuthScreen.tsx';

export function LoginView({onNavigate,currentPath='/login'}:{onNavigate:(path:string)=>void;currentPath?:string}) {
  return <CustomerAuthScreen mode='login' currentPath={currentPath} onNavigate={onNavigate}/>;
}

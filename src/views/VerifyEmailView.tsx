import React from 'react';
import {CustomerAuthScreen} from '../customer/CustomerAuthScreen.tsx';

export function VerifyEmailView({onNavigate,currentPath='/verify-email'}:{onNavigate:(path:string)=>void;currentPath?:string}) {
  return <CustomerAuthScreen mode='verify' currentPath={currentPath} onNavigate={onNavigate}/>;
}

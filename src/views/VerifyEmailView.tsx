import React from 'react';
import {CustomerAuthScreen} from '../customer/CustomerAuthScreen.tsx';

export function VerifyEmailView({onNavigate,currentPath='/verify-email'}:{onNavigate:(path:string)=>void;currentPath?:string}) {
  // Compatibility for old bookmarks: no verification actions or status checks.
  return <CustomerAuthScreen mode='account' currentPath={currentPath} onNavigate={onNavigate}/>;
}

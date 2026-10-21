import React from 'react';
import {CustomerAuthScreen} from '../customer/CustomerAuthScreen.tsx';

export function AccountView({onNavigate,currentPath='/account'}:{onNavigate:(path:string)=>void;currentPath?:string}) {
  return <CustomerAuthScreen mode='account' currentPath={currentPath} onNavigate={onNavigate}/>;
}

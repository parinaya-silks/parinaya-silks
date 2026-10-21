import React from 'react';
import {CustomerAuthScreen} from '../customer/CustomerAuthScreen.tsx';

export function RegisterView({onNavigate,currentPath='/register'}:{onNavigate:(path:string)=>void;currentPath?:string}) {
  return <CustomerAuthScreen mode='register' currentPath={currentPath} onNavigate={onNavigate}/>;
}

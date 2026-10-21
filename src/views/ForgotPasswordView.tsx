import React from 'react';
import {CustomerAuthScreen} from '../customer/CustomerAuthScreen.tsx';

export function ForgotPasswordView({onNavigate,currentPath='/forgot-password'}:{onNavigate:(path:string)=>void;currentPath?:string}) {
  return <CustomerAuthScreen mode='reset' currentPath={currentPath} onNavigate={onNavigate}/>;
}

import React from 'react';
import {LoginPortrait} from '../appearance/LoginPortrait.tsx';
import {ArrowLeft} from 'lucide-react';
import './customer-auth.css';

export function AuthFrame({title,subtitle,children,onNavigate}:{title:string;subtitle:string;children:React.ReactNode;onNavigate:(path:string)=>void}) {
  return <div className="customer-auth-layout">
    <LoginPortrait/>
    <section className="customer-auth-panel" aria-labelledby="customer-auth-title"><div className="customer-auth-content">
      <div className="customer-auth-monogram" aria-hidden="true"><span>P</span><span>S</span></div>
      <h1 id="customer-auth-title">{title}</h1><p className="customer-auth-subtitle">{subtitle}</p>
      {children}
      <a href="/" className="customer-auth-browse" onClick={event=>{event.preventDefault();onNavigate('/');}}><ArrowLeft size={22} aria-hidden="true"/>Continue browsing</a>
      <div className="customer-auth-legal"><a href="/privacy-policy" onClick={event=>{event.preventDefault();onNavigate('/privacy-policy');}}>Privacy Policy</a><span aria-hidden="true">|</span><a href="/terms-conditions" onClick={event=>{event.preventDefault();onNavigate('/terms-conditions');}}>Terms &amp; Conditions</a></div>
    </div></section>
  </div>;
}

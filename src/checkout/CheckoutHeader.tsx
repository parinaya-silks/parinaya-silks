import React from 'react';
import {ArrowLeft,Check,Headphones} from 'lucide-react';
import {BrandLogo} from '../components/BrandLogo.tsx';
import type {CheckoutStage} from './source.ts';

export function CheckoutHeader({stage,buyNow,locked,onBack,onNavigate,onStep}:{stage:CheckoutStage;buyNow:boolean;locked:boolean;onBack:()=>void;onNavigate:(path:string)=>void;onStep:(stage:CheckoutStage)=>void}){
 const stages=['delivery','summary','payment'] as const,index=stages.indexOf(stage);
 return <><header className="checkout-header"><div className="checkout-container"><button className="checkout-back" disabled={locked} onClick={onBack}><ArrowLeft size={17}/><span>{stage==='delivery'?(buyNow?'Product':'Bag'):stage==='summary'?'Delivery':'Review'}</span></button><a href="/" className="checkout-brand" onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();if(!locked)onNavigate('/');}}} aria-label="Parinaya Silks home"><BrandLogo decorative/><span>PARINAYA SILKS</span></a><a className="checkout-care" href="/contact" onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();onNavigate('/contact');}}}><Headphones size={17}/><span>Client Care</span></a></div></header><nav className="checkout-progress" data-step={stage} aria-label="Checkout steps"><ol>{stages.map((item,i)=><li key={item} data-current={index===i} data-complete={i<index}><button disabled={i>index||locked} aria-current={index===i?'step':undefined} onClick={()=>onStep(item)}><span className="checkout-step-number">{i<index?<Check size={15}/>:i+1}</span><span>{item==='summary'?'Review':item==='delivery'?'Delivery':'Payment'}<small>{i===0?'Address & details':i===1?'Order summary':'Cash on delivery'}</small></span></button></li>)}</ol></nav></>;
}


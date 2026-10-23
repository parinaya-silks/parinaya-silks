import test from 'node:test';import assert from 'node:assert/strict';
import {checkoutSource,beginBuyNow,readCheckoutDraft,saveCheckoutDraft,checkoutPath} from './source.ts';
import {safeCustomerReturn} from '../customer/policy.ts';
test('checkout source accepts only trusted references and quantities, never prices or addresses',()=>{
 assert.deepEqual(checkoutSource(undefined),{kind:'bag'});const source={kind:'buy-now',productId:'a'.repeat(20),variantId:'wine',quantity:2};assert.deepEqual(checkoutSource(source),source);
 for(const value of [null,{kind:'bag',quantity:1},{...source,price:1},{...source,quantity:0},{...source,quantity:1.5},{...source,quantity:1000001},{...source,variantId:'../x'},{...source,productId:'../x'},{...source,uid:'other'}])assert.throws(()=>checkoutSource(value));
});
test('Buy Now drafts bind an anonymous intent once to one account, restore stages and reject expiry/tampering',()=>{
 const values=new Map<string,string>(),original=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
 try{
 const source={kind:'buy-now' as const,productId:'a'.repeat(20),variantId:null,quantity:2},id=beginBuyNow(null,source,'silk-saree');
 const draft=readCheckoutDraft('owner',id)!;assert.deepEqual(draft.source,source);assert.equal(draft.uid,'owner');assert.equal(readCheckoutDraft('other',id),null);assert.equal(values.has('parinaya:checkout:v1:pending'),false);
 saveCheckoutDraft({...draft,addressId:'b'.repeat(32),deliveryConfirmed:true,approvedFingerprint:'c'.repeat(64)});assert.equal(readCheckoutDraft('owner',id)!.approvedFingerprint,'c'.repeat(64));
 assert.equal(readCheckoutDraft('owner','../../x'),null);assert.equal(readCheckoutDraft('owner','bag')!.source.kind,'bag');
 saveCheckoutDraft({...draft,createdAt:Date.now()-3*60*60*1000});assert.equal(readCheckoutDraft('owner',id),null);
 const expiredBag={...readCheckoutDraft('owner','bag')!,createdAt:Date.now()-3*60*60*1000,deliveryConfirmed:true,approvedFingerprint:'d'.repeat(64)};saveCheckoutDraft(expiredBag);const renewed=readCheckoutDraft('owner','bag')!;assert.equal(renewed.deliveryConfirmed,false);assert.equal(renewed.approvedFingerprint,'');assert.equal(renewed.source.kind,'bag');
 for(const stage of ['delivery','summary','payment'] as const)assert.equal(safeCustomerReturn(checkoutPath(stage,id)),checkoutPath(stage,id));assert.equal(safeCustomerReturn('/checkout/payment?returnTo=https://evil.example'),'/account');
 }finally{if(original)Object.defineProperty(globalThis,'sessionStorage',original);else Reflect.deleteProperty(globalThis,'sessionStorage');}
});

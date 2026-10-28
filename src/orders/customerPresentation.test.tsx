import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {blankAddress} from '../delivery/model.ts';
import type {OrderRecord} from './model.ts';
import {canCelebrate,cancellationEligible,orderProgress,ist,OrderProgress,PaymentNotice,PaymentSummary,PurchasedItems} from './customerPresentation.tsx';
import {markPlacementArrival,consumePlacementArrival} from './confirmation.ts';
const order:OrderRecord={email:'customer@example.test',currency:'INR',revision:1,updatedAt:0,address:{...blankAddress(),id:"saved",revision:1,createdAt:0,updatedAt:0},shippingRevision:1,stockRestored:false,internalNotes:'',id:'a'.repeat(32),reference:'PS-SAVED-REFERENCE',uid:'customer',status:'Placed',paymentStatus:'due',createdAt:0,items:[{productId:'old',variantId:'wine',variantName:'Saved Wine',name:'Historical Saree',sku:'SAVED',slug:'saved',imageUrl:'',quantity:2,linePaise:'50000',unitPaise:25000}],subtotalPaise:'50000',discountPaise:'5000',couponCode:'SAVED10',shippingPaise:'0',totalPaise:'44700',courier:'',trackingNumber:'',trackingUrl:'',history:[{action:'Placed',at:0,actor:'customer',note:''}],collection:null,request:null,refunds:[]};
test('confirmation requires an active server order, while fulfilment never implies COD collection',()=>{
 for(const status of ['Cancelled','Rejected'] as const){assert.equal(canCelebrate({...order,status}),false);assert.doesNotMatch(renderToStaticMarkup(<PaymentNotice order={{...order,status}}/>),/payable on delivery|Payment Successful/);}
 const html=renderToStaticMarkup(<PaymentNotice order={{...order,status:'Delivered'}}/>);assert.match(html,/payable on delivery/);assert.doesNotMatch(html,/Amount Paid|Payment Successful|Collection recorded/);
 const collected=renderToStaticMarkup(<PaymentSummary order={{...order,status:'Delivered',paymentStatus:'collected'}}/>);assert.match(collected,/Total Order Value/);assert.match(collected,/Amount due:/);assert.doesNotMatch(collected,/Total Payable/);
 assert.equal(cancellationEligible({...order,status:'Shipped'}),false);assert.equal(cancellationEligible({...order,request:{status:'pending'} as OrderRecord['request']}),false);
});
test('historical rows and totals use the saved snapshot with no zero discount rows or recalculation',()=>{
 const html=renderToStaticMarkup(<><PurchasedItems order={order}/><PaymentSummary order={order}/></>);assert.match(html,/Historical Saree/);assert.match(html,/Saved Wine/);assert.match(html,/447/);assert.match(html,/Coupon Savings/);assert.doesNotMatch(html,/Loyalty Points Redeemed|GST|insurance|certified/i);
 const noDiscount=renderToStaticMarkup(<PaymentSummary order={{...order,discountPaise:'0'}}/>);assert.doesNotMatch(noDiscount,/Coupon Savings/);
});
test('timeline maps actual states and timestamps; invalid shipment links are never exposed',()=>{
 assert.deepEqual(orderProgress({...order,status:'Processing'}).map(step=>step.state),['completed','completed','current','upcoming','upcoming']);assert.equal(orderProgress(order)[0].at,0);assert.equal(orderProgress({...order,status:'Cancelled'})[0].state,'stopped');
 assert.match(ist(0),/05:30.*IST/);
 assert.match(renderToStaticMarkup(<OrderProgress order={order}/>),/Tracking details will appear here when available/);
 for(const trackingUrl of ['javascript:alert(1)','https://user:pass@example.test'])assert.doesNotMatch(renderToStaticMarkup(<OrderProgress order={{...order,trackingUrl}}/>),/href=/);
 assert.match(renderToStaticMarkup(<OrderProgress order={{...order,trackingUrl:'https://courier.example/track'}}/>),/rel="noopener noreferrer"/);
});
test('placement animation hints are account scoped, consumed once and never create success',()=>{
 markPlacementArrival('customer','order');assert.equal(consumePlacementArrival('other','order'),false);assert.equal(consumePlacementArrival('customer','order'),true);assert.equal(consumePlacementArrival('customer','order'),false);
});


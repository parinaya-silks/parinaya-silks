import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CheckoutItems,CheckoutTotals} from './CheckoutPresentation.tsx';
import {CheckoutPoints} from '../loyalty/CheckoutPoints.tsx';
import type {CheckoutReview} from '../delivery/model.ts';
import {loyaltyQuote,disabledLoyalty,emptyBalance} from '../loyalty/model.ts';
const review={items:[],subtotalPaise:'100000',subtotalComplete:true,shipping:{state:'ready',free:false,shippingPaise:'10000',freeShippingEnabled:false},discountPaise:'1000',couponCode:'SAVED',totalPaise:'108725',loyalty:{discountPaise:'250',appliedPoints:5}} as unknown as CheckoutReview;
test('checkout breakdown renders the trusted total and separate saved discounts without repricing it',()=>{
 const html=renderToStaticMarkup(<CheckoutTotals review={review} shippingChanged={false}/>);
 assert.match(html,/data-checkout-total="108725"/);assert.match(html,/1,087.25/);assert.match(html,/Coupon savings/);assert.match(html,/Loyalty savings/);assert.match(html,/5 points/);assert.doesNotMatch(html,/GST|insured|certified|gateway/i);
 const blocked=renderToStaticMarkup(<CheckoutTotals review={{...review,totalPaise:null,shipping:{...review.shipping,state:'blocked'}}} shippingChanged={false}/>);assert.doesNotMatch(blocked,/data-checkout-total/);assert.match(blocked,/To be confirmed/);
});
test('checkout inactive loyalty renders no redemption or operational explanation',()=>{
 const quote=loyaltyQuote({config:disabledLoyalty(),revision:1},emptyBalance(),10000n,false,0);
 assert.equal(renderToStaticMarkup(<CheckoutPoints quote={quote} requested={0} onApply={()=>{}}/>),'');
});
test('checkout unavailable line quantities remain a compact honest item instead of throwing in price formatting',()=>{
 const html=renderToStaticMarkup(<CheckoutItems review={{...review,items:[{id:'missing',product:null,quantity:0,issues:['Product unavailable']}]} as CheckoutReview} locked={false} onEdit={()=>{}} buyNow/>);
 assert.match(html,/Product unavailable/);assert.match(html,/Quantity: Invalid/);assert.match(html,/Edit product selection/);assert.doesNotMatch(html,/undefined|NaN/);
});

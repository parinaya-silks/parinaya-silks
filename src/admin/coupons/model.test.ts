import test from 'node:test';
import assert from 'node:assert/strict';
import {couponInput,storedCoupon,couponUses,couponDiscount} from '../../orders/model.ts';
import {couponDraft,draftCoupon,couponStatus,istInput,istInstant,filterCoupons,blankCoupons,completeCoupons,previewCoupon,type CouponRecord} from './model.ts';
const coupon:CouponRecord={code:'SAVE10',kind:'percent',value:10,enabled:true,minimumPaise:0,capPaise:null,startsAt:null,endsAt:null,globalLimit:null,perCustomerLimit:null,uses:0,revision:1,createdAt:null,updatedAt:null};
test('coupon status respects enabled, exact time boundaries and usage exhaustion',()=>{
 assert.equal(couponStatus(coupon,100),'Active');assert.equal(couponStatus({...coupon,startsAt:101},100),'Scheduled');assert.equal(couponStatus({...coupon,startsAt:100},100),'Active');assert.equal(couponStatus({...coupon,endsAt:100},100),'Expired');assert.equal(couponStatus({...coupon,globalLimit:1,uses:1},100),'Usage Limit Reached');assert.equal(couponStatus({...coupon,enabled:false,endsAt:100},100),'Disabled');
});
test('IST entry round trips independent of host timezone and retains existing subsecond instants',()=>{
 const instant=Date.UTC(2026,9,24,4,30,22,123);assert.equal(istInput(instant),'2026-10-24T10:00:22.123');assert.equal(istInstant(istInput(instant)),instant);assert.equal(istInstant('2026-10-24T10:00'),Date.UTC(2026,9,24,4,30));assert.throws(()=>istInstant('2026-02-30T10:00'));assert.throws(()=>istInstant('not-a-date'));
});
test('money conversion, cap per order, flooring, min qualification and fixed discount clamp share checkout arithmetic',()=>{
 const d=couponDraft(coupon);d.value='17';d.cap='50.01';d.minimum='100.50';const input=draftCoupon(d,null);assert.equal(input.capPaise,5001);assert.equal(input.minimumPaise,10050);assert.equal(previewCoupon(input,'1000',0,100).discount,5001);assert.throws(()=>previewCoupon(input,'50',0,100));assert.throws(()=>draftCoupon({...d,value:'1.5'},null));assert.throws(()=>draftCoupon({...d,cap:'1.001'},null));assert.equal(couponDiscount({...coupon,value:17},101n,0,0,100),17n);assert.equal(previewCoupon({...coupon,kind:'fixed',value:100000},'10',0,100).after,0);assert.throws(()=>draftCoupon({...d,value:'0'},null));
});
test('legacy optional omissions remain unrestricted without defaulting required coupon state or corrupt uses',()=>{
 const saved=storedCoupon({code:'OLD10',kind:'percent',value:10,enabled:true});assert.equal(saved.minimumPaise,0);assert.equal(saved.endsAt,null);assert.equal(saved.globalLimit,null);assert.throws(()=>storedCoupon({code:'OLD10',kind:'percent',value:10}));assert.equal(couponUses(undefined),0);for(const n of [-1,NaN,1.5,'2'])assert.throws(()=>couponUses(n));
});
test('full list traversal, deterministic filters and no partial results on failed pages',async()=>{
 const rows=await completeCoupons(async cursor=>cursor?{items:[{...coupon,code:'FIXED',kind:'fixed',createdAt:2}],nextCursor:null}:{items:[coupon],nextCursor:'SAVE10'});assert.equal(rows.length,2);assert.equal(filterCoupons(rows,{...blankCoupons(),kind:'fixed',search:'fix'},100)[0].code,'FIXED');await assert.rejects(completeCoupons(async()=>({items:[coupon],nextCursor:'same'})));let page=0;await assert.rejects(completeCoupons(async()=>{if(page++)throw Error('Unavailable');return {items:[coupon],nextCursor:'next'};}));
});

test('order-sequence eligibility validates positive integers, round trips and leaves legacy coupons unrestricted',async()=>{const {checkCouponSequence,storedCoupon,couponSequenceMessage}=await import('../../orders/model.ts');const base=storedCoupon({code:'THIRD',kind:'percent',value:10,enabled:true});assert.equal(base.eligibleOrderNumber,null);for(const n of [0,1,2,3]){checkCouponSequence(base,n,0);if(n===2)checkCouponSequence({...base,eligibleOrderNumber:3},n,0);else assert.throws(()=>checkCouponSequence({...base,eligibleOrderNumber:3},n,0));}assert.throws(()=>checkCouponSequence({...base,eligibleOrderNumber:3},2,1));for(const n of [0,-1,1.5,'3',Infinity,1000000001])assert.throws(()=>storedCoupon({...base,eligibleOrderNumber:n}));const draft=couponDraft({...base,eligibleOrderNumber:3,uses:0,revision:1,createdAt:null,updatedAt:null});assert.equal(draft.sequence,'3');assert.equal(draftCoupon(draft,null).eligibleOrderNumber,3);assert.match(couponSequenceMessage(3),/third order after 2 delivered orders/);});

import {availableCoupon} from '../../offers/model.ts';
test('public offers opt in explicitly and delegate validity and limits to checkout',()=>{
 const offer={...coupon,discoverable:true};const list=(c=offer,g=0,u=0)=>availableCoupon(c,g,u,0,100000n,true,100);
 assert.equal(storedCoupon({...coupon}).discoverable,false);assert.equal(list({...offer,discoverable:false}),null);
 for(const c of [{...offer,enabled:false},{...offer,startsAt:101},{...offer,endsAt:100}])assert.equal(list(c,1,1),null);
 assert.equal(list()?.state,'eligible');assert.equal(availableCoupon(offer,0,0,null,null,false,100)?.state,'login');
 assert.equal(availableCoupon({...offer,minimumPaise:200000},0,0,0,100000n,true,100)?.state,'minimum');assert.equal(availableCoupon(offer,0,0,0,null,false,100)?.state,'items');
 const draft=couponDraft({...offer});assert.equal(draftCoupon(draft,null).discoverable,true);
 assert.throws(()=>couponInput({...offer,discoverable:'true'}));
});
test('upcoming offers use only exact order-number policy and never expose customer counts',()=>{
 const c={...coupon,discoverable:true,eligibleOrderNumber:3};
 for(const n of [0,1]){const offer=availableCoupon(c,0,0,n,10000n,true,100)!;assert.equal(offer.state,'upcoming');assert.match(offer.message,new RegExp('Complete '+(2-n)+' more Delivered order'));assert.equal('uid' in offer,false);assert.equal('deliveredCount' in offer,false);}
 assert.equal(availableCoupon(c,0,0,2,10000n,true,100)?.state,'eligible');assert.equal(availableCoupon(c,0,0,3,10000n,true,100)?.state,'history');assert.equal(availableCoupon(c,0,1,2,10000n,true,100)?.state,'usage');
 assert.match(availableCoupon(c,0,0,null,null,false,100)!.message,/Unlock after 2 Delivered orders/);
});


test('visible ineligible coupons share minimum and usage rejection reasons with final checkout',()=>{
 const c={...coupon,discoverable:true};
 for(const [value,global,uses,subtotal,state,reason] of [
  [{...c,globalLimit:1},1,0,10000n,'usage',/total usage limit/],
  [{...c,perCustomerLimit:1},0,1,10000n,'usage',/usage limit for this coupon/],
  [{...c,minimumPaise:20000},0,0,10000n,'minimum',/minimum order amount/]
 ] as const){const visible=availableCoupon(value,global,uses,0,subtotal,true,100)!;assert.equal(visible.state,state);assert.match(visible.message,reason);assert.throws(()=>couponDiscount(value,subtotal,global,uses,100),error=>(error as Error).message===visible.message);}
 assert.match(availableCoupon({...c,eligibleOrderNumber:3},0,0,4,10000n,true,100)!.message,/third order after 2 delivered/);
 assert.match(availableCoupon({...c,eligibleOrderNumber:3},0,1,2,10000n,true,100)!.message,/already been used/);
});

test('coupon public text is validated, preserved through Admin edits, and legacy text stays optional',()=>{
 const {uses,revision,createdAt,updatedAt,...base}=coupon;
 const input=couponInput({...base,title:'  Festival offer  ',description:'Line one\r\nLine two'});
 assert.equal(input.title,'Festival offer');assert.equal(input.description,'Line one\nLine two');
 const draft=couponDraft({...input,uses,revision,createdAt,updatedAt});assert.equal(draftCoupon(draft,null).description,input.description);
 const offer=availableCoupon({...input,discoverable:true},0,0,0,100000n,true,100)!;assert.equal(offer.title,input.title);assert.equal(offer.description,input.description);
 assert.equal(storedCoupon(base).title,undefined);
 assert.throws(()=>couponInput({...base,title:'x'.repeat(101)}));assert.throws(()=>couponInput({...base,description:'x'.repeat(2001)}));assert.throws(()=>couponInput({...base,title:{private:'value'}}));
 for(const field of ['uid','customerIds','productIds','discountPaise','eligible'])assert.throws(()=>couponInput({...base,[field]:true}),{code:'invalid'});
});

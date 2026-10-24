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

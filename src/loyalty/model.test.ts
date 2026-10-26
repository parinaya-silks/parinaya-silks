import test from 'node:test';
import assert from 'node:assert/strict';
import {disabledLoyalty,validateLoyalty,savedLoyalty,loyaltyQuote,loyaltySnapshot,loyaltyRefund,balanceAfter,emptyBalance,type LoyaltyConfig} from './model.ts';
import {loyaltyDraft,loyaltyDraftInput} from './SettingsCard.tsx';
const config:LoyaltyConfig={enabled:true,earnSpendPaise:10000,earnPoints:10,pointValuePaise:100,minRedeemPoints:10,maxPercent:50,allowCoupons:false},settings={config,revision:1},balance={net:1000,reserved:0,pending:0,revision:1};
test('absent loyalty is disabled without rates; strict paise, whole points and bounded settings',()=>{
 assert.deepEqual(savedLoyalty().config,disabledLoyalty());assert.deepEqual(loyaltyDraftInput(loyaltyDraft(config)),config);
 for(const change of [{earnPoints:0},{minRedeemPoints:-1},{maxPercent:101},{pointValuePaise:1.5},{earnSpendPaise:Number.MAX_SAFE_INTEGER},{enabled:'true'},{extra:true}])assert.throws(()=>validateLoyalty({...config,...change}));
 assert.throws(()=>loyaltyDraftInput({...loyaltyDraft(config),pointValue:'0.001'}));assert.throws(()=>savedLoyalty({schemaVersion:2,revision:1,config}));
});
test('redemption floors caps after coupons, minimum, cash floor, disabled state and debt',()=>{
 const q=loyaltyQuote(settings,balance,100099n,false,999);assert.equal(q.maximum,500);assert.equal(q.appliedPoints,500);assert.equal(q.discountPaise,'50000');assert.equal(q.expectedPoints,50);assert.ok(q.warning);
 assert.equal(loyaltyQuote(settings,balance,100000n,true,100).appliedPoints,0);assert.equal(loyaltyQuote({...settings,config:{...config,allowCoupons:true}},balance,90000n,true,100).discountPaise,'10000');
 assert.equal(loyaltyQuote(settings,balance,100000n,false,9).appliedPoints,0);assert.equal(loyaltyQuote(settings,{...balance,net:-10},100000n,false,10).maximum,0);
 const all={...settings,config:{...config,maxPercent:100,minRedeemPoints:1,pointValuePaise:1}};assert.equal(loyaltyQuote(all,balance,100n,false,100).appliedPoints,99);
 const disabled=loyaltyQuote({config:disabledLoyalty(),revision:0},balance,100000n,false,50);assert.equal(disabled.expectedPoints,0);assert.equal(disabled.appliedPoints,0);assert.equal(disabled.available,1000);
 for(const points of [-1,1.5,Infinity,NaN,1e12+1,'10'])assert.throws(()=>loyaltyQuote(settings,balance,100n,false,points));
});
test('line allocations sum exactly; cumulative partial refunds equal full refund without point cash',()=>{
 const q=loyaltyQuote(settings,balance,90001n,false,300),snapshot=loyaltySnapshot(settings,q,[33333n,66667n],90001n)!;snapshot.stage='settled';snapshot.earned=snapshot.expected;
 assert.equal(snapshot.lines.reduce((n,l)=>n+BigInt(l.eligiblePaise),0n),90001n);assert.equal(snapshot.lines.reduce((n,l)=>n+BigInt(l.discountPaise),0n),30000n);
 const shipping=loyaltyRefund(snapshot,{lines:[],shippingPaise:99},'99',99);assert.equal(shipping.reverse,0);assert.equal(shipping.restore,0);
 assert.throws(()=>loyaltyRefund(snapshot,{lines:[{line:0,basisPaise:Number(snapshot.lines[0].eligiblePaise)}],shippingPaise:0},'99',Number(snapshot.lines[0].eligiblePaise)));
 let current=snapshot;for(let i=0;i<snapshot.lines.length;i++){const line=snapshot.lines[i],eligible=Number(line.eligiblePaise),discount=BigInt(line.discountPaise);let returned=0,paid=0;for(const chunk of [1,Math.floor(eligible/3),eligible-1-Math.floor(eligible/3)]){returned+=chunk;const target=returned-Number(discount*BigInt(returned)/BigInt(eligible)),cash=target-paid;paid=target;current=loyaltyRefund(current,{lines:[{line:i,basisPaise:chunk}],shippingPaise:0},'99',cash).snapshot;}}
 assert.equal(current.restored,snapshot.redeemed);assert.equal(current.reversed,snapshot.earned);assert.throws(()=>loyaltyRefund(current,{lines:[{line:0,basisPaise:1}],shippingPaise:0},'99',1));
 assert.throws(()=>loyaltyRefund(current,{lines:[],shippingPaise:100},'99',100));assert.throws(()=>loyaltyRefund(current,{lines:[],shippingPaise:0},'99',0));
});
test('points-only allocation permits zero cash, debt remains auditable and offsets future earnings',()=>{
 const c={...config,pointValuePaise:1,maxPercent:100,minRedeemPoints:1},s={config:c,revision:2},q=loyaltyQuote(s,balance,100n,false,99),o=loyaltySnapshot(s,q,[99n,1n],100n)!;o.stage='settled';o.earned=o.expected;
 const first=loyaltyRefund(o,{lines:[{line:0,basisPaise:1}],shippingPaise:0},'0',1);assert.equal(first.restore,0);
 const second=loyaltyRefund(first.snapshot,{lines:[{line:0,basisPaise:1}],shippingPaise:0},'0',0);assert.equal(second.restore,1);
 const debt=balanceAfter(emptyBalance(),-50,0,0);assert.equal(debt.net,-50);assert.equal(balanceAfter(debt,20,0,0).net,-30);assert.equal(balanceAfter(debt,60,0,0).net,10);
 assert.throws(()=>balanceAfter(emptyBalance(),0,-1,0));
});

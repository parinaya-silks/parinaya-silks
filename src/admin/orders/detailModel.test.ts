import test from 'node:test';
import assert from 'node:assert/strict';
import {orderFinance,orderCommands,activityKind,activityLabel,safeTrackingLink,callLink,refundAmount,type DetailOrder} from './detailModel.ts';
const base={status:'Delivered',paymentStatus:'due',totalPaise:'1250000',collectedPaise:500000,refunds:[],history:[],items:[]} as unknown as DetailOrder;
test('detail finance matches current active COD semantics including partial, cancelled and refunded snapshots',()=>{
 assert.deepEqual(orderFinance(base),{total:1250000n,recorded:500000n,outstanding:750000n,refunds:0n});
 assert.equal(orderFinance({...base,status:'Cancelled'}).outstanding,0n);
 assert.equal(orderFinance({...base,paymentStatus:'collected',collectedPaise:1250000,refunds:[{amountPaise:100000} as never]}).outstanding,0n);
 assert.equal(orderFinance({...base,collectedPaise:undefined,paymentStatus:'collected'}).recorded,1250000n);
 assert.throws(()=>orderFinance({...base,collectedPaise:2000000}));assert.throws(()=>orderFinance({...base,subtotalPaise:'unknown'}));
});
test('detail actions retain the real state machine and request/refund prerequisites',()=>{
 assert.ok(orderCommands(base).includes('collect'));assert.ok(!orderCommands({...base,status:'Shipped'}).includes('collect'));
 assert.ok(orderCommands({...base,status:'Confirmed'}).includes('Processing'));assert.ok(!orderCommands({...base,status:'Confirmed'}).includes('Shipped'));
 assert.ok(orderCommands({...base,status:'Processing'}).includes('Shipped'));
 assert.ok(!orderCommands(base).includes('manual-refund'));
 assert.ok(orderCommands({...base,paymentStatus:'collected',request:{status:'resolved'} as never}).includes('manual-refund'));
 assert.ok(orderCommands({...base,request:{status:'pending'} as never}).includes('approve-request'));
 assert.ok(orderCommands({...base,request:{status:'approved',kind:'return',restocked:false} as never}).includes('receive-restock'));
});
test('timeline labels distinguish actual payment, request and cancellation events without synthesizing progress',()=>{
 assert.equal(activityLabel('collect'),'COD collection recorded');assert.equal(activityKind('collect'),'payment');assert.equal(activityKind('Cancelled'),'cancellation');assert.equal(activityKind('request-return'),'request');assert.equal(activityLabel('Placed'),'Placed');
});
test('contact/tracking links and refund input use safe formats and integer paise',()=>{
 assert.equal(callLink('+91 98401 23456'),'tel:+919840123456');assert.equal(callLink('javascript:alert(1)'),null);
 assert.equal(safeTrackingLink('https://courier.example.test/track?id=1'),'https://courier.example.test/track?id=1');
 for(const value of ['javascript:alert(1)','https://user:pass@example.test','http://example.test','https://example.test/\nattack'])assert.equal(safeTrackingLink(value),null);
 assert.equal(refundAmount('123.45'),12345);for(const value of ['-1','0','0.001','1e3','999999999999999999999'])assert.throws(()=>refundAmount(value));
});

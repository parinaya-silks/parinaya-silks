import test from 'node:test';
import assert from 'node:assert/strict';
import {blankFilters,orderQuery,orderListProjection,codLabel,pageCsv} from './model.ts';
import type {OrderRecord} from '../../orders/model.ts';

test('orders filters normalize exact references and inclusive India dates',()=>{
 const query=orderQuery({...blankFilters(),search:' ps-ab12 ',statuses:['Placed','Confirmed'],paymentStatus:'due',period:'custom',start:'2026-10-01',end:'2026-10-22'});
 assert.deepEqual(query,{search:'PS-AB12',statuses:['Placed','Confirmed'],paymentStatus:'due',from:Date.parse('2026-09-30T18:30:00Z'),to:Date.parse('2026-10-22T18:29:59.999Z')});
 for(const search of ['customer@example.test','Meera','+919876543210'])assert.throws(()=>orderQuery({...blankFilters(),search}));
 for(const [start,end]of [['2026-02-30','2026-03-01'],['2026-10-23','2026-10-22']])assert.throws(()=>orderQuery({...blankFilters(),period:'custom',start,end}));
});
test('order list projection exposes only list fields and separates partial COD from delivery',()=>{
 const raw={id:'a'.repeat(32),reference:'PS-ABC',status:'Delivered',paymentStatus:'due',revision:2,createdAt:0,totalPaise:'10000',collectedPaise:3000,address:{recipientName:'=HYPERLINK("bad")',mobileNumber:'+919876543210',line1:'PRIVATE'},email:'private@example.test',uid:'private',internalNotes:'PRIVATE',items:[],history:[]} as unknown as OrderRecord;
 const row=orderListProjection(raw);assert.equal(codLabel(row),'COD — Part collected');assert.equal(row.collectedPaise,'3000');
 assert.deepEqual(Object.keys(row).sort(),['id','reference','status','paymentStatus','revision','createdAt','totalPaise','collectedPaise','customerName','customerPhone'].sort());
 const csv=pageCsv([row]);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes("'+919876543210"));assert.ok(!csv.includes('PRIVATE'));assert.ok(!csv.includes('private@example.test'));assert.equal(csv.split('\r\n').length,2);
 assert.equal(codLabel({...row,paymentStatus:'collected'}),'COD — Collected');assert.equal(codLabel({...row,collectedPaise:'0'}),'COD — Due');
 assert.equal(orderListProjection({...raw,address:undefined} as unknown as OrderRecord).customerPhone,null);
 assert.throws(()=>orderListProjection({...raw,totalPaise:'NaN'}));
});

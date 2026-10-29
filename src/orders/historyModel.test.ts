import test from 'node:test';import assert from 'node:assert/strict';
import {historyProjection,historyPayment,historyFilter,historyStatuses,type HistoryOrder} from './historyModel.ts';
import type {OrderRecord} from './model.ts';
test('history projection uses saved snapshots, bounded previews and distinct lines/units without private fields',()=>{
 const snapshot={id:'saved',reference:'PS-SAVED',createdAt:1,status:'Delivered',paymentStatus:'due',totalPaise:'90000',items:[1,2,3].map(n=>({name:'Historical '+n,quantity:n,variantName:'Saved colour',imageUrl:'',linePaise:'30000'})),refunds:[],internalNotes:'PRIVATE',email:'PRIVATE',address:{line1:'PRIVATE'}} as unknown as OrderRecord;
 const value=historyProjection(snapshot);assert.equal(value.items.length,2);assert.equal(value.lineCount,3);assert.equal(value.unitCount,6);assert.equal(value.items[0].name,'Historical 1');assert.ok(!JSON.stringify(value).includes('PRIVATE'));assert.match(historyPayment(value).message,/Due at delivery/);
 assert.equal(historyPayment({...value,status:'Cancelled'}).label,'Order Value');assert.match(historyPayment({...value,status:'Rejected'}).message,/No delivery payment/);
 assert.equal(historyPayment({...value,paymentStatus:'collected'}).message,'COD · Collection recorded');
 assert.equal(historyProjection({...snapshot,paymentStatus:'collected'}).collectedPaise,null);assert.equal(historyPayment({...value,collectedPaise:'10000'}).label,'Order Total');
 const legacy=historyProjection({...snapshot,items:[{name:'',quantity:undefined,linePaise:undefined}] as never});assert.equal(legacy.items[0].name,'Purchased item');assert.equal(legacy.items[0].linePaise,null);assert.equal(legacy.unitCount,null);
});
test('history filter groups retain domain states and reject arbitrary query values',()=>{assert.deepEqual(historyStatuses.progress,['Placed','Confirmed','Processing','Shipped']);assert.deepEqual(historyStatuses.cancelled,['Cancelled','Rejected']);assert.equal(historyFilter('?status=delivered'),'delivered');assert.equal(historyFilter('?status=made-up'),'all');});

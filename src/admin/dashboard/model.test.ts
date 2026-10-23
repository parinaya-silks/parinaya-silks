import test from 'node:test';import assert from 'node:assert/strict';
import {periodRange,customRange,indiaDate,lowStockLines,bulkEligible,commonCommands,type DashboardOrder} from './model.ts';
test('dashboard calendar periods use India midnight, full months, leap years and year rollover',()=>{
 assert.equal(indiaDate(Date.parse('2026-12-31T18:30:00Z')),'2027-01-01');
 const today=periodRange('today',Date.parse('2026-12-31T18:30:00Z'));assert.equal(today.start,'2027-01-01');assert.equal(new Date(today.from).toISOString(),'2026-12-31T18:30:00.000Z');assert.equal(new Date(today.to).toISOString(),'2027-01-01T18:29:59.999Z');
 const week=periodRange('week',today.from);assert.equal(week.start,'2026-12-26');assert.equal(week.to-week.from+1,7*86400000);
 const leap=periodRange('month',Date.parse('2028-02-02'));assert.equal(leap.end,'2028-02-29');assert.equal(periodRange('month',Date.parse('2026-12-20')).end,'2026-12-31');
 for(const dates of [['2026-02-30','2026-03-01'],['2026-10-02','2026-10-01'],['bad','2026-10-01']])assert.throws(()=>customRange(dates[0],dates[1]));
});
test('low stock respects each variant threshold and bulk excludes unsupported shipping/payment transitions',()=>{
 const lines=lowStockLines([{id:'simple',name:'Simple',revision:1,threshold:2,inventory:{mode:'simple',quantity:2}},{id:'colour',name:'Colour',revision:1,threshold:1,inventory:{mode:'variants',variants:[{id:'wine',name:'Wine',quantity:0},{id:'gold',name:'Gold',quantity:9},{id:'teal',name:'Teal',quantity:1}]}}]);
 assert.deepEqual(lines.map(line=>[line.id,line.quantity]),[['simple-simple',2],['colour-wine',0],['colour-teal',1]]);
 const order=(status:DashboardOrder['status'])=>({status}) as DashboardOrder;
 assert.deepEqual(commonCommands([order('Placed')]),['Confirmed']);assert.deepEqual(commonCommands([order('Confirmed')]),['Processing']);assert.deepEqual(commonCommands([order('Placed'),order('Confirmed')]),[]);assert.equal(bulkEligible(order('Processing')),false);assert.equal(bulkEligible(order('Delivered')),false);
});

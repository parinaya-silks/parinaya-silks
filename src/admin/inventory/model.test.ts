import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProduct,type ProductRecord} from '../../products/model.ts';
import {adjustmentPreview,auditChanges,blankInventory,filterInventory,inventoryCsv,inventorySummary,stockLines} from './model.ts';
const simple={...emptyProduct(),id:'s',name:'Simple',sku:'S',inventory:{mode:'simple',quantity:2},lowStockThreshold:2,revision:1,createdAt:1,updatedAt:2,categoryName:'Silk'} as ProductRecord;
const colour={...simple,id:'v',name:'=Unsafe',sku:'V',inventory:{mode:'variants',variants:[{id:'red',name:'Red',sku:'RED',hex:'#780D24',quantity:10},{id:'blue',name:'Blue',sku:'BLUE',hex:'#0000FF',quantity:0},{id:'gold',name:'Gold',sku:'GOLD',hex:'#B8860B',quantity:1}]}} as ProductRecord;
test('inventory counts stock sources once, keeps low positive and zero separate, and searches individual colours',()=>{
 assert.deepEqual(inventorySummary([simple,colour]),{available:13,low:2,out:1});assert.equal(stockLines(colour).length,3);
 assert.deepEqual(filterInventory([simple,colour],{...blankInventory(),stock:'out'}).map(p=>p.id),['v']);
 assert.equal(filterInventory([colour],{...blankInventory(),stock:'low'}).length,1);
 assert.equal(filterInventory([simple],{...blankInventory(),stock:'in'}).length,1);
 assert.equal(filterInventory([colour],{...blankInventory(),search:'BLUE'}).length,1);
 assert.equal(filterInventory([colour],{...blankInventory(),status:'Published'}).length,0);
});
test('adjustment modes never clamp overselling or accept fractions and allow explicit threshold-only zero',()=>{
 assert.deepEqual(adjustmentPreview(2,'add','3'),{before:2,delta:3,after:5});assert.equal(adjustmentPreview(2,'remove','2').after,0);assert.equal(adjustmentPreview(2,'set','0').delta,-2);assert.equal(adjustmentPreview(2,'add','0').delta,0);
 for(const value of ['', '-1','1.5','1000001'])assert.throws(()=>adjustmentPreview(2,'add',value));assert.throws(()=>adjustmentPreview(2,'remove','3'));
});
test('inventory export has one row per stock source, formula protection and real recorded history deltas',()=>{
 const csv=inventoryCsv([simple,colour]);assert.equal(csv.split('\r\n').length,5);assert.ok(csv.includes("'=Unsafe"));
 const event={id:'event',productId:'v',before:colour.inventory,after:{...colour.inventory,variants:colour.inventory.variants!.map(v=>v.id==='red'?{...v,quantity:9}:v)}};
 assert.deepEqual(auditChanges(event,'red'),[{id:'red',name:'Red',before:10,after:9,delta:-1}]);assert.equal(auditChanges(event,'blue').length,0);
 assert.equal(auditChanges({id:'old',productId:'v',after:simple.inventory},undefined)[0].delta,null);
});

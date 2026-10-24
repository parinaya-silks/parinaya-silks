import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProducts,completeCatalogue,filterProducts,restoreProducts,productsCsv} from './model.ts';
import {emptyProduct,type ProductRecord} from '../../products/model.ts';
const records=Array.from({length:63},(_,i)=>({...emptyProduct(),id:String(i),name:'Saree '+i,sku:'PS-'+i,slug:'saree-'+i,categoryId:i%2?'silk':'cotton',categoryName:'Category',pricePaise:i*100,images:[],inventory:{mode:'simple' as const,quantity:i%3},status:i%2?'Published' as const:'Draft' as const,createdAt:i,updatedAt:i,revision:1}));
test('complete catalogue includes later pages; a partial, duplicate or looping result never becomes a successful list',async()=>{
 const all=await completeCatalogue(async cursor=>({items:cursor?records.slice(50):records.slice(0,50),nextCursor:cursor?null:'50'}));assert.equal(all.length,63);assert.equal(filterProducts(all,{...blankProducts(),search:'PS-62'})[0].id,'62');
 await assert.rejects(completeCatalogue(async cursor=>{if(cursor)throw Error('offline');return {items:records.slice(0,50),nextCursor:'50'};}),/offline/);
 await assert.rejects(completeCatalogue(async()=>({items:[],nextCursor:'repeat'})),/pagination/);
 await assert.rejects(completeCatalogue(async()=>({items:records,nextCursor:'repeat'})),/changed/);
});
test('all filters combine, availability is separate from publication and sorts are stable',()=>{
 const f={...blankProducts(),categories:['silk'],status:'Published',stock:'low'};assert.ok(filterProducts(records,f).every(p=>p.categoryId==='silk'&&p.status==='Published'&&p.inventory.quantity!>0&&p.inventory.quantity!<=p.lowStockThreshold));
 assert.equal(filterProducts(records,{...blankProducts(),sort:'price-high'})[0].pricePaise,6200);assert.equal(filterProducts(records,{...blankProducts(),sort:'oldest'})[0].id,'0');
 assert.ok(filterProducts(records,{...blankProducts(),status:'Published',stock:'out'}).length>0);assert.equal(filterProducts(records,{...blankProducts(),search:'missing'}).length,0);
});
test('list context is account-scoped and CSV values use formula protection',()=>{
 const filters={...blankProducts(),page:3,search:'silk'};assert.deepEqual(restoreProducts({productsContext:{uid:'owner',filters}},'owner'),filters);assert.equal(restoreProducts({productsContext:{uid:'owner',filters}},'other').page,1);
 const csv=productsCsv([{...records[0],name:'=UNTRUSTED()',sku:'+formula'} as ProductRecord]);assert.ok(csv.includes("'=UNTRUSTED()"));assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('0.00'));
});

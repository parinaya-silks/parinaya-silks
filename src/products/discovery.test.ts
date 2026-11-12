import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryFilters,matchesFilters,discoveryUrl} from './discovery.ts';
import {emptyProduct} from './model.ts';
import {discoveryPage} from '../../server/discovery.ts';
import {bannerSeconds,validateBannerTiming} from '../content/bannerTiming.ts';
test('catalog matching combines groups with OR colours, literal substring search and integer paise bounds',()=>{
 const p={...emptyProduct(),categoryName:'Cotton Sarees',name:'Local Blue',description:'Handwoven',sku:'LOCAL-1',colorName:'Red',inventory:{mode:'variants' as const,variants:[{id:'blue',name:'Blue',hex:'#0000ff',quantity:1}]},pricePaise:100001,originalPricePaise:110000};
 assert.ok(matchesFilters(p,discoveryFilters({q:'BLUE',colors:'gold|blue',minPrice:'100001',maxPrice:'100001',inStock:'true',sale:'true'})));
 assert.ok(!matchesFilters(p,discoveryFilters({q:'bluue'})));assert.ok(!matchesFilters(p,discoveryFilters({maxPrice:'100000'})));
 for(const params of [{maxPrice:'1.5'},{minPrice:'10',maxPrice:'9'},{inStock:'yes'},{sort:'random'},{q:'x'.repeat(101)},{extra:'ignored'}])assert.throws(()=>discoveryFilters(params as unknown as Record<string,string>),{code:'invalid'});
 assert.equal(discoveryUrl('/shop',{sale:true}),'/shop?sale=true');
 assert.equal(discoveryUrl('/collections/cotton?old=1',{q:'blue',sort:'price-asc',colors:['red'],maxPrice:100001}),'/collections/cotton?search=blue&sort=price-asc&maxPrice=100001&colors=red');
});
test('server discovery filters before pagination with exact counts, facets and query/version-bound cursors',()=>{
 const rows=Array.from({length:240},(_,i)=>({...emptyProduct(),id:String(i),revision:1,categoryName:'Cotton',name:i<210?'Red':'Blue',colorName:i<210?'Red':'Blue',colorHex:'#123456',pricePaise:i+1}));
 const all=discoveryFilters({}),first=discoveryPage(rows,all,undefined,'all');assert.equal(first.total,240);assert.equal(first.items.length,50);assert.equal(first.facets.colors.length,2);
 const next=discoveryPage(rows,all,first.nextCursor!,'all');assert.equal(next.items[0].id,[...rows].sort((a,b)=>b.id.localeCompare(a.id))[50].id);assert.equal(new Set([...first.items,...next.items].map(i=>i.id)).size,100);
 assert.throws(()=>discoveryPage(rows,all,Buffer.from('null').toString('base64url'),'all'),{code:'invalid'});
 const blue=discoveryPage(rows,discoveryFilters({q:'blue'}),undefined,'all');assert.equal(blue.total,30);assert.equal(blue.items[0].id,'239');assert.equal(blue.nextCursor,null);
 assert.throws(()=>discoveryPage(rows,discoveryFilters({q:'blue'}),first.nextCursor!,'all'),{code:'conflict'});assert.throws(()=>discoveryPage([...rows,{...rows[0],id:'new'}],all,first.nextCursor!,'all'),{code:'conflict'});
});
test('banner timing defaults safely while writes require 2-15 whole seconds',()=>{
 for(const value of [undefined,null,0,1,16,3.5,'5',NaN])assert.equal(bannerSeconds(value),3);
 for(const seconds of [2,3,15])assert.deepEqual(validateBannerTiming({seconds}),{seconds});
 for(const value of [{seconds:0},{seconds:3.5},{seconds:'3'},{seconds:5,secret:true},null])assert.throws(()=>validateBannerTiming(value),{code:'invalid'});
});

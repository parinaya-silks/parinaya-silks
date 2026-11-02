import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyProduct,discount,normalizeHex,productVideoUrl,safeProductVideo,validateProduct,productInput,type ProductRecord} from './model.ts';
import {storefrontProduct} from './adapter.ts';
import {publicProduct} from '../../server/publicProduct.ts';
import {socialLinks} from '../contact/socialLinks.ts';
import {publicContact,storedContact} from '../contact/model.ts';
import {BRAND_NAME} from '../config/brand.ts';

test('discount uses integer public selling paise with floor and no invalid badges',()=>{
 assert.equal(discount({pricePaise:160000,originalPricePaise:200000}),20);
 for(const [price,mrp] of [[200000,null],[200000,200000],[200000,190000],[0,200000],[-1,200000],[NaN,200000],[160000,Infinity],[199999,200000]])assert.equal(discount({pricePaise:price!,originalPricePaise:mrp}),0);
 assert.equal(discount({pricePaise:123405,originalPricePaise:150000}),17);
});
test('hex inputs canonicalize supported entries, retain blank optional and stable variant identity',()=>{
 assert.equal(normalizeHex(' #f0a '),'#FF00AA');assert.equal(normalizeHex('#aB90ef'),'#AB90EF');assert.equal(normalizeHex(''),'');
 for(const v of ['red','#1234','#12345678','rgb(0,0,0)','url(x)'])assert.throws(()=>normalizeHex(v));assert.throws(()=>normalizeHex('',true));
 const inv={mode:'variants' as const,variants:[{id:'saved-colour',sku:'SAVED-CODE',name:'Wine',hex:'#aabbcc',quantity:12}]};
 const input=validateProduct({...emptyProduct(),slug:'saved',colorHex:'',inventory:inv});assert.equal(input.colorHex,'');assert.deepEqual(input.inventory.variants?.map(v=>[v.id,v.sku,v.name,v.quantity]),inv.variants.map(v=>[v.id,v.sku,v.name,v.quantity]));
 assert.equal(input.inventory.variants?.[0].hex,'#AABBCC');
});
test('optional reel survives save/edit/public projection and clearing; unsafe hosts fail closed',()=>{
 const url='https://www.instagram.com/reel/fixture/';const input=validateProduct({...emptyProduct(),slug:'video',videoUrl:url});
 const record={...input,id:'p'.repeat(20),categoryName:'Silk',images:[],revision:1,createdAt:1,updatedAt:1} as ProductRecord;
 assert.equal(productInput(record).videoUrl,url);assert.equal(publicProduct(record).videoUrl,url);assert.equal(storefrontProduct(publicProduct(record)).videoUrl,url);
 assert.equal(validateProduct({...productInput(record),videoUrl:''}).videoUrl,'');assert.equal(validateProduct({...emptyProduct(),slug:'legacy'}).videoUrl,'');
 for(const url of ['https://youtu.be/abc','https://youtube.com/watch?v=abc','https://m.youtube.com/shorts/abc','https://www.facebook.com/watch/?v=1','https://fb.watch/abc/'])assert.ok(productVideoUrl(url));
 for(const url of ['javascript:alert(1)','http://youtu.be/a','https://youtube.com.evil.test/watch','https://www.youtube.com@evil.test/a','https://evil.test/a','https://youtu.be:444/a','https://youtu.be/\\evil','not a url']){assert.throws(()=>productVideoUrl(url));assert.equal(safeProductVideo(url),'');}
 assert.equal(safeProductVideo(null),'');assert.equal(publicProduct({...record,videoUrl:'javascript:alert(1)'}).videoUrl,'');
});
test('floating social links use only validated existing public fields and empty means hidden',()=>{
 assert.deepEqual(socialLinks(publicContact()),[]);assert.deepEqual(socialLinks({...publicContact(),instagram:'https://instagram.com.evil.test/private'}),[]);
 const saved=storedContact({instagram:'https://www.instagram.com/parinaya_3999/',facebook:'https://facebook.com/local',address:'PRIVATE',showAddress:false});
 const view=publicContact(saved);assert.equal(view.address,'');assert.equal(socialLinks(view).length,2);assert.ok(!JSON.stringify(socialLinks(view)).includes('PRIVATE'));
 assert.deepEqual(socialLinks(publicContact({...saved,instagram:'',facebook:''})),[]);
});
test('brand display changes preserve infrastructure identifiers and saved arrival keys',async()=>{
 assert.equal(BRAND_NAME,'Parinaya Sarees');const config=await readFile('src/services/firebase/config.ts','utf8'),seo=await readFile('src/content/Seo.tsx','utf8'),adapter=await readFile('src/products/adapter.ts','utf8');
 assert.match(config,/parinaya-silks/);assert.match(seo,/https:\/\/parinayasilks.vercel.app/);assert.match(adapter,/record.newArrival/);assert.match(adapter,/'New Arrival'/);
});

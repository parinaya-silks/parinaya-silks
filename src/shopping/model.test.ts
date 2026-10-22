import test from 'node:test';
import assert from 'node:assert/strict';
import {bagId,positiveQuantity,resolveItem,subtotalPaise,money} from './model.ts';
import {emptyProduct,type PublicProductRecord} from '../products/model.ts';
test('stable simple/colour identities, exact paise totals and unavailable exclusions',()=>{
  const id='a'.repeat(20);assert.notEqual(bagId(id,null),bagId(id,'simple'));assert.notEqual(bagId(id,'red'),bagId(id,'blue'));
  for(const qty of [0,-1,1.1,'1',Infinity,1000001])assert.throws(()=>positiveQuantity(qty));
  const product={...emptyProduct(),id,pricePaise:123405,inventory:{mode:'simple',quantity:3},images:[],createdAt:0,categoryName:'Silk'} as PublicProductRecord;
  const item={id:bagId(id,null),productId:id,variantId:null,quantity:2};
  assert.equal(subtotalPaise([resolveItem(item,product,true)]),246810n);
  assert.equal(subtotalPaise([resolveItem({...item,quantity:4},product,true)]),0n);
  const large=resolveItem({...item,quantity:1000000},{...product,pricePaise:99999999,inventory:{mode:'simple',quantity:1000000}},true);
  assert.equal(subtotalPaise(Array(100).fill(large)),9999999900000000n);
  assert.equal(resolveItem(item,null,true).product,null);
  assert.equal(resolveItem(item,{...product,inventory:{mode:'simple',quantity:0}},false).reason,'Currently out of stock.');
  assert.match(money(123405),/1,234\.05/);
  assert.ok(money(9007199254740993n).endsWith('.93'));
});

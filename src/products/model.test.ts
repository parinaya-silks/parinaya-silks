import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProduct,validateProduct,quantity,rupeesToPaise,discount} from './model.ts';
test('drafts can be incomplete; money, publication and field constraints are enforced',()=>{
  const draft={...emptyProduct(),slug:'permanent-draft'};
  assert.equal(validateProduct(draft).status,'Draft');
  assert.equal(rupeesToPaise('1234.05'),123405);assert.equal(rupeesToPaise('0.10'),10);assert.ok(Number.isNaN(rupeesToPaise('1.005')));
  assert.equal(discount({pricePaise:75000,originalPricePaise:100000}),25);
  for(const change of [{status:'Published'},{pricePaise:1.5},{pricePaise:-1},{originalPricePaise:0},{slug:'Bad slug'},{stockCount:99},{revision:99},{images:[{mediaId:'a'.repeat(32),alt:'x',url:'https://evil.example'}]},{inventory:{mode:'simple',quantity:-1,variants:[]}},{inventory:{mode:'simple',quantity:0.5,variants:[]}}])assert.throws(()=>validateProduct({...draft,...change}));
});
test('variants have one stock source and unique stable identifiers and SKUs',()=>{
  const variants=[{id:'wine',sku:'WINE-1',name:'Wine',hex:'#780D24',quantity:2},{id:'gold',sku:'GOLD-1',name:'Gold',hex:'#B88A44',quantity:3}];
  const draft={...emptyProduct(),slug:'variants',inventory:{mode:'variants' as const,quantity:0,variants}};
  assert.equal(quantity(validateProduct(draft)),5);
  for(const inventory of [{...draft.inventory,quantity:5},{...draft.inventory,variants:[variants[0],variants[0]]},{...draft.inventory,variants:[variants[0],{...variants[1],sku:'wine-1'}]},{...draft.inventory,variants:[{...variants[0],quantity:1.5}]}])assert.throws(()=>validateProduct({...draft,inventory}));
});

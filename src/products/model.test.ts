import {storefrontProduct} from './adapter.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProduct,validateProduct,quantity,rupeesToPaise,discount} from './model.ts';
test('drafts can be incomplete; money, publication and field constraints are enforced',()=>{
  const draft={...emptyProduct(),slug:'permanent-draft'};
  assert.equal(validateProduct(draft).status,'Draft');
  assert.equal(rupeesToPaise('1234.05'),123405);assert.equal(rupeesToPaise('0.10'),10);assert.ok(Number.isNaN(rupeesToPaise('1.005')));
  assert.equal(discount({pricePaise:75000,originalPricePaise:100000}),25);
  for(const change of [{status:'Published'},{pricePaise:1.5},{pricePaise:-1},{pricePaise:1,originalPricePaise:0},{slug:'Bad slug'},{stockCount:99},{revision:99},{images:[{mediaId:'a'.repeat(32),alt:'x',url:'https://evil.example'}]},{inventory:{mode:'simple',quantity:-1,variants:[]}},{inventory:{mode:'simple',quantity:0.5,variants:[]}}])assert.throws(()=>validateProduct({...draft,...change}));
});

test('inventory writes contain only the active stock source while legacy neutral fields remain readable',()=>{
  const draft={...emptyProduct(),slug:'inventory'};
  assert.deepEqual(validateProduct({...draft,inventory:{mode:'simple',quantity:35,variants:[]}}).inventory,{mode:'simple',quantity:35});
  const variants=[{id:'wine',sku:'WINE-1',name:'Wine',hex:'#780D24',quantity:3}];
  assert.deepEqual(validateProduct({...draft,inventory:{mode:'variants',quantity:0,variants}}).inventory,{mode:'variants',variants});
  assert.deepEqual(validateProduct({...draft,inventory:{mode:'variants',variants}}).inventory,{mode:'variants',variants});
  assert.throws(()=>validateProduct({...draft,inventory:{mode:'simple',quantity:35,variants}}),{code:'invalid'});
});

test('a simple saree can publish without optional fabric, weave, length or care fields',()=>{
  const mediaId='a'.repeat(32);
  const product={...emptyProduct(),slug:'simple-saree',sku:'PS-unique',name:'Simple saree',description:'Owner description',categoryId:'a'.repeat(20),status:'Published',pricePaise:150000,images:[{mediaId,alt:'Simple saree'}],coverMediaId:mediaId};
  assert.equal(validateProduct(product).status,'Published');
});
test('MRP supports equal prices and clearing without changing the independent selling price',()=>{
 const draft={...emptyProduct(),slug:'mrp',pricePaise:850005,originalPricePaise:850005};assert.equal(discount(validateProduct(draft)),0);assert.equal(validateProduct({...draft,originalPricePaise:null}).pricePaise,850005);assert.equal(validateProduct({...draft,originalPricePaise:1000000}).pricePaise,850005);assert.throws(()=>validateProduct({...draft,originalPricePaise:850004}));
});
test('variants have one stock source and unique stable identifiers and SKUs',()=>{
  const variants=[{id:'wine',sku:'WINE-1',name:'Wine',hex:'#780D24',quantity:2},{id:'gold',sku:'GOLD-1',name:'Gold',hex:'#B88A44',quantity:3}];
  const draft={...emptyProduct(),slug:'variants',inventory:{mode:'variants' as const,quantity:0,variants}};
  assert.equal(quantity(validateProduct(draft)),5);
  for(const inventory of [{...draft.inventory,quantity:5},{...draft.inventory,variants:[variants[0],variants[0]]},{...draft.inventory,variants:[variants[0],{...variants[1],sku:'wine-1'}]},{...draft.inventory,variants:[{...variants[0],quantity:1.5}]}])assert.throws(()=>validateProduct({...draft,inventory}));
});

test('equal MRP does not create a crossed-out storefront price or a false saving',()=>{const record={...emptyProduct(),slug:'equal-mrp',pricePaise:850005,originalPricePaise:850005,id:'test',revision:1,createdAt:0,updatedAt:0,categoryName:'',images:[]};assert.equal(storefrontProduct(record).originalPrice,undefined);assert.equal(storefrontProduct(record).discountPercent,0);assert.equal(storefrontProduct(record).price,8500.05);assert.equal(storefrontProduct({...record,originalPricePaise:1000000}).originalPrice,10000);});

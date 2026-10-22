import test from 'node:test';
import assert from 'node:assert/strict';
import {initialShipping,validateShipping,savedShipping,quoteShipping,shippingAmount,MAX_FLAT_FEE,MAX_THRESHOLD} from './model.ts';
test('shipping uses exact paise with strictly above threshold qualification',()=>{
  const settings={state:'ready' as const,revision:1,config:{...initialShipping(),revision:1}};
  for(const [subtotal,fee,total]of [[999900n,'9900','1009800'],[1000000n,'9900','1009900'],[1000001n,'0','1000001']] as const){const quote=quoteShipping(settings,subtotal,true);assert.equal(quote.shippingPaise,fee);assert.equal(quote.totalPaise,total);assert.equal(quote.revision,1);}
  assert.equal(quoteShipping({...settings,config:{...settings.config,freeShippingEnabled:false}},1000001n,true).shippingPaise,'9900');
  assert.equal(quoteShipping({...settings,config:{...settings.config,flatFeePaise:1234,freeThresholdPaise:5000}},5000n,true).totalPaise,'6234');
  assert.equal(quoteShipping({...settings,config:{...settings.config,flatFeePaise:0}},100n,true).shippingPaise,'0');
  assert.equal(quoteShipping(settings,9007199254740993n,true).totalPaise,'9007199254740993');
  assert.equal(quoteShipping(settings,1000001n,false).totalPaise,null);
});
test('missing/invalid shipping has no fallback; monetary fields are bounded integer paise',()=>{
  assert.equal(quoteShipping(savedShipping(undefined),1000001n,true).shippingPaise,null);
  for(const changes of [{flatFeePaise:-1},{freeThresholdPaise:1.1},{flatFeePaise:MAX_FLAT_FEE+1},{freeThresholdPaise:MAX_THRESHOLD+1},{freeShippingEnabled:'true'},{coverage:'one-city'},{country:'Other'},{method:'weight'},{uid:'admin'}])assert.throws(()=>validateShipping({...initialShipping(),...changes}));
  for(const text of ['', ' ', '1e2','-1','1.001','abc','1.','Infinity'])assert.throws(()=>shippingAmount(text,MAX_FLAT_FEE));
  assert.equal(shippingAmount('99.00',MAX_FLAT_FEE),9900);assert.equal(shippingAmount('0',MAX_FLAT_FEE),0);
  assert.equal(savedShipping({...initialShipping(),schemaVersion:1,revision:2}).state,'ready');
  assert.equal(savedShipping({...initialShipping(),flatFeePaise:'9900',schemaVersion:1,revision:2}).state,'invalid');
});

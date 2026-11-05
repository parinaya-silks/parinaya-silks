import test from 'node:test';
import assert from 'node:assert/strict';
import {shippingDraft,shippingInput} from './model.ts';
import {savedShipping,initialShipping,quoteShipping} from '../../shipping/model.ts';
test('settings money conversion is exact, explicit missing state and disabled threshold retained',()=>{const missing=savedShipping(undefined);assert.deepEqual(shippingDraft(missing),{fee:'',threshold:'',free:false});assert.throws(()=>shippingInput(shippingDraft(missing),missing));assert.equal(shippingInput({fee:'0.29',threshold:'',free:false},missing).flatFeePaise,29);const saved=savedShipping({...initialShipping(),schemaVersion:1,revision:1,freeThresholdPaise:12345});assert.equal(shippingInput({fee:'100',threshold:'',free:false},saved).freeThresholdPaise,12345);for(const fee of ['-1','1.001','1e3','Infinity','',',','1,000'])assert.throws(()=>shippingInput({fee,threshold:'0',free:true},saved));assert.equal(quoteShipping(savedShipping(undefined),100n,true).shippingPaise,null);});
test('shipping preview preserves strict threshold semantics and explicit zero',()=>{const s=savedShipping({...initialShipping(),schemaVersion:1,revision:1,flatFeePaise:25000,freeThresholdPaise:500000});assert.equal(quoteShipping(s,499999n,true).shippingPaise,'25000');assert.equal(quoteShipping(s,500000n,true).shippingPaise,'25000');assert.equal(quoteShipping(s,500001n,true).shippingPaise,'0');assert.equal(shippingInput({fee:'0',threshold:'0',free:true},s).freeThresholdPaise,0);});

import {defaultTheme,savedTheme,publicTheme,themeInput} from '../../appearance/theme.ts';
test('themes default to Classic Cream and expose only a validated enum and revision',()=>{
 assert.deepEqual(savedTheme(undefined),defaultTheme);assert.equal(defaultTheme.theme,'classic-cream');
 for(const theme of ['classic-cream','light-maroon'])assert.deepEqual(savedTheme({theme,schemaVersion:1,revision:3,updatedBy:'private'}),{theme,revision:3});
 for(const raw of [null,{}, {theme:'unknown'},{theme:'light-maroon',css:'arbitrary'}])assert.throws(()=>themeInput(raw));
 assert.equal(publicTheme({theme:'injected',schemaVersion:1,revision:1}).theme,'classic-cream');assert.equal(publicTheme(null).theme,'classic-cream');
 assert.throws(()=>savedTheme({theme:'classic-cream',schemaVersion:2,revision:1}));
});

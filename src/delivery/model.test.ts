import test from 'node:test';
import assert from 'node:assert/strict';
import {blankAddress,validateAddress,indiaStates,addressId} from './model.ts';
import {safeCustomerReturn} from '../customer/policy.ts';
const valid={...blankAddress(),recipientName:' Owner Recipient ',mobileNumber:'(98765) 43210',pinCode:'500034',line1:'12, Example Street',locality:'Example locality',city:'Hyderabad',state:'Telangana'};
test('addresses use India mobile normalization and format validation without inferred PIN/city mappings',()=>{
  const result=validateAddress(valid);assert.equal(result.mobileNumber,'+919876543210');assert.equal(result.recipientName,'Owner Recipient');
  assert.equal(validateAddress({...valid,city:'Another town',pinCode:'110001'}).city,'Another town');
  assert.equal(indiaStates.length,36);
  for(const changes of [{recipientName:''},{mobileNumber:'123'},{pinCode:'012345'},{line1:''},{locality:''},{city:''},{state:'Invented'},{country:'Other'},{label:'x'.repeat(31)},{landmark:'bad\nline'},{uid:'other'},{isDefault:true}])assert.throws(()=>validateAddress({...valid,...changes}));
  assert.throws(()=>addressId('../someone'));assert.equal(addressId('a'.repeat(32)),'a'.repeat(32));
});
test('checkout/address returns stay internal and reject nested returns and traversal',()=>{
  assert.equal(safeCustomerReturn('/checkout'),'/checkout');assert.equal(safeCustomerReturn('/account/addresses'),'/account/addresses');
  for(const path of ['/checkout/../admin','/checkout?returnTo=/admin','/account/addresses?returnTo=https://evil.test','/account/addresses/../admin','//evil.test'])assert.equal(safeCustomerReturn(path),'/account');
});

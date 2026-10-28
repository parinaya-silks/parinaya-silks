import test from 'node:test';
import assert from 'node:assert/strict';
import {CustomerError,safeCustomerReturn,validateCustomerFields,customerErrorMessage,passwordPolicyMessage} from './policy.ts';
import type {PasswordValidationStatus} from 'firebase/auth';

test('customer returns allow implemented internal pages and reject external, nested, encoded or privileged destinations',()=>{
  for(const value of ['https://evil.test','//evil.test','/\\evil.test','/shop\n','/%2f%2fevil.test','/%252f%252fevil.test','/shop/../admin','/admin','/admin/products','/api/catalog','/login','/register','/verify-email','/shop?returnTo=https://evil.test','/product/../admin','javascript:alert(1)','/shop#//evil.test','/shop%00'])assert.equal(safeCustomerReturn(value),'/account');
  for(const value of ['/','/shop','/shop?search=Wine%20silk','/product/test','/collections/festival-offers','/account','/privacy-policy'])assert.equal(safeCustomerReturn(value),value);
});
test('validation preserves passwords and returns field errors without exposing credentials',()=>{
  const password='  Valid Password 1!  ';
  assert.equal(validateCustomerFields({email:' customer@example.test ',password,name:'Customer',confirm:password},true),'customer@example.test');
  assert.throws(()=>validateCustomerFields({email:'bad',password:'',name:'',confirm:'no'},true),{fields:{email:'Enter a valid email address.',password:'Enter your password.',name:'Enter your name, up to 100 characters.',confirm:'The passwords do not match.'}});
  assert.equal(customerErrorMessage({code:'auth/user-not-found',message:'sensitive'}),customerErrorMessage({code:'auth/wrong-password'}));
  assert.equal(customerErrorMessage(new Error('private-value')).includes('private-value'),false);
  assert.equal(customerErrorMessage(new CustomerError('Check your name.')),'Check your name.');
});
test('password help follows the configured Firebase policy rather than an invented local policy',()=>{
  const status={isValid:false,meetsMinPasswordLength:false,containsUppercaseLetter:false,containsNumericCharacter:false,passwordPolicy:{customStrengthOptions:{minPasswordLength:12}}} as PasswordValidationStatus;
  assert.equal(passwordPolicyMessage(status),'Use at least 12 characters, an uppercase letter, a number.');
});

test('permanent customer order links survive sign-in without allowing arbitrary destinations',()=>{
 for(const prefix of ['/account/orders/','/order-tracking/','/order-confirmed/','/order-result/']){const value=prefix+'a'.repeat(32);assert.equal(safeCustomerReturn(value),value);assert.equal(safeCustomerReturn(prefix+'../admin'),'/account');}
});

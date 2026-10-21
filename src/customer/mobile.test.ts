import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMobile} from './mobile.ts';
test('mobile normalization accepts pasted formatting and validates the selected country without verification',()=>{
  for(const input of ['9876543210','98765 43210','+91 (98765)-43210','09876543210'])assert.equal(normalizeMobile(input,'IN'),'+919876543210');
  assert.equal(normalizeMobile('+44 7400 123456','GB'),'+447400123456');
  for(const input of ['', '12345','1234567890','+91 1234567890','+44 7400 123456','Call 9876543210','9876543210 ext 1'])assert.throws(()=>normalizeMobile(input,'IN'),{fields:{mobileNumber:'Enter a complete mobile number for the selected country.'}});
});

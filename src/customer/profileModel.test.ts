import test from 'node:test';
import assert from 'node:assert/strict';
import {customerInitials,profileInput} from './profileModel.ts';
test('profile initials use the customer name and a neutral absent-name fallback',()=>{assert.equal(customerInitials(' Ananya Rao '),'AR');assert.equal(customerInitials(''),'C');assert.equal(customerInitials('First Middle Last'),'FM');});
test('profile fields normalize pasted mobile formatting and retain legacy unset phones',()=>{assert.deepEqual(profileInput(' Name ','(98765) 43210','IN'),{displayName:'Name',mobileNumber:'+919876543210'});assert.equal(profileInput('Name','','IN').mobileNumber,null);assert.throws(()=>profileInput('Name','','IN',true));assert.throws(()=>profileInput('Name','123','IN'));assert.throws(()=>profileInput('bad\nname','9876543210','IN'));});

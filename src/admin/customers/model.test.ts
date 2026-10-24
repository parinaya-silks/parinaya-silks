import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blankCustomerFilters,customerFilterQuery,restoreCustomers,customerPath,customerUid,searchTerm,searchPrefixes,customerCsv,joinedDate} from './model.ts';
import {safeAdminDestination} from '../accessPolicy.ts';
test('customer filters normalize names/email/mobile, use IST dates and preserve UID identity in routes',()=>{
 assert.equal(searchTerm('  MEERA   Sundaram '),'meera sundaram');assert.equal(searchTerm('+91 (98401) 23456'),'919840123456');
 const prefixes=searchPrefixes('Smt. Meera Sundaram','Meera@Example.test','+919840123456');for(const term of ['smt. me','meera','sund','meera@ex','98401','919840'])assert.ok(prefixes.includes(term));assert.equal(new Set(prefixes).size,prefixes.length);
 const query=customerFilterQuery({...blankCustomerFilters(),period:'custom',start:'2026-10-24',end:'2026-10-24',orders:'with',missingMobile:true});assert.equal(query.from,Date.parse('2026-10-23T18:30:00Z'));assert.equal(query.to,Date.parse('2026-10-24T18:29:59.999Z'));
 assert.throws(()=>customerFilterQuery({...blankCustomerFilters(),period:'custom',start:'2026-02-30',end:'2026-03-01'}));
 for(const uid of ['real-uid','a@example.test','same name'])assert.equal(safeAdminDestination(customerPath(uid)),customerPath(uid));assert.equal(restoreCustomers({customersContext:{uid:'owner',state:{filters:blankCustomerFilters(),cursors:[null],scroll:100}}},'owner').scroll,100);assert.equal(restoreCustomers({customersContext:{uid:'other',state:{}}},'owner').scroll,0);assert.throws(()=>customerUid('a/b'));assert.equal(safeAdminDestination('/admin/customers/a%2Fb'),'/admin/dashboard');assert.equal(joinedDate(null),'Not recorded');
});
test('customer CSV protects formulas and preserves Unicode, quotes, multiline text, phone values and chosen fields',()=>{
 const csv=customerCsv(['name','mobile','email'],[['=CMD()','+919840123456','రాణి, "సిల్క్స్"\nsecond line']]);assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('"\'=CMD()"'));assert.ok(csv.includes('"\'+919840123456"'));assert.ok(csv.includes('రాణి, ""సిల్క్స్""\nsecond line'));assert.ok(!csv.includes('Passwords'));
});
test('six private directory indexes cover search/no-search and each sort, retaining implicit document-ID ordering',()=>{
 const rows=JSON.parse(readFileSync('firestore.indexes.json','utf8')).indexes.filter((row:any)=>row.collectionGroup==='customerDirectory');assert.equal(rows.length,6);
 for(const search of [false,true])for(const sort of ['newest','oldest','name']){const fields=[...(search?[{fieldPath:'searchPrefixes',arrayConfig:'CONTAINS'}]:[]),...['hasOrders','missingEmail','missingMobile','schemaVersion'].map(fieldPath=>({fieldPath,order:'ASCENDING'})),...(sort==='name'?[{fieldPath:'sortName',order:'ASCENDING'}]:[]),{fieldPath:'joinedAt',order:sort==='newest'?'DESCENDING':'ASCENDING'}];assert.ok(rows.some((row:any)=>row.queryScope==='COLLECTION'&&JSON.stringify(row.fields)===JSON.stringify(fields)));}
});

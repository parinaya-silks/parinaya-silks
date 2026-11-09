import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {boundedRead} from './request.ts';
import {Loading,SkeletonLayout,PageLoader,ButtonLoader,ImageUploadLoader,PaymentVerificationLoader,TableSkeleton,type SkeletonKind} from './Loading.tsx';
test('a hanging read has a real deadline even with an external signal',async()=>{
 const external=new AbortController();let actual:AbortSignal|undefined;
 await assert.rejects(boundedRead(s=>{actual=s;return new Promise(()=>{});},external.signal,15),{name:'TimeoutError'});
 assert.equal(actual?.aborted,true);assert.equal(external.signal.aborted,false);
});
test('navigation cancellation settles a read and late completion cannot become its result',async()=>{
 const external=new AbortController();let finish!:(n:number)=>void;
 const result=boundedRead(()=>new Promise<number>(resolve=>{finish=resolve;}),external.signal,1000);
 external.abort();finish(42);await assert.rejects(result,{name:'AbortError'});
});
test('successful reads retain values and backend failures are never made empty successes',async()=>{
 assert.equal(await boundedRead(async()=>27,undefined,1000),27);
 const failure=Object.assign(new Error('Server unavailable'),{code:'index-required'});
 await assert.rejects(boundedRead(async()=>{throw failure;}),e=>e===failure);
});
test('layout skeletons are decorative, inert and contain no invented products or business facts',()=>{
 for(const kind of ['products','collections','banner','campaigns','product','bag','checkout','profile','orders','order','text','auth','table','form','dashboard','chart','addresses'] as SkeletonKind[]){
  const html=renderToStaticMarkup(<SkeletonLayout kind={kind}/>);assert.match(html,/aria-hidden="true"/);assert.ok(!/<button|<input|<a |₹|\bstock\b|\bpts\b|Saree [0-9]/i.test(html),kind);
 }
 const html=renderToStaticMarkup(<Loading kind="products" label="Loading sarees"/>);assert.match(html,/aria-busy="true"/);assert.match(html,/role="status"[^>]*>Loading sarees/);
});

test('loaders name the actual operation without asserting payment success or exposing interactive skeletons',()=>{
 const page=renderToStaticMarkup(<PageLoader label="Restoring session"/>);
 assert.match(page,/role="status"/);assert.match(page,/Restoring session/);assert.match(page,/aria-hidden="true"/);
 const button=renderToStaticMarkup(<button disabled><ButtonLoader label="Saving image…"/></button>);
 assert.match(button,/aria-busy="true"/);assert.match(button,/Saving image/);assert.doesNotMatch(button,/role="status"/);
 const payment=renderToStaticMarkup(<PaymentVerificationLoader/>);
 assert.match(payment,/Checking payment/);assert.doesNotMatch(payment,/confirmed|captured|successful|paid|progressbar/i);
 const table=renderToStaticMarkup(<TableSkeleton rows={3}/>);
 assert.equal((table.match(/class="loading-table-row"/g)||[]).length,3);
 assert.doesNotMatch(table,/<button|<input|<a /);
});

test('upload indicator preserves real progress and never fabricates progress for unknown totals',()=>{
 for(const [value,expected] of [[42,'42'],[250,'100'],[-1,'0']] as const){
  const html=renderToStaticMarkup(<ImageUploadLoader value={value} label="Uploading photo"/>);
  assert.match(html,new RegExp('value="'+expected+'"'));assert.match(html,/aria-label="Uploading photo"/);
 }
 for(const value of [undefined,NaN,Infinity])assert.doesNotMatch(renderToStaticMarkup(<ImageUploadLoader value={value}/>),/value="/);
});

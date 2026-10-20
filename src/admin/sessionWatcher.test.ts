import test from 'node:test';
import assert from 'node:assert/strict';
import {adminSessionWatcher,type AdminSession} from './sessionWatcher.ts';

const user={uid:'synthetic-admin',email:'admin@example.test'};
const token=()=>({claims:{admin:true},expirationTime:new Date(Date.now()+60000).toISOString()});
const deferred=<T>()=>{let resolve!:(value:T)=>void,reject!:(error:unknown)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
test('background checks preserve the verified session, deduplicate observers and keep one live access listener',async()=>{
  const states:AdminSession[]=[];let next!:(enabled:boolean,cache:boolean)=>void,subscriptions=0,calls=0;
  let wait:ReturnType<typeof deferred<ReturnType<typeof token>>>|undefined;
  const watcher=adminSessionWatcher({publish:state=>states.push(state),token:async()=>{calls++;return wait?wait.promise:token();},record:(_user,callback)=>{subscriptions++;next=callback;return()=>{};}});
  try {
    watcher.session(user);next(true,false);await watcher.refresh();assert.equal(states.at(-1)?.status,'authorized');
    wait=deferred();const before=calls,mark=states.length;
    const check=watcher.refresh();watcher.session(user);void watcher.routine();void watcher.routine();
    await Promise.resolve();assert.equal(calls,before+1);assert.equal(subscriptions,1);
    assert.ok(states.slice(mark).every(state=>state.status==='authorized'));
    wait.resolve(token());await check;
    assert.equal((states.at(-1) as {verification:string}).verification,'ready');
    next(false,false);assert.equal(states.at(-1)?.status,'restricted');
  }finally{watcher.unsubscribe();}
});
test('transient verification failures keep work but pause actions until a fresh successful check',async()=>{
  const states:AdminSession[]=[];let next!:(enabled:boolean,cache:boolean)=>void;
  let wait:ReturnType<typeof deferred<ReturnType<typeof token>>>|undefined;
  const watcher=adminSessionWatcher({publish:state=>states.push(state),token:async()=>wait?wait.promise:token(),record:(_user,callback)=>{next=callback;return()=>{};}});
  try {
    watcher.session(user);next(true,false);await watcher.refresh();
    wait=deferred();let check=watcher.refresh();wait.reject({code:'auth/network-request-failed'});await check;
    assert.equal(states.at(-1)?.status,'authorized');assert.equal((states.at(-1) as {verification:string}).verification,'blocked');
    wait=deferred();check=watcher.refresh();assert.equal((states.at(-1) as {verification:string}).verification,'blocked');
    wait.resolve(token());await check;assert.equal((states.at(-1) as {verification:string}).verification,'ready');
    wait=deferred();check=watcher.refresh();wait.reject({code:'auth/network-request-failed'});await check;
    wait=deferred();check=watcher.refresh();wait.resolve({...token(),claims:{admin:false}});await check;assert.equal(states.at(-1)?.status,'restricted');
    wait=undefined;await watcher.refresh();
    wait=deferred();check=watcher.refresh();next(false,false);assert.equal(states.at(-1)?.status,'restricted');wait.resolve(token());await check;assert.equal(states.at(-1)?.status,'restricted');
  }finally{watcher.unsubscribe();}
});
test('sign-out and changed accounts ignore stale token and access-record results',async()=>{
  const states:AdminSession[]=[];const wait=deferred<ReturnType<typeof token>>();const records:((enabled:boolean,cache:boolean)=>void)[]=[];
  const watcher=adminSessionWatcher({publish:state=>states.push(state),token:()=>wait.promise,record:(_user,callback)=>{records.push(callback);return()=>{};}});
  try {
    watcher.session(null);assert.equal(states.at(-1)?.status,'signed-out');
    watcher.session(user);const check=watcher.refresh();watcher.session(null);records[0](true,false);wait.resolve(token());await check;
    assert.equal(states.at(-1)?.status,'signed-out');
    watcher.session({...user,uid:'another-account'});records[0](true,false);await watcher.refresh();assert.equal(states.at(-1)?.status,'checking');
    records[1](false,false);assert.equal(states.at(-1)?.status,'restricted');
  }finally{watcher.unsubscribe();}
});
test('cached permission snapshots cannot grant access or sustain verified actions indefinitely',async()=>{
  const states:AdminSession[]=[];let next!:(enabled:boolean,cache:boolean)=>void;
  const watcher=adminSessionWatcher({publish:state=>states.push(state),timeoutMs:5,token:async()=>token(),record:(_user,callback)=>{next=callback;return()=>{};}});
  try {
    watcher.session(user);next(true,true);await watcher.refresh();assert.equal(states.at(-1)?.status,'checking');
    next(true,false);assert.equal(states.at(-1)?.status,'authorized');
    next(true,true);await new Promise(resolve=>setTimeout(resolve,15));
    assert.equal((states.at(-1) as {verification:string}).verification,'blocked');
  }finally{watcher.unsubscribe();}
});

test('a timed-out token check can be retried and its late result cannot replace fresh permission',async()=>{
  const states:AdminSession[]=[];let next!:(enabled:boolean,cache:boolean)=>void,wait:ReturnType<typeof deferred<ReturnType<typeof token>>>|undefined;
  const watcher=adminSessionWatcher({publish:state=>states.push(state),timeoutMs:5,token:()=>wait?wait.promise:Promise.resolve(token()),record:(_user,callback)=>{next=callback;return()=>{};}});
  try {
    watcher.session(user);next(true,false);await watcher.refresh();
    wait=deferred();const stale=wait;const first=watcher.refresh();await new Promise(resolve=>setTimeout(resolve,15));
    assert.equal((states.at(-1) as {verification:string}).verification,'blocked');
    wait=undefined;await watcher.refresh();assert.equal((states.at(-1) as {verification:string}).verification,'ready');
    stale.resolve({...token(),claims:{admin:false}});await first;assert.equal((states.at(-1) as {verification:string}).verification,'ready');
  }finally{watcher.unsubscribe();}
});

test('coalesced focus events perform a trailing check that detects a newly removed claim',async context=>{
  context.mock.timers.enable({apis:['setTimeout','Date'],now:Date.now()});
  const states:AdminSession[]=[];let next!:(enabled:boolean,cache:boolean)=>void,admin=true,calls=0;
  const watcher=adminSessionWatcher({publish:state=>states.push(state),token:async()=>{calls++;return {...token(),claims:{admin}};},record:(_user,callback)=>{next=callback;return()=>{};}});
  try {
    watcher.session(user);next(true,false);await watcher.refresh();
    await watcher.routine();assert.equal(calls,2);
    admin=false;void watcher.routine();void watcher.routine();
    context.mock.timers.tick(4999);assert.equal(calls,2);
    context.mock.timers.tick(1);await watcher.refresh();
    assert.equal(calls,3);assert.equal(states.at(-1)?.status,'restricted');
  }finally{watcher.unsubscribe();}
});

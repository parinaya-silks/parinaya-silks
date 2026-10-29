import test from 'node:test';import assert from 'node:assert/strict';
import {successDeadline,shoppingFeedback} from './feedback.ts';
test('shopping feedback has at most one relevant destination and action-specific removal text',()=>{
 assert.deepEqual(shoppingFeedback('wishlist:set',true,'saved'),{message:'Saved to Wishlist',destination:'/wishlist'});
 assert.deepEqual(shoppingFeedback('wishlist:set',false,'removed'),{message:'Removed from Wishlist.'});
 assert.deepEqual(shoppingFeedback('bag:add',null,'saved'),{message:'Added to Bag',destination:'/bag'});
 assert.deepEqual(shoppingFeedback('bag:remove',null,'removed'),{message:'Removed from Bag.'});
});
test('success deadline composes hover/focus pauses, expires once, and disposed old timers cannot dismiss replacements',()=>{
 let now=0,id=0,done=0;const tasks=new Map<number,{at:number;fn:()=>void}>();
 const schedule=(fn:()=>void,delay:number)=>{const key=++id;tasks.set(key,{at:now+delay,fn});return key as unknown as ReturnType<typeof setTimeout>;};
 const cancel=(key:ReturnType<typeof setTimeout>)=>tasks.delete(key as unknown as number);
 const advance=(ms:number)=>{now+=ms;for(const [key,task]of tasks)if(task.at<=now){tasks.delete(key);task.fn();}};
 const value=successDeadline(()=>done++,4000,()=>now,schedule,cancel);advance(1500);value.pause('hover');value.pause('focus');advance(8000);assert.equal(done,0);value.resume('hover');advance(5000);assert.equal(done,0);value.resume('focus');advance(2499);assert.equal(done,0);advance(1);assert.equal(done,1);advance(9000);assert.equal(done,1);
 const old=successDeadline(()=>done++,4000,()=>now,schedule,cancel),oldCallback=[...tasks.values()][0].fn;old.dispose();const replacement=successDeadline(()=>done+=10,4000,()=>now,schedule,cancel);oldCallback();assert.equal(done,1);advance(4000);assert.equal(done,11);replacement.dispose();
});

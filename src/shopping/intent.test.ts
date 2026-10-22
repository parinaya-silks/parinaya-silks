import test from 'node:test';
import assert from 'node:assert/strict';
import {readIntent,saveIntent,clearIntent,shoppingReturn,type ShoppingIntent} from './intent.ts';
test('pending shopping actions expire, reject malformed references and retain only an internal return',()=>{
  const values=new Map<string,string>();
  const original=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
  try{
    const intent:ShoppingIntent={kind:'bag',productId:'a'.repeat(20),slug:'silk-saree',variantId:null,quantity:1,createdAt:Date.now(),operationId:'b'.repeat(32)};
    saveIntent(intent);assert.deepEqual(readIntent(),intent);clearIntent();assert.equal(readIntent(),null);
    for(const changes of [{createdAt:Date.now()-16*60000},{productId:'../other'},{variantId:'../other'},{quantity:0},{slug:'../admin'},{operationId:'unsafe'}]){saveIntent({...intent,...changes});assert.equal(readIntent(),null);assert.equal(values.size,0);}
    assert.equal(shoppingReturn('/product/silk-saree?select=colour'),'/product/silk-saree?select=colour');assert.equal(shoppingReturn('https://evil.example'),'/account');
  }finally{if(original)Object.defineProperty(globalThis,'sessionStorage',original);else Reflect.deleteProperty(globalThis,'sessionStorage');}
});

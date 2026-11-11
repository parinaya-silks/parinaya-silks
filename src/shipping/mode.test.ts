import test from 'node:test';
import assert from 'node:assert/strict';
import {DISTANCE_DELIVERY_ENABLED,distanceDeliveryEnabled} from '../../server/deliveryMode.ts';
import {drivingRoute} from '../../server/routes.ts';
import {blankAddress} from '../delivery/model.ts';
import {initialShipping,savedShipping,quoteShipping} from './model.ts';

test('distance flag defaults false and only exact server opt-in enables it',()=>{
 assert.equal(DISTANCE_DELIVERY_ENABLED,false);
 for(const value of [undefined,'false','FALSE','true ','1',''])assert.equal(distanceDeliveryEnabled(value===undefined?{}:{DISTANCE_DELIVERY_ENABLED:value}),false);
 assert.equal(distanceDeliveryEnabled({DISTANCE_DELIVERY_ENABLED:'true'}),true);
});
test('disabled route adapter never issues an HTTP request even with a configured Google key',async()=>{
 let calls=0;
 const origin={name:'Fixture',fullAddress:'Synthetic',latitude:17.4,longitude:78.4,mapsUrl:'',active:true};
 for(const flag of [undefined,'false'])await assert.rejects(drivingRoute(origin,blankAddress(),{GOOGLE_MAPS_API_KEY:'synthetic-key',...(flag?{DISTANCE_DELIVERY_ENABLED:flag}:{})},async()=>{calls++;throw Error('Must never request routes');}),{code:'configuration'});
 assert.equal(calls,0);
});
test('restored historical flat policy: INR 99, strict pre-discount threshold, saved fee authority',()=>{
 const settings=savedShipping({...initialShipping(),schemaVersion:1,revision:1});
 for(const [subtotal,fee]of [[999999n,'9900'],[1000000n,'9900'],[1000001n,'0']] as const)assert.equal(quoteShipping(settings,subtotal,true).shippingPaise,fee);
 assert.equal(quoteShipping(savedShipping({...initialShipping(),flatFeePaise:1234,schemaVersion:1,revision:2}),100n,true).shippingPaise,'1234');
 assert.equal(quoteShipping(savedShipping(undefined),100n,true).shippingPaise,null,'Never invent missing approved settings');
});

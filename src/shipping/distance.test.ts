import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinates,validateDispatch,validateSlabs,defaultSlabs,distanceFee,codAvailable} from './distance.ts';
import {initialDistanceShipping,savedShipping,validateShipping,quoteShipping} from './model.ts';
import {blankAddress,validateAddress} from '../delivery/model.ts';
import {drivingRoute} from '../../server/routes.ts';

const origin={name:'Local fixture',fullAddress:'Synthetic address',latitude:17.4,longitude:78.4,mapsUrl:'',active:true};
const address={...blankAddress(),recipientName:'Fixture',mobileNumber:'9876543210',pinCode:'500072',line1:'Flat 1',locality:'KPHB',city:'Hyderabad',state:'Telangana'};
test('distance slabs: precise boundaries, disabled coverage and inclusive post-coupon threshold',()=>{
 const slabs=defaultSlabs();
 for(const [distance,fee]of [[0,4000],[5000,4000],[5001,6000],[10000,6000],[10001,9000],[20000,9000],[20001,12000],[30000,12000]] as const)assert.equal(distanceFee(slabs,distance,999999n,true,1000000)?.feePaise,fee);
 assert.equal(distanceFee(slabs,5000,999999n,true,1000000)?.remainingPaise,'1');
 for(const subtotal of [1000000n,1000001n])assert.equal(distanceFee(slabs,5000,subtotal,true,1000000)?.feePaise,0);
 assert.equal(distanceFee(slabs,5000,1000000n,false,1000000)?.feePaise,4000);
 assert.equal(distanceFee(slabs,30001,100000000n,true,1000000),null);
 assert.equal(distanceFee(slabs.map((s,i)=>({...s,enabled:i!==1})),5001,100000000n,true,0),null);
 for(const distance of [-1,1.5,NaN,Infinity])assert.throws(()=>distanceFee(slabs,distance,1n,false,0));
 for(const invalid of [[],[slabs[1],slabs[0]],[slabs[0],slabs[0]],[{...slabs[0],feePaise:1.5}],[{...slabs[0],enabled:'true'}]])assert.throws(()=>validateSlabs(invalid));
 const config=initialDistanceShipping();assert.equal(savedShipping({...config,schemaVersion:2,revision:1}).state,'ready');assert.equal(quoteShipping(savedShipping({...config,schemaVersion:2,revision:1}),999999999n,true).shippingPaise,null,'distance settings never calculate guessed/flat fees');assert.throws(()=>validateShipping({...config,slabs:[]}));
});
test('dispatch and manual/map address validation preserve legacy addresses',()=>{
 assert.deepEqual(validateDispatch(origin),origin);assert.throws(()=>validateDispatch({...origin,latitude:91}));assert.throws(()=>validateDispatch({...origin,longitude:Infinity}));assert.throws(()=>validateDispatch({...origin,mapsUrl:'https://evil.test'}));
 assert.deepEqual(coordinates({latitude:0,longitude:0}),{latitude:0,longitude:0});
 assert.equal(validateAddress(address).coordinates,undefined);
 assert.deepEqual(validateAddress({...address,coordinates:{latitude:17.4,longitude:78.4}}).coordinates,{latitude:17.4,longitude:78.4});
 assert.throws(()=>validateAddress({...address,coordinates:{latitude:'17',longitude:78}}));
 assert.equal(codAvailable(undefined),true);assert.equal(codAvailable({schemaVersion:1,revision:1,enabled:false}),false);assert.equal(codAvailable({schemaVersion:1,revision:1,enabled:true}),true);assert.equal(codAvailable({enabled:true}),false);
});
test('Google adapter is backend-only DRIVE routing, supports manual addresses, and fails closed',async()=>{
 let calls=0;
 const request:typeof fetch=async(url,options)=>{calls++;assert.equal(url,'https://routes.googleapis.com/directions/v2:computeRoutes');const body=JSON.parse(String(options!.body));assert.equal(body.travelMode,'DRIVE');assert.deepEqual(body.origin.location.latLng,{latitude:17.4,longitude:78.4});if(calls===1)assert.match(body.destination.address,/500072/);else assert.deepEqual(body.destination.location.latLng,{latitude:17.5,longitude:78.5});return new Response(JSON.stringify({routes:[{distanceMeters:5001,legs:[{endLocation:{latLng:{latitude:17.5,longitude:78.5}}}]}]}));};
 await assert.rejects(drivingRoute(origin,address,{},request),{code:'configuration'});assert.equal(calls,0);
 assert.equal((await drivingRoute(origin,address,{DISTANCE_DELIVERY_ENABLED:'true',GOOGLE_MAPS_API_KEY:'synthetic-key'},request)).distanceMeters,5001);
 await drivingRoute(origin,{...address,coordinates:{latitude:17.5,longitude:78.5}},{DISTANCE_DELIVERY_ENABLED:'true',GOOGLE_MAPS_API_KEY:'synthetic-key'},request);
 for(const response of [{routes:[]},{routes:[{distanceMeters:-1}]},{routes:[{distanceMeters:5000}],geocodingResults:{destination:{partialMatch:true}}}])await assert.rejects(drivingRoute(origin,address,{DISTANCE_DELIVERY_ENABLED:'true',GOOGLE_MAPS_API_KEY:'synthetic-key'},async()=>new Response(JSON.stringify(response))),{code:'configuration'});
 await assert.rejects(drivingRoute(origin,address,{DISTANCE_DELIVERY_ENABLED:'true',GOOGLE_MAPS_API_KEY:'synthetic-key'},async()=>{throw new Error('synthetic secret and private address must not escape');}),error=>{assert.equal((error as Error).message.includes('synthetic'),false);return true;});
 await assert.rejects(drivingRoute(origin,address,{DISTANCE_DELIVERY_ENABLED:'true',GOOGLE_MAPS_API_KEY:'synthetic-key'},async()=>new Response('{}',{status:403})),{code:'configuration'});
});

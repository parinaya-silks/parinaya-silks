import {ProductError} from '../src/products/model.ts';
import {distanceDeliveryEnabled} from './deliveryMode.ts';
import {coordinates,type Coordinates,type DispatchInput} from '../src/shipping/distance.ts';
import type {AddressInput} from '../src/delivery/model.ts';

export interface RoadRoute {distanceMeters:number;destination:Coordinates}
export type RouteCalculator=(origin:DispatchInput,address:AddressInput)=>Promise<RoadRoute>;
// No mock environment switch. Test doubles are supplied only by local test code.
export async function drivingRoute(origin:DispatchInput,address:AddressInput,env:NodeJS.ProcessEnv=process.env,request:typeof fetch=fetch):Promise<RoadRoute>{
 if(!distanceDeliveryEnabled(env))throw new ProductError('configuration','Distance delivery is disabled.');
 const key=env.GOOGLE_MAPS_API_KEY;
 const unavailable=()=>new ProductError('configuration','Delivery calculation is unavailable. Please try again later or contact the store.');
 if(!key||key.trim()!==key||/[\s"']/.test(key))throw unavailable();
 const destination=address.coordinates?{location:{latLng:coordinates(address.coordinates)}}:{address:[address.line1,address.locality,address.city,address.state,address.pinCode,'India'].join(', ')};
 try{
  const response=await request('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.distanceMeters,routes.legs.endLocation,geocodingResults.destination'},body:JSON.stringify({origin:{location:{latLng:coordinates(origin)}},destination,travelMode:'DRIVE',computeAlternativeRoutes:false,languageCode:'en-IN'}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw unavailable();
  const data=await response.json(),route=data.routes?.[0];
  if(!route||!Number.isSafeInteger(route.distanceMeters)||route.distanceMeters<0||data.geocodingResults?.destination?.geocoderStatus?.code||data.geocodingResults?.destination?.partialMatch===true)throw unavailable();
  const resolved=address.coordinates?coordinates(address.coordinates):coordinates(route.legs?.at(-1)?.endLocation?.latLng);
  return {distanceMeters:route.distanceMeters,destination:resolved};
 }catch{throw unavailable();} // Provider errors must never leak keys or customer addresses.
}

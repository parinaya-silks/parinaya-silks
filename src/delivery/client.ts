import {getAuthClients} from '../services/firebase/auth.ts';
import {catalogResponse} from '../products/response.ts';
import {ProductError} from '../products/model.ts';
export const deliveryOperation=()=>crypto.randomUUID().replaceAll('-','');
export async function deliveryAction<T>(uid:string,body:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
  const {auth}=getAuthClients(),user=auth.currentUser;
  if(user?.uid!==uid)throw new ProductError('unauthorized','Sign in again to continue.');
  const token=await user.getIdToken();
  if(auth.currentUser?.uid!==uid)throw new ProductError('unauthorized','Your account changed.');
  try{return await catalogResponse(await fetch('/api/catalog',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body),signal:signal||AbortSignal.timeout(20000)}));}
  catch(error){if(error instanceof ProductError){if(['unavailable','internal','configuration','schema','index-required'].includes(error.code))throw new ProductError(error.code,body.action==='checkout:review'?'Unable to load checkout review. Please try again.':'Unable to load or save your addresses. Please try again.');throw error;}throw new ProductError('unavailable','Unable to confirm this request. Please try again.');}
}

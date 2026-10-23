import {getAuthClients} from '../services/firebase/auth.ts';
import {catalogResponse} from '../products/response.ts';
import {ProductError} from '../products/model.ts';
import {customerFailureMessage} from './errorMessage.ts';
export async function customerAction<T>(uid:string,body:Record<string,unknown>,signal?:AbortSignal):Promise<T>{
 const {auth}=getAuthClients(),user=auth.currentUser;if(!user||user.uid!==uid)throw new ProductError('unauthorized','Sign in again to continue.');const token=await user.getIdToken();if(auth.currentUser?.uid!==uid)throw new ProductError('unauthorized','Your account changed.');
 try{const result=await catalogResponse(await fetch('/api/catalog',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:signal||AbortSignal.timeout(30000)}));if(auth.currentUser?.uid!==uid)throw new ProductError('unauthorized','Your account changed.');return result as T;}catch(error){if(error instanceof ProductError){if(['internal','configuration','unavailable','index-required','schema'].includes(error.code))throw new ProductError(error.code,customerFailureMessage(body.action));throw error;}throw new ProductError('unavailable',customerFailureMessage(body.action));}
}

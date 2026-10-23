import { getAdminClients } from '../services/firebase/adminAuth.ts';
import { ProductError, type ProductInput, type ProductRecord, type ProductImage, type PublicProductRecord } from './model.ts';
import { catalogResponse, productLoadFailure } from './response.ts';

const response=(result:Response)=>catalogResponse(result,import.meta.env.DEV);
export async function catalogAction<T>(body:Record<string,unknown>):Promise<T> {
  const user=getAdminClients().auth.currentUser;
  if(!user)throw new ProductError('unauthorized','Sign in again to continue.');
  try {return await response(await fetch('/api/catalog',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await user.getIdToken()}`},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)}));}
  catch(error){if(error instanceof ProductError)throw error;throw new ProductError('unavailable',body.action==='list'?productLoadFailure:'The server could not confirm this operation. Your changes are kept; retry or check your connection.');}
}
export interface CatalogPage<T=ProductRecord> {items:T[];nextCursor:string|null}
const catalogFlights=new Map<string,Promise<CatalogPage<PublicProductRecord>>>();
export function publicCatalog(cursor?:string,options:Record<string,string>={}):Promise<CatalogPage<PublicProductRecord>> {
  const parameters=new URLSearchParams({...options,...(cursor?{cursor}:{})});parameters.sort();const key=parameters.toString();
  const existing=catalogFlights.get(key);if(existing)return existing;
  const flight=fetch('/api/catalog?'+key,{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(response).finally(()=>{if(catalogFlights.get(key)===flight)catalogFlights.delete(key);});
  catalogFlights.set(key,flight);return flight;
}
export async function publicProduct(slug:string):Promise<PublicProductRecord> {return response(await fetch(`/api/catalog?slug=${encodeURIComponent(slug)}`,{cache:'no-store',signal:AbortSignal.timeout(15000)}));}
export const newOperation=()=>crypto.randomUUID().replaceAll('-','');
export const saveProduct=(id:string,expectedRevision:number,operationId:string,product:ProductInput)=>catalogAction<ProductRecord>({action:'save',id,expectedRevision,operationId,product});
export async function uploadImage(file:File,productId:string,mediaId:string,onProgress:(progress:number)=>void) {
  const params=await catalogAction<Record<string,string>>({action:'sign',productId,mediaId,type:file.type,size:file.size});
  await uploadSignedImage(file,params,onProgress);
  return catalogAction<ProductImage>({action:'verify',productId,mediaId});
}

export async function uploadSignedImage(file:File,params:Record<string,string>,onProgress:(progress:number)=>void){
  const form=new FormData();
  for(const [key,value]of Object.entries(params))if(!['uploadUrl','mediaId'].includes(key))form.append(key,String(value));
  form.append('file',file);
  await new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST',params.uploadUrl);xhr.timeout=120000;
    xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded*100/event.total));};
    xhr.onerror=xhr.ontimeout=()=>reject(new ProductError('upload','Image upload was not confirmed. Retry to verify or upload again.'));
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new ProductError('upload','Image upload failed. Check the file or retry.'));
    xhr.send(form);
  });
}

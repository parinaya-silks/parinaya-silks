import { ProductError } from './model.ts';

export const productLoadFailure='Unable to load products. Please try again.';

export async function catalogResponse(result:Response,development=false) {
  let data;
  try {data=await result.json();} catch {
    throw new ProductError('unavailable',development?'Catalog API is unavailable. Start the local API server or contact the store owner.':productLoadFailure);
  }
  if(!data || typeof data!=='object' || Array.isArray(data))throw new ProductError('unavailable',productLoadFailure);
  if(!result.ok) {
    const message=!development && result.status>=500?productLoadFailure:typeof data.message==='string'?data.message:'Catalog request failed.';
    throw new ProductError(typeof data.code==='string'?data.code:'unavailable',message,data.fields && typeof data.fields==='object'?data.fields:{});
  }
  return data;
}

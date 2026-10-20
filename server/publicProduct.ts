import type {ProductRecord,PublicProductRecord} from '../src/products/model.ts';

// Explicit public projection. Never expose operation/revision metadata, trusted
// Cloudinary registry identifiers or individual colour codes used by staff.
export function publicProduct(record:ProductRecord):PublicProductRecord {
  const {id,name,slug,sku,description,categoryId,categoryName,pricePaise,originalPricePaise,coverMediaId,lowStockThreshold,fabric,weaveType,zariType,colorName,colorHex,sareeLength,blouseIncluded,blouseDetails,careInstructions,weightGrams,featured,newArrival,status,createdAt}=record;
  return {id,name,slug,sku,description,categoryId,categoryName,pricePaise,originalPricePaise,coverMediaId,lowStockThreshold,fabric,weaveType,zariType,colorName,colorHex,sareeLength,blouseIncluded,blouseDetails,careInstructions,weightGrams,featured,newArrival,status,createdAt,
    images:record.images.map(({mediaId,alt,url,width,height})=>({mediaId,alt,url,width,height})),
    inventory:record.inventory.mode==='simple'?{mode:'simple',quantity:record.inventory.quantity||0}:{mode:'variants',variants:(record.inventory.variants||[]).map(({id,name,hex,quantity})=>({id,name,hex,quantity}))},
  };
}

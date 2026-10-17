export type ProductStatus = 'Draft' | 'Published' | 'Archived';
export interface Variant { id: string; sku: string; name: string; hex: string; quantity: number }
export interface ImageInput { mediaId: string; alt: string }
export interface ProductImage extends ImageInput { assetId: string; publicId: string; url: string; width: number; height: number; bytes: number; format: string; version: number }
export interface ProductInput {
  name: string; slug: string; sku: string; description: string; categoryId: string;
  pricePaise: number; originalPricePaise: number | null;
  images: ImageInput[]; coverMediaId: string;
  inventory: { mode: 'simple' | 'variants'; quantity: number; variants: Variant[] };
  lowStockThreshold: number; fabric: string; weaveType: string; zariType: string;
  colorName: string; colorHex: string; sareeLength: string; blouseIncluded: boolean;
  blouseDetails: string; careInstructions: string; weightGrams: number | null;
  featured: boolean; newArrival: boolean; status: ProductStatus;
}
export interface ProductRecord extends Omit<ProductInput, 'images'> {
  id: string; images: ProductImage[]; revision: number; createdAt: number; updatedAt: number; categoryName: string;
}
export class ProductError extends Error {
  constructor(public code: string, message: string, public fields: Record<string,string> = {}) { super(message); }
}
export const MAX_IMAGES = 8;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const productFields = ['name','slug','sku','description','categoryId','pricePaise','originalPricePaise','images','coverMediaId','inventory','lowStockThreshold','fabric','weaveType','zariType','colorName','colorHex','sareeLength','blouseIncluded','blouseDetails','careInstructions','weightGrams','featured','newArrival','status'] as const;
export function emptyProduct(): ProductInput { return { name:'',slug:'',sku:'',description:'',categoryId:'',pricePaise:0,originalPricePaise:null,images:[],coverMediaId:'',inventory:{mode:'simple',quantity:0,variants:[]},lowStockThreshold:2,fabric:'',weaveType:'',zariType:'',colorName:'',colorHex:'#780D24',sareeLength:'',blouseIncluded:false,blouseDetails:'',careInstructions:'',weightGrams:null,featured:false,newArrival:false,status:'Draft' }; }
export function productInput(record: ProductRecord): ProductInput { const input = Object.fromEntries(productFields.map(key=>[key,record[key]])) as unknown as ProductInput; return {...input,images:record.images.map(({mediaId,alt})=>({mediaId,alt}))}; }
export function quantity(product: Pick<ProductInput,'inventory'>): number { return product.inventory.mode === 'simple' ? product.inventory.quantity : product.inventory.variants.reduce((total,variant)=>total+variant.quantity,0); }
export function discount(product: Pick<ProductInput,'pricePaise'|'originalPricePaise'>) { return product.originalPricePaise && product.originalPricePaise > product.pricePaise ? Math.floor((product.originalPricePaise-product.pricePaise)*100/product.originalPricePaise) : 0; }
export function rupeesToPaise(value: string) { if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return NaN; const [whole,fraction=''] = value.split('.'); return Number(whole)*100 + Number(fraction.padEnd(2,'0')); }
function object(value: unknown): value is Record<string,unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function validateProduct(value: unknown): ProductInput {
  if (!object(value) || Object.keys(value).some(key=>!productFields.includes(key as typeof productFields[number]))) throw new ProductError('invalid','Unknown or malformed product fields.');
  const errors: Record<string,string> = {};
  const text = (key: string,max: number) => { const raw = value[key]; if(typeof raw !== 'string' || raw.length>max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(raw)) {errors[key]=`Use text of at most ${max} characters.`; return '';} return raw.trim(); };
  const integer = (key:string,max:number) => { const n=value[key]; if(!Number.isSafeInteger(n) || (n as number)<0 || (n as number)>max) { errors[key]='Use a nonnegative whole number within the allowed range.';return 0; } return n as number; };
  const result = emptyProduct();
  for(const key of ['name','slug','sku','description','categoryId','fabric','weaveType','zariType','colorName','colorHex','sareeLength','blouseDetails','careInstructions','coverMediaId'] as const) result[key]=text(key,key==='description'?6000:key==='careInstructions'?1500:key==='blouseDetails'?500:key==='name'?160:key==='slug'?100:120);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug)) errors.slug='Choose a permanent lowercase URL slug.';
  if(result.categoryId && !/^[A-Za-z0-9]{20}$/.test(result.categoryId)) errors.categoryId='Select an existing category.';
  if(result.sku && !/^[A-Za-z0-9._-]{1,64}$/.test(result.sku)) errors.sku='Use up to 64 letters, numbers, dots, hyphens or underscores.';
  if(!/^#[0-9a-fA-F]{6}$/.test(result.colorHex)) errors.colorHex='Choose a valid colour.';
  result.pricePaise=integer('pricePaise',100000000);
  result.originalPricePaise=value.originalPricePaise===null?null:integer('originalPricePaise',100000000);
  if(result.originalPricePaise!==null && result.originalPricePaise<=result.pricePaise) errors.originalPricePaise='Original price must exceed the selling price; otherwise leave it empty.';
  result.lowStockThreshold=integer('lowStockThreshold',1000000);
  result.weightGrams=value.weightGrams===null?null:integer('weightGrams',100000);
  for(const key of ['blouseIncluded','featured','newArrival'] as const) { if(typeof value[key]!=='boolean') errors[key]='Choose Yes or No.'; else result[key]=value[key]; }
  if(!['Draft','Published','Archived'].includes(value.status as string)) errors.status='Choose a valid publication status.'; else result.status=value.status as ProductStatus;
  if(!Array.isArray(value.images) || value.images.length>MAX_IMAGES) errors.images=`Use at most ${MAX_IMAGES} images.`;
  else { const ids=new Set<string>(); result.images=value.images.map((image: unknown)=>{if(!object(image) || Object.keys(image).some(k=>!['mediaId','alt'].includes(k)) || typeof image.mediaId!=='string' || !/^[a-f0-9]{32}$/.test(image.mediaId) || ids.has(image.mediaId) || typeof image.alt!=='string' || image.alt.length>200) {errors.images='Use distinct verified images and alt text up to 200 characters.';return {mediaId:'',alt:''};}ids.add(image.mediaId);return {mediaId:image.mediaId,alt:image.alt.trim()};}); }
  if(result.coverMediaId && !result.images.some(image=>image.mediaId===result.coverMediaId)) errors.images='Choose a cover from the saved images.';
  const inv=value.inventory;
  if(!object(inv) || Object.keys(inv).some(k=>!['mode','quantity','variants'].includes(k)) || !['simple','variants'].includes(inv.mode as string) || !Number.isInteger(inv.quantity) || (inv.quantity as number)<0 || (inv.quantity as number)>1000000 || !Array.isArray(inv.variants) || inv.variants.length>20) errors.inventory='Choose simple stock or up to 20 colour variants with whole-number quantities.';
  else { const ids=new Set<string>(),skus=new Set<string>(); const variants:Variant[]=[]; for(const variant of inv.variants) {if(!object(variant) || Object.keys(variant).some(k=>!['id','sku','name','hex','quantity'].includes(k)) || typeof variant.id!=='string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(variant.id) || ids.has(variant.id) || typeof variant.sku!=='string' || !/^[A-Za-z0-9._-]{1,64}$/.test(variant.sku) || skus.has(variant.sku.toLowerCase()) || typeof variant.name!=='string' || !variant.name.trim() || variant.name.length>80 || typeof variant.hex!=='string' || !/^#[a-fA-F0-9]{6}$/.test(variant.hex) || !Number.isInteger(variant.quantity) || (variant.quantity as number)<0 || (variant.quantity as number)>1000000) {errors.inventory='Variants need unique IDs/SKUs, colour names, valid colours and nonnegative whole stock.';break;}ids.add(variant.id);skus.add(variant.sku.toLowerCase());variants.push(variant as unknown as Variant);} result.inventory={mode:inv.mode as 'simple'|'variants',quantity:inv.quantity as number,variants}; if((inv.mode==='simple' && variants.length) || (inv.mode==='variants' && (inv.quantity!==0 || !variants.length))) errors.inventory='Use one stock source: simple quantity OR variants, never both.'; }
  if(result.status==='Published') {
    for(const key of ['name','sku','description','categoryId','fabric','weaveType','sareeLength','careInstructions'] as const) if(!result[key]) errors[key]='Required before publishing.';
    if(result.name.length<2) errors.name='Use a product name of at least two characters.';
    if(result.pricePaise<=0) errors.pricePaise='Publishing requires a positive selling price.';
    if(!result.coverMediaId || !result.images.length || result.images.some(image=>!image.alt)) errors.images='Publishing requires a verified cover image and alt text for every image.';
  }
  if(Object.keys(errors).length) throw new ProductError('invalid','Check the highlighted fields.',errors);
  return result;
}

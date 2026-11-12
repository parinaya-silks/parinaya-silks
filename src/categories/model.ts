import type {LoginImage} from '../appearance/model.ts';
export interface CategoryInput {
  homepageImage?: LoginImage|null;
  name: string;
  slug: string;
  description?: string;
  enabled: boolean;
  displayOrder: number;
}
export interface Category extends CategoryInput {
  storedDisplayOrder?:number;
  id: string;
  createdAt: number;
  updatedAt: number;
}
export function categorySlug(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/g, '');
}
export function validateCategory(input: CategoryInput): CategoryInput {
  const name = input.name.trim();
  const description = input.description?.trim() || '';
  if (name.length < 2 || name.length > 80 || /[\x00-\x1f\x7f]/.test(name)) throw new Error('Name must be 2–80 characters without control characters.');
  if (input.slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) throw new Error('Use a slug of up to 80 lowercase letters, numbers and single hyphens.');
  if (description.length > 240 || /[\x00-\x1f\x7f]/.test(description)) throw new Error('Description must be at most 240 characters on one line.');
  if (typeof input.enabled !== 'boolean' || !Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 9999) throw new Error('Display order must be a whole number from 0 to 9999.');
  const homepageImage=input.homepageImage;
  if(homepageImage!==undefined&&homepageImage!==null&&(typeof homepageImage!=='object'||!/^[a-f0-9]{32}$/.test(homepageImage.mediaId)||typeof homepageImage.alt!=='string'||homepageImage.alt.length>200||/[\x00-\x1f\x7f]/.test(homepageImage.alt)||![homepageImage.focalX,homepageImage.focalY].every(n=>Number.isInteger(n)&&n>=0&&n<=100)||!Number.isSafeInteger(homepageImage.width)||homepageImage.width<1||!Number.isSafeInteger(homepageImage.height)||homepageImage.height<1||!/^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\//.test(homepageImage.url)))throw new Error('Use a verified category image and an image description up to 200 characters.');
  return { ...(homepageImage!==undefined?{homepageImage}:{}),name, slug: input.slug, description, enabled: input.enabled, displayOrder: input.displayOrder };
}
export function orderCategories(items: Category[]) {
  const sorted=[...items].sort((a,b)=>(Number.isFinite(a.displayOrder)?a.displayOrder:0)-(Number.isFinite(b.displayOrder)?b.displayOrder:0)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
  const legacy=sorted.some(c=>!Number.isInteger(c.displayOrder)||c.displayOrder<1)||new Set(sorted.map(c=>c.displayOrder)).size!==sorted.length;
  return legacy?sorted.map((c,i)=>({...c,storedDisplayOrder:c.displayOrder,displayOrder:i+1})):sorted;
}

export function nextCategoryOrder(items:Category[]){return Math.max(0,...orderCategories(items).map(c=>c.displayOrder))+1;}

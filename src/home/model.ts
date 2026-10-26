import type {Product} from '../types/index.ts';
export function recentProducts(products:Product[]){return products.filter(p=>p.status==='Published').slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)||b.id.localeCompare(a.id)).slice(0,4);}
export const categoryArtwork=(id:string,products:Product[])=>products.find(p=>p.categoryId===id&&p.status==='Published'&&p.images.full);
export const productPath=(p:Product)=>'/product/'+(p.slug||p.id);
export function homeDiscount(p:Product){const price=Math.round(p.price*100),original=Math.round((p.originalPrice||0)*100);return Number.isSafeInteger(price)&&Number.isSafeInteger(original)&&price>=0&&original>price?Math.floor((original-price)*100/original):0;}

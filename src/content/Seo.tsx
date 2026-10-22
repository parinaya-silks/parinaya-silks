import {useEffect} from 'react';
import type {PublicProductRecord} from '../products/model.ts';
const origin='https://parinayasilks.vercel.app';
export function Seo({path,product}:{path:string;product?:PublicProductRecord}){
 useEffect(()=>{const pathname=path.split('?')[0],privatePage=/^\/(?:admin|account|checkout|bag|wishlist|login|register|forgot-password|verify-email|order-)/.test(pathname),label=product?.name||({'/':'Sarees','/shop':'Shop sarees','/collections':'Saree collections','/sale':'Sarees on sale','/contact':'Contact','/about':'About','/shipping-policy':'Shipping policy','/returns-policy':'Returns and exchanges','/privacy-policy':'Privacy policy','/terms-conditions':'Terms and conditions'} as Record<string,string>)[pathname]||(pathname.startsWith('/collections/')?pathname.slice(13).split('-').join(' '):'PARINAYA SILKS');
 document.title=privatePage?'Account | PARINAYA SILKS':label+' | PARINAYA SILKS';
 const meta=(name:string,content:string)=>{let node=document.head.querySelector<HTMLMetaElement>('meta[name="'+name+'"]');if(!node){node=document.createElement('meta');node.name=name;document.head.append(node);}node.content=content;return node;};
 meta('description',privatePage?'Secure PARINAYA SILKS account.':product?product.description.slice(0,160):'Explore the current PARINAYA SILKS saree collection. Hyderabad, India.');meta('robots',privatePage||pathname==='/search'?'noindex, nofollow':'index, follow');
 let canonical=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}canonical.href=origin+pathname;
 document.getElementById('parinaya-product-schema')?.remove();if(product&&!privatePage){const script=document.createElement('script');script.id='parinaya-product-schema';script.type='application/ld+json';script.textContent=JSON.stringify({'@context':'https://schema.org','@type':'Product',name:product.name,description:product.description,image:product.images.map(image=>image.url),sku:product.sku,url:origin+'/product/'+product.slug,brand:{'@type':'Brand',name:'PARINAYA SILKS'},offers:{'@type':'Offer',url:origin+'/product/'+product.slug,priceCurrency:'INR',price:(product.pricePaise/100).toFixed(2),availability:'https://schema.org/'+((product.inventory.mode==='simple'?product.inventory.quantity||0:product.inventory.variants?.reduce((sum,item)=>sum+item.quantity,0)||0)>0?'InStock':'OutOfStock')}});document.head.append(script);}return()=>{document.getElementById('parinaya-product-schema')?.remove();};
 },[path,product]);return null;
}
// Deliberately disabled. A future approved analytics adapter may consume public
// navigation events here; do not include customer identities, order IDs or PII.
export const analyticsEnabled=false;

import React from 'react';
import {Seo} from '../content/Seo.tsx';
import { usePublicProduct } from './hooks.ts';
import { storefrontProduct } from './adapter.ts';
import { ProductDetailView } from '../views/ProductDetailView.tsx';
import type {Product} from '../types/index.ts';
export function PublicProduct({slug,products,onNavigate,onAddToCart,onToggleWishlist,isWishlisted}:{slug:string;products:Product[];onNavigate:(path:string)=>void;onAddToCart:(product:Product,quantity?:number,color?:string)=>void;onToggleWishlist:(product:Product)=>void;isWishlisted:(id:string)=>boolean}) {
  const state=usePublicProduct(slug);
  if(state.status==='ready'&&state.product)return <><Seo path={'/product/'+slug} product={state.product}/><ProductDetailView key={state.product.id} product={storefrontProduct(state.product)} allProducts={products} onNavigate={onNavigate} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} isWishlisted={isWishlisted}/></>;
  return <section className="p-8 text-center space-y-4"><h1 className="font-serif text-2xl">{state.status==='loading'?'Loading product…':state.status==='not-found'?'Product not found':'Product unavailable'}</h1>{state.status==='error'?<button className="min-h-11 px-5 underline" onClick={state.retry}>Retry product</button>:state.status==='not-found'&&<button className="min-h-11 px-5 underline" onClick={()=>onNavigate('/shop')}>Continue shopping</button>}</section>;
}

import React from 'react';
import type {Shopping} from '../shopping/useShopping.ts';
import {money} from '../shopping/model.ts';
import {storefrontProduct} from '../products/adapter.ts';
import {ShoppingState,ShoppingImage} from '../shopping/ShoppingState.tsx';

export function WishlistView({shopping,onNavigate}:{shopping:Shopping;onNavigate:(path:string)=>void}) {
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-28 space-y-5">
    <header className="flex flex-wrap items-baseline gap-2.5 border-b border-[#E8DDD6] pb-3"><h1 className="font-serif text-[22px] sm:text-[28px]">My Wishlist</h1>{shopping.signedIn&&<span className="px-2.5 py-1 rounded-full bg-[#F4EEE5] text-[#5F5552] text-[11px] uppercase">{shopping.wishlist.length} Saved Sarees</span>}</header>
    {!shopping.signedIn||shopping.status!=='ready'||!shopping.wishlist.length?<ShoppingState shopping={shopping} kind="wishlist" onNavigate={onNavigate}/>:<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">{shopping.wishlist.map(item=>{
      const product=item.product,cover=product?.images.find(image=>image.mediaId===product.coverMediaId)||product?.images[0];
      const open=()=>{if(product)onNavigate('/product/'+product.slug);};
      return <article key={item.id} className="bg-white rounded-xl border border-[#E8DDD6] overflow-hidden flex flex-col" data-wishlist-product={item.productId}>
        <div className="relative aspect-[3/4] bg-[#F4EEE5]"><button className="w-full h-full" onClick={open} disabled={!product} aria-label={product?'Open '+product.name:'Product unavailable'}><ShoppingImage url={cover?.url} alt={cover?.alt||product?.name||'Unavailable product'}/></button><button aria-label={'Remove '+(product?.name||'unavailable product')+' from wishlist'} disabled={shopping.isBusy(item.productId)} onClick={()=>shopping.removeWish(item.productId)} className="absolute top-2 right-2 w-11 h-11 bg-white/95 rounded-full text-[#780D24] disabled:opacity-40"><span className="material-symbols-outlined fill">favorite</span></button></div>
        <div className="p-3 flex flex-col flex-1"><h2 className="font-serif text-sm break-words"><button className="min-h-11 text-left" onClick={open} disabled={!product}>{product?.name||'Product unavailable'}</button></h2>{product&&<p className="text-base text-[#780D24] font-bold mt-2">{money(product.pricePaise)}</p>}{item.reason&&<p className="text-xs text-[#5F5552] mt-2">{item.reason}</p>}<button className="mt-3 min-h-11 px-2 rounded bg-[#780D24] text-white text-xs disabled:bg-[#F4EEE5] disabled:text-[#5F5552]" disabled={!product||!item.stock||shopping.isBusy(item.productId)} onClick={()=>{if(product){if(shopping.isInCart(product.id)&&product.inventory.mode==='simple')onNavigate('/bag');else shopping.add(storefrontProduct(product));}}}>{!product?'Unavailable':!item.stock?'Out of stock':shopping.isBusy(item.productId)?'Saving...':shopping.isInCart(product.id)&&product.inventory.mode==='simple'?'View bag':product.inventory.mode==='variants'?'Select colour':'Add to Bag'}</button></div>
      </article>;
    })}</div>}
  </div>;
}

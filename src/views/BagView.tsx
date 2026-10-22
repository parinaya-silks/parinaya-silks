import React from 'react';
import type {Shopping} from '../shopping/useShopping.ts';
import {money,subtotalPaise} from '../shopping/model.ts';
import {ShoppingState,ShoppingImage} from '../shopping/ShoppingState.tsx';

export function BagView({shopping,onNavigate}:{shopping:Shopping;onNavigate:(path:string)=>void}) {
  const cart=shopping.bag;
  return <div className="max-w-md md:max-w-4xl mx-auto px-4 pt-2 pb-28 space-y-5">
    <header className="border-b border-[#E8DDD6] py-4"><h1 className="font-serif text-[28px]">My Bag ({cart.reduce((sum,item)=>sum+item.quantity,0)})</h1><p className="text-xs text-[#5F5552] mt-1">{shopping.signedIn?'Saved privately to your account':'Your saved shopping bag'}</p></header>
    {!shopping.signedIn||shopping.status!=='ready'||!cart.length?<ShoppingState shopping={shopping} kind="bag" onNavigate={onNavigate}/>:<div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      <div className="md:col-span-7 space-y-3.5">{cart.map(item=>{
        const product=item.product,cover=product?.images.find(image=>image.mediaId===product.coverMediaId)||product?.images[0];
        const open=()=>{if(product)onNavigate('/product/'+product.slug);};
        return <article key={item.id} className="bg-white rounded-xl border border-[#E8DDD6] p-4 shadow-xs space-y-3" data-shopping-line={item.id}>
          <div className="flex gap-3.5"><button onClick={open} disabled={!product} aria-label={product?'Open '+product.name:'Product unavailable'} className="w-20 shrink-0 aspect-[3/4] bg-[#F4EEE5] overflow-hidden rounded border border-[#E8DDD6]"><ShoppingImage url={cover?.url} alt={cover?.alt||product?.name||'Unavailable product'}/></button>
            <div className="flex-1 min-w-0"><h2 className="font-serif text-[15px] leading-tight break-words"><button className="text-left min-h-11" onClick={open} disabled={!product}>{product?.name||'Product unavailable'}</button></h2>{item.variantName&&<p className="text-xs text-[#5F5552]">{item.variantName}</p>}{product&&<p className="text-lg font-bold text-[#780D24] mt-2">{money(product.pricePaise)}</p>}{item.reason&&<p className="text-xs text-[#780D24] mt-2" role="note">{item.reason} Excluded from subtotal.</p>}</div></div>
          <div className="pt-2.5 border-t border-[#F4EEE5] flex items-center justify-between gap-2"><span className="text-xs text-[#5F5552]">Quantity</span><div className="flex items-center border border-[#E8DDD6] rounded"><button aria-label="Decrease quantity" className="w-11 h-11 disabled:opacity-40" disabled={shopping.isBusy(item.productId)||item.quantity<=1} onClick={()=>shopping.adjust(item.productId,item.variantId,-1)}>-</button><span className="min-w-8 text-center text-sm" aria-live="polite">{item.quantity}</span><button aria-label="Increase quantity" className="w-11 h-11 disabled:opacity-40" disabled={shopping.isBusy(item.productId)||item.quantity>=item.stock||!!item.reason} onClick={()=>shopping.adjust(item.productId,item.variantId,1)}>+</button></div></div>
          <button className="min-h-11 text-xs text-[#780D24] underline disabled:opacity-40" disabled={shopping.isBusy(item.productId)} onClick={()=>shopping.removeBag(item.productId,item.variantId)}>Remove item</button>
        </article>;
      })}</div>
      <aside className="md:col-span-5 bg-white rounded-xl border border-[#E8DDD6] p-5 space-y-4"><h2 className="font-serif text-xl">Bag summary</h2><p className="flex justify-between gap-3 text-sm"><span>Purchasable subtotal</span><strong>{money(subtotalPaise(cart))}</strong></p><p className="text-xs text-[#5F5552]">Unavailable items are excluded. Prices and stock can change. Bag quantities do not reserve inventory.</p><button onClick={()=>onNavigate('/checkout')} className="w-full min-h-12 bg-[#780D24] text-white rounded">Review checkout</button><p className="text-xs text-[#5F5552]">Shipping and coupons are unavailable in this phase.</p><button onClick={()=>onNavigate('/shop')} className="w-full min-h-11 text-[#780D24] underline">Continue shopping</button></aside>
    </div>}
  </div>;
}

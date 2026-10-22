import React,{useEffect,useRef,useState} from 'react';
import type {Shopping} from '../shopping/useShopping.ts';
import {money} from '../shopping/model.ts';
import {ShoppingImage} from '../shopping/ShoppingState.tsx';
import {useAddressBook} from '../delivery/useAddressBook.ts';
import {AddressManager} from '../delivery/AddressManager.tsx';
import {useCheckoutReview} from '../delivery/useCheckoutReview.ts';

export function CheckoutView({shopping,onNavigate}:{shopping:Shopping;onNavigate:(path:string)=>void}){
  const book=useAddressBook(),[selected,setSelected]=useState(''),[addressNotice,setAddressNotice]=useState('');
  const pendingBookRevision=useRef(0);
  useEffect(()=>{
    if(book.status!=='ready')return;
    if(book.revision<pendingBookRevision.current)return;
    pendingBookRevision.current=0;
    if(selected&&book.addresses.some(address=>address.id===selected))return;
    if(selected)setAddressNotice('The selected address was removed. Please review your delivery address again.');
    setSelected(book.defaultAddressId||book.addresses[0]?.id||'');
  },[book.addresses,book.defaultAddressId,book.revision,book.status,selected]);
  const checkout=useCheckoutReview(shopping,book,selected),review=checkout.review;
  if(shopping.status==='error')return <section className="max-w-3xl mx-auto p-6 space-y-4"><h1 className="font-serif text-3xl">Checkout review</h1><p role="alert">Unable to load your bag.</p><button onClick={shopping.retry} className="min-h-11 underline">Retry bag</button></section>;
  if(shopping.status==='ready'&&!shopping.bag.length)return <section className="max-w-3xl mx-auto p-6 pb-28 space-y-4"><h1 className="font-serif text-3xl">Your bag is empty</h1><p>Add a saree to begin your checkout review.</p><button onClick={()=>onNavigate('/shop')} className="min-h-12 px-5 bg-[#780D24] text-white rounded">Continue shopping</button></section>;
  return <div className="pb-28 bg-[#FBF7F0] min-h-screen">
    <div className="bg-[#5E091B] py-3 px-4 text-white"><div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center text-sm"><button className="min-h-11 text-[#F2BE72] underline" onClick={()=>onNavigate('/bag')}>Back to Bag</button><span>Delivery address</span><span aria-hidden="true">/</span><span>Checkout review</span></div></div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5"><h1 className="font-serif text-3xl text-[#780D24]">Checkout review</h1>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 min-w-0 space-y-5">
          <div className="bg-white rounded-xl border border-[#E8DDD6] p-4 sm:p-5 shadow-xs">{addressNotice&&<p role="status" className="text-sm text-[#780D24] mb-3">{addressNotice}</p>}<AddressManager book={book} selected={selected} onSelect={id=>{setSelected(id);setAddressNotice('');}} onSaved={(id,revision)=>{pendingBookRevision.current=revision;setSelected(id);setAddressNotice('Address saved. Please review the updated delivery details.');}}/></div>
          <section className="bg-white rounded-xl border border-[#E8DDD6] p-4 sm:p-5 space-y-4 shadow-xs" aria-label="Bag review"><h2 className="font-serif text-xl">Bag items</h2>
            {checkout.status==='loading'&&<p role="status">Checking current products, prices and stock...</p>}
            {checkout.status==='error'&&<div role="alert" className="space-y-2"><p>{checkout.error}</p><button onClick={checkout.retry} className="min-h-11 underline text-[#780D24]">Retry checkout review</button></div>}
            {review?.items.map(item=>{const product=item.product,cover=product?.images.find(image=>image.mediaId===product.coverMediaId)||product?.images[0];return <article key={item.id} data-checkout-line={item.id} className="border-t border-[#E8DDD6] pt-4 flex gap-4"><div className="w-20 shrink-0 aspect-[3/4] self-start rounded overflow-hidden bg-[#F4EEE5]"><ShoppingImage url={cover?.url} alt={cover?.alt||product?.name||'Unavailable product'}/></div><div className="min-w-0 flex-1"><h3 className="font-serif break-words">{product?.name||'Product unavailable'}</h3>{item.variantName&&<p className="text-sm text-[#5F5552]">{item.variantName}</p>}<p className="text-sm mt-2">Quantity: {item.quantity||'Invalid'}</p>{product&&<p className="font-semibold text-[#780D24] mt-2">{money(product.pricePaise)} each</p>}{item.issues.map(issue=><p key={issue} className="text-sm text-[#780D24] mt-2" role="note">{issue}</p>)}</div></article>;})}
            <button onClick={()=>onNavigate('/bag')} className="min-h-11 underline text-[#780D24]">Edit items in Bag</button>
          </section>
        </div>
        <aside data-review-address={review?.address?.id||''} data-review-revision={review?.address?.revision||0} className="lg:col-span-5 min-w-0 bg-white rounded-xl border border-[#E8DDD6] p-5 space-y-4 shadow-xs" aria-label="Price review"><h2 className="font-serif text-xl">Price review</h2>
          {checkout.changes.length>0&&<div role="alert" className="rounded border border-[#B88A44] p-3 space-y-2"><p className="text-sm font-semibold">Prices have changed. Please review the updated prices.</p>{checkout.changes.map(change=><p key={change.id} className="text-sm break-words">{change.name}: {money(change.previous)} to {money(change.current)}</p>)}<button onClick={checkout.acceptPrices} className="min-h-11 text-[#780D24] underline">I have reviewed the updated prices</button></div>}
          {review?<><p className="flex flex-wrap justify-between gap-2 text-sm"><span>Merchandise subtotal{!review.subtotalComplete?' (priced items)':''}</span><strong>{money(BigInt(review.subtotalPaise))}</strong></p>{!review.subtotalComplete&&<p className="text-xs text-[#780D24]">Some items cannot be priced. Resolve the listed issues in your Bag.</p>}{review.issues.map(issue=><p key={issue} className="text-sm text-[#780D24]">{issue}</p>)}{review.items.some(item=>item.issues.length>0)&&<p className="text-sm text-[#780D24]">Your Bag needs attention before the delivery review is complete.</p>}{review.valid&&checkout.changes.length===0&&<p className="text-sm text-[#5F5552]">Delivery details and merchandise reviewed. This does not confirm courier PIN serviceability.</p>}</>:<p className="text-sm text-[#5F5552]">The merchandise subtotal will appear after the current review loads.</p>}
          <div data-shipping-state={review?.shipping.state||'pending'} data-shipping-revision={review?.shipping.revision||0} className="border-t border-[#E8DDD6] pt-4 space-y-2"><p className="flex flex-wrap justify-between gap-2 text-sm"><span>Shipping</span><span>{review?.shipping.state==='ready'?(review.shipping.free?'Free':money(BigInt(review.shipping.shippingPaise!))):'To be confirmed'}</span></p>{review?.shipping.state==='ready'?<>{checkout.shippingChanged&&<p role="status" className="text-sm text-[#780D24]">Shipping and total were recalculated. Please review the updated amounts.</p>}<p className="flex flex-wrap justify-between gap-2 text-base font-semibold"><span>Total including shipping</span><span>{money(BigInt(review.shipping.totalPaise!))}</span></p>{review.shipping.freeShippingEnabled&&<p className="text-xs text-[#5F5552]">Free shipping on orders above {money(review.shipping.freeThresholdPaise!)}.</p>}<p className="text-xs text-[#5F5552]">All India coverage. This does not confirm courier serviceability for your PIN or a delivery date.</p></>:<p className="text-xs text-[#5F5552]">{review?.shipping.state==='blocked'?'Resolve the delivery address and Bag issues to review shipping.':'Shipping details are being confirmed.'} A valid PIN format does not confirm courier serviceability.</p>}</div>
          <button disabled className="w-full min-h-12 rounded bg-[#F4EEE5] text-[#5F5552]">Payment unavailable</button><p className="text-sm text-[#5F5552]">Online checkout is being prepared. Payment and order placement are not available yet.</p><p className="text-xs text-[#5F5552]">This is a checkout review; payment is unavailable. Prices and stock may change. No inventory is reserved and your Bag stays unchanged.</p><button onClick={checkout.retry} disabled={checkout.status==='loading'||book.status!=='ready'} className="min-h-11 text-[#780D24] underline disabled:opacity-50">Refresh checkout review</button>
        </aside>
      </div>
    </div>
  </div>;
}

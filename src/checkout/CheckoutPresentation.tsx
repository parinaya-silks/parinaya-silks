import React from 'react';
import {MapPin,Package} from 'lucide-react';
import {ShoppingImage} from '../shopping/ShoppingState.tsx';
import {money} from '../shopping/model.ts';
import type {CheckoutReview} from '../delivery/model.ts';

export function CheckoutItems({review,compact=false,locked,onEdit,buyNow}:{review?:CheckoutReview;compact?:boolean;locked:boolean;onEdit:()=>void;buyNow:boolean}){
 return <div className={'checkout-items'+(compact?' compact':'')}>{review?.items.map(item=>{
  const product=item.product,cover=product?.images.find(image=>image.mediaId===product.coverMediaId)||product?.images[0],quantity=Number.isSafeInteger(item.quantity)&&item.quantity>0?item.quantity:null;
  return <article key={item.id} data-checkout-line={item.id}><div className="checkout-item-photo"><ShoppingImage url={cover?.url} alt={cover?.alt||product?.name||'Unavailable product'}/></div><div className="checkout-item-copy"><h3>{product?.name||'Product unavailable'}</h3>{item.variantName&&<p>{item.variantName}</p>}<p>Quantity: {quantity||'Invalid'}</p>{product&&quantity&&<div className="checkout-item-price"><small>{money(product.pricePaise)} each</small><strong>{money(BigInt(product.pricePaise)*BigInt(quantity))}</strong></div>}{item.issues.map(issue=><p key={issue} role="note" className="checkout-issue">{issue}</p>)}{!compact&&<button className="checkout-link" disabled={locked} onClick={onEdit}>{buyNow?'Edit product selection':'Edit items in Bag'}</button>}</div></article>;
 })}</div>;
}

export function DeliverySummary({review,locked,onChange}:{review?:CheckoutReview;locked:boolean;onChange:()=>void}){
 const address=review?.address;
 return <section className="checkout-card checkout-delivering"><header><h2><MapPin size={18}/>Delivering to</h2><button className="checkout-link" disabled={locked} onClick={onChange}>Change</button></header>{address?<address><strong>{address.recipientName}</strong><span>{address.mobileNumber}</span><p>{address.line1}, {address.locality}, {address.city}, {address.state} — {address.pinCode}</p>{address.landmark&&<p>{address.landmark}</p>}</address>:<p>Your delivery address will appear after checkout review.</p>}</section>;
}

export function CheckoutTotals({review,shippingChanged}:{review?:CheckoutReview;shippingChanged:boolean}){
 return <div className="checkout-totals" aria-label="Price review" data-shipping-state={review?.shipping.state||'pending'} data-shipping-revision={review?.shipping.revision||0}>{review?<><dl><div><dt>Items subtotal{!review.subtotalComplete?' (priced items)':''}</dt><dd>{money(BigInt(review.subtotalPaise))}</dd></div>{review.discountPaise&&BigInt(review.discountPaise)>0n&&<div className="checkout-saving"><dt>Coupon savings {review.couponCode&&<small>{review.couponCode}</small>}</dt><dd>−{money(BigInt(review.discountPaise))}</dd></div>}{review.loyalty&&BigInt(review.loyalty.discountPaise)>0n&&<div className="checkout-saving"><dt>Loyalty savings <small>{review.loyalty.appliedPoints} points</small></dt><dd>−{money(BigInt(review.loyalty.discountPaise))}</dd></div>}<div><dt>Delivery</dt><dd>{review.shipping.state==='ready'?(review.shipping.free?'Free':money(BigInt(review.shipping.shippingPaise!))):'To be confirmed'}</dd></div></dl>{shippingChanged&&<p className="checkout-small" role="status">Your total was recalculated. Please review the updated amounts.</p>}{review.shipping.state==='ready'&&review.shipping.freeShippingEnabled&&<p className="checkout-small">Free shipping on orders above {money(review.shipping.freeThresholdPaise!)}.</p>}{review.shipping.state==='ready'&&review.totalPaise&&<div className="checkout-total" data-checkout-total={review.totalPaise}><h3>Total payable</h3><strong>{money(BigInt(review.totalPaise))}</strong></div>}</>:<><p className="checkout-small">Totals will appear after checkout review.</p><dl><div><dt>Delivery</dt><dd>To be confirmed</dd></div></dl></>}</div>;
}

export function CheckoutFooter({onNavigate}:{onNavigate:(path:string)=>void}){return <footer className="checkout-footer checkout-container"><span>PARINAYA SILKS</span><nav aria-label="Checkout policies">{[['/terms-conditions','Terms'],['/privacy-policy','Privacy Policy'],['/shipping-policy','Shipping Policy'],['/contact','Contact Us']].map(([path,label])=><a key={path} href={path} onClick={e=>{if(!e.ctrlKey&&!e.metaKey&&!e.shiftKey){e.preventDefault();onNavigate(path);}}}>{label}</a>)}</nav></footer>;}

export function CheckoutCare(){return <section className="checkout-card checkout-care-note"><Package size={22}/><div><h2>Delivery details</h2><p>Check the recipient, address and contact number before continuing. Shipping charges are confirmed in your order summary.</p></div></section>;}

import {useOnlinePayment} from '../payments/useOnlinePayment.ts';
import {AvailableCoupons} from '../offers/AvailableCoupons.tsx';
import {Loading,Recovery,Updating} from '../loading/Loading.tsx';
import {CheckoutHeader} from '../checkout/CheckoutHeader.tsx';
import {CheckoutPoints} from '../loyalty/CheckoutPoints.tsx';
import React,{useEffect,useRef,useState} from 'react';
import type {Shopping} from '../shopping/useShopping.ts';
import {money} from '../shopping/model.ts';
import {ArrowRight,Banknote,CheckCircle2,ChevronDown,Info,LoaderCircle,LockKeyhole,ShoppingBag,TicketPercent} from 'lucide-react';
import {CheckoutItems,CheckoutTotals,DeliverySummary,CheckoutCare,CheckoutFooter} from '../checkout/CheckoutPresentation.tsx';
import '../checkout/checkout.css';
import {useAddressBook} from '../delivery/useAddressBook.ts';
import {AddressManager} from '../delivery/AddressManager.tsx';
import {useCodOrder} from '../orders/useCodOrder.ts';
import {useCheckoutReview} from '../delivery/useCheckoutReview.ts';
import {checkoutPath,readCheckoutDraft,saveCheckoutDraft,type CheckoutStage} from '../checkout/source.ts';
import {button} from '../orders/ui.tsx';

export function CheckoutView({shopping,onNavigate,currentPath='/checkout'}:{shopping:Shopping;onNavigate:(path:string)=>void;currentPath?:string}){
 const book=useAddressBook(),parameters=new URLSearchParams(currentPath.split('?')[1]||''),id=parameters.has('buyNow')?parameters.get('buyNow')||'invalid':'bag';
 const stage:CheckoutStage=currentPath.split('?')[0].endsWith('/payment')?'payment':currentPath.split('?')[0].endsWith('/summary')?'summary':'delivery';
 const [draft,setDraft]=useState(()=>readCheckoutDraft(book.uid,id)),[storageError,setStorageError]=useState('');
 const [selected,setSelected]=useState(draft?.addressId||''),[addressNotice,setAddressNotice]=useState(''),[coupon,setCoupon]=useState(draft?.couponCode||''),[couponCode,setCouponCode]=useState<string|null>(draft?.couponCode||null);
 const [points,setPoints]=useState(draft?.points??0),[pointsInput,setPointsInput]=useState(String(draft?.points??0));
 const applyPoints=(value:number)=>{setPoints(value);setPointsInput(String(value));};
 const pendingBookRevision=useRef(0),source=draft?.source||{kind:'bag' as const},buyNow=source.kind==='buy-now';
 useEffect(()=>{if(book.status!=='ready'||book.revision<pendingBookRevision.current)return;pendingBookRevision.current=0;if(selected&&book.addresses.some(address=>address.id===selected))return;if(selected)setAddressNotice('The selected address was removed. Please review your delivery address again.');setSelected(book.defaultAddressId||book.addresses[0]?.id||'');},[book.addresses,book.defaultAddressId,book.revision,book.status,selected]);
 useEffect(()=>{if(draft&&!saveCheckoutDraft({...draft,addressId:selected,couponCode,points}))setStorageError('Enable site storage to preserve your checkout selections, then refresh this page.');},[draft,selected,couponCode,points]);
 const checkout=useCheckoutReview(shopping,book,selected,couponCode,source,points),review=checkout.review;
 const reviewedAccount=useRef('');if(review)reviewedAccount.current=book.uid;
 const cod=useCodOrder(review,value=>{checkout.applyReview(value);setDraft(old=>old?{...old,approvedFingerprint:''}:old);},onNavigate,id);
 const online=useOnlinePayment(review,onNavigate,id),[method,setMethod]=useState<'cod'|'online'>('cod');
 const usable=(buyNow||!shopping.pendingBag)&&!!review?.valid&&review.shipping.state==='ready'&&checkout.status==='ready'&&checkout.changes.length===0&&!storageError;
 useEffect(()=>{
  if(!draft||online.checking||online.pending||online.busy||cod.pending||cod.busy||book.status!=='ready')return;
  if(stage!=='delivery'&&(!draft.deliveryConfirmed||!selected)){onNavigate(checkoutPath('delivery',id));return;}
  if(stage==='payment'&&checkout.status==='ready'&&(!usable||draft.approvedFingerprint!==review?.fingerprint)){setAddressNotice('Checkout details changed. Review the updated summary before placing your order.');onNavigate(checkoutPath('summary',id));}
 },[stage,draft?.deliveryConfirmed,draft?.approvedFingerprint,selected,checkout.status,review?.fingerprint,usable,cod.pending,cod.busy,book.status,online.checking,online.pending,online.busy]);
 function proceed(next:CheckoutStage){if(!draft||!usable||cod.busy)return;setAddressNotice('');const updated={...draft,addressId:selected,couponCode,points,deliveryConfirmed:true,approvedFingerprint:next==='payment'?review!.fingerprint:''};if(!saveCheckoutDraft(updated)){setStorageError('Enable site storage to preserve your checkout selections, then refresh this page.');return;}setDraft(updated);if(next==='payment')checkout.retry();onNavigate(checkoutPath(next,id));}
 const editItems=()=>onNavigate(buyNow?'/product/'+draft!.slug:'/bag');
 const locked=cod.busy||cod.pending||online.busy||online.pending||online.checking;
 const couponRefresh=useRef(()=>{});couponRefresh.current=()=>{if(couponCode&&!locked&&checkout.status==='ready')checkout.retry();};
 useEffect(()=>{if(!couponCode||locked)return;const refresh=()=>{if(document.visibilityState==='visible')couponRefresh.current();},timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};},[couponCode,locked]);
 const heading=useRef<HTMLHeadingElement>(null),[summaryOpen,setSummaryOpen]=useState(()=>window.innerWidth>=1024||stage!=='delivery');
 useEffect(()=>{heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});},[stage,id]);
 useEffect(()=>{const media=matchMedia('(min-width:1024px)'),change=()=>{if(media.matches)setSummaryOpen(true);};media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 const back=()=>stage==='delivery'?editItems():onNavigate(checkoutPath(stage==='summary'?'delivery':'summary',id));
 const shell=(body:React.ReactNode)=><div className="checkout-screen"><CheckoutHeader stage={stage} paymentMethod={method} buyNow={buyNow} locked={locked} onBack={()=>stage==='delivery'?onNavigate('/bag'):back()} onNavigate={onNavigate} onStep={step=>onNavigate(checkoutPath(step,id))}/>{body}<CheckoutFooter onNavigate={onNavigate}/></div>;
 if(!draft)return shell(<section className="checkout-container checkout-recovery"><h1>Checkout selection expired</h1><p>Open the product and choose Buy Now again, or checkout your current Bag. Selections from another account are not restored.</p><button className={button} onClick={()=>onNavigate('/shop')}>Browse sarees</button><button className={button} onClick={()=>onNavigate('/bag')}>View Bag</button></section>);
 if(!review&&checkout.status==='loading'&&reviewedAccount.current!==book.uid)return shell(<section className="checkout-container"><h1 className="font-serif text-2xl">Checkout</h1><Loading kind="checkout" label="Loading checkout details" retry={checkout.retry}/></section>);
 if(!buyNow&&shopping.status==='error'&&!shopping.hasLoaded)return shell(<section className="checkout-container checkout-recovery"><h1>Checkout review</h1><Recovery message="Unable to load your bag. Please try again." retry={shopping.retry} label="Retry bag"/></section>);
 if(!buyNow&&shopping.status==='ready'&&!shopping.bag.length&&!cod.pending&&!cod.busy&&!online.pending&&!online.checking)return shell(<section className="checkout-container checkout-recovery"><h1>Your bag is empty</h1><button onClick={()=>onNavigate('/shop')} className={button}>Continue shopping</button></section>);
 const total=review?.shipping.state==='ready'&&review.totalPaise?money(BigInt(review.totalPaise)):null;
 const placeLabel=method==='online'?(online.busy?'Checking payment...':online.pending?'Check payment status':'Pay Online'+(total?' - '+total:'')):cod.busy?'Confirming order...':cod.pending?'Check order status':'Place Order'+(total?' · '+total:'');
 const canContinue=usable&&!locked;
 const feedback=<div className="checkout-feedback" aria-live="polite">
  {addressNotice&&<p role="status">{addressNotice}</p>}{storageError&&<p role="alert">{storageError}</p>}{cod.error&&<p role="alert">{cod.error}</p>}{online.message&&<p role="status">{online.message}</p>}
  {!review&&checkout.status==='loading'&&<Loading kind="checkout" label="Checking current products, prices and stock" retry={checkout.retry}/>}
  {checkout.status==='error'&&<Recovery compact={!!review} message={checkout.error} retry={checkout.retry}/>}
  {review&&<Updating busy={checkout.status==='loading'} retry={checkout.retry}/>}
  {checkout.changes.length>0&&<div role="alert"><p>Prices have changed. Please review the updated prices.</p>{checkout.changes.map(change=><p key={change.id}>{change.name}: {money(change.previous)} to {money(change.current)}</p>)}<button className="checkout-link" onClick={checkout.acceptPrices}>I have reviewed the updated prices</button></div>}
  {review?.issues.map(issue=><p key={issue} role="alert">{issue}</p>)}
  {review&&review.shipping.state!=='ready'&&<p role="alert">{review.shipping.state==='missing'?'Delivery charges are not available yet. Please contact us before ordering.':review.shipping.state==='invalid'?'We cannot confirm delivery charges right now. Please contact us before ordering.':review.shipping.state==='blocked'?'Confirm your delivery address and resolve the item issues to continue.':'Unable to confirm delivery charges. Please retry your review.'}</p>}
  {review?.loyalty?.warning&&<p role="status">{review.loyalty.warning}</p>}
  {stage==='delivery'&&!usable&&(couponCode||points>0)&&<button className="checkout-link" disabled={locked} onClick={()=>{setCoupon('');setCouponCode(null);applyPoints(0);}}>Remove saved discounts and review again</button>}
  {cod.pending&&!cod.busy&&<p role="status">Your previous order request may have been accepted. Check its status or open My orders before starting another order.</p>}
 </div>;
 return <div className="checkout-screen" data-checkout-stage={stage}>
  <CheckoutHeader stage={stage} paymentMethod={method} buyNow={buyNow} locked={locked} onBack={back} onNavigate={onNavigate} onStep={step=>onNavigate(checkoutPath(step,id))}/>
  <div className="checkout-container checkout-body">

   <div className="checkout-grid"><div className="checkout-main-column">
   <header className="checkout-title"><small>{stage==='delivery'?'Delivery details':stage==='summary'?'Order review':'Payment'}</small><h1 ref={heading} tabIndex={-1}>{stage==='delivery'?'Where should we deliver?':stage==='summary'?'Review your order':'Complete your order'}</h1><p>{stage==='delivery'?'Select your delivery address to continue.':stage==='summary'?'Check your items and delivery details before payment.':'Choose an available payment method.'}</p>{buyNow&&stage==='delivery'&&<p className="checkout-buy-now"><ShoppingBag size={15}/>Buy Now: only your selected product is included. Your saved Bag will stay unchanged.</p>}</header>
    {feedback}
    {stage==='delivery'?<><fieldset disabled={locked} className="checkout-address-fieldset"><AddressManager checkout book={book} selected={selected} onSelect={id=>{setSelected(id);setAddressNotice('');setDraft(old=>old?{...old,deliveryConfirmed:false,approvedFingerprint:''}:old);}} onSaved={(id,revision)=>{pendingBookRevision.current=revision;setSelected(id);setDraft(old=>old?{...old,deliveryConfirmed:false,approvedFingerprint:''}:old);setAddressNotice('Address saved. Please review the updated delivery details.');}}/></fieldset><CheckoutCare/></>:<DeliverySummary review={review} locked={locked} onChange={()=>onNavigate(checkoutPath('delivery',id))}/>}
    {stage==='summary'&&<><section className="checkout-card checkout-order-items" aria-label="Bag review"><header><h2>Items in your order</h2><span>{review?review.items.length+' items':checkout.status==='error'?'Not confirmed':'Checking...'}</span></header><CheckoutItems review={review} locked={locked} onEdit={editItems} buyNow={buyNow}/>{buyNow&&<p className="checkout-small">Your other Bag items remain saved.</p>}</section>
     <section className="checkout-card checkout-coupon"><h2><TicketPercent size={19}/>Have a coupon code?</h2><form onSubmit={event=>{event.preventDefault();if(locked||checkout.status==='loading')return;setCouponCode(coupon.trim().toUpperCase()||null);checkout.retry();}}><label className="sr-only" htmlFor="checkout-coupon">Coupon code</label><input id="checkout-coupon" aria-label="Coupon code" placeholder="Enter coupon code" maxLength={32} value={coupon} disabled={locked} onChange={event=>setCoupon(event.target.value)}/><button className="checkout-secondary" disabled={locked||checkout.status==='loading'}>Apply coupon</button></form>{couponCode&&<div className="checkout-applied" role="status"><div><strong>{couponCode}</strong><p>{checkout.status==='ready'&&review?.discountPaise&&BigInt(review.discountPaise)>0n?'Coupon applied. Applied savings: '+money(BigInt(review.discountPaise)):checkout.status==='loading'?'Reviewing coupon eligibility...':'This coupon could not be confirmed for your current order. Remove it or try another code.'}</p></div><button className="checkout-link" disabled={locked} onClick={()=>{setCoupon('');setCouponCode(null);}}>Remove coupon</button></div>}</section>
     <AvailableCoupons checkout appliedCode={checkout.status==='ready'?review?.couponCode:null} onRemove={()=>{setCoupon('');setCouponCode(null);}} onNavigate={onNavigate} source={source} disabled={locked||checkout.status==='loading'} refreshKey={JSON.stringify([review?.fingerprint,shopping.bag.map(item=>[item.id,item.quantity,item.product?.pricePaise,item.stock,item.reason])])} onApply={code=>{setCoupon(code);setCouponCode(code);if(code===couponCode)checkout.retry();}}/>
     {review?.loyalty&&review.loyalty.enabled&&(review.loyalty.available>0||points>0)&&<CheckoutPoints quote={review.loyalty} requested={points} onApply={applyPoints} inputValue={pointsInput} onInputChange={setPointsInput} disabled={locked||checkout.status!=='ready'}/>}
     {review?.loyalty&&!review.loyalty.enabled&&points>0&&<button className="checkout-link" disabled={locked} onClick={()=>applyPoints(0)}>Remove Points</button>}
    </>}
    {stage==='payment'&&<section className="checkout-payment-methods"><h2>Payment method</h2><label className="checkout-card checkout-cod"><input type="radio" name="payment" checked={method==='cod'} disabled={locked} onChange={()=>setMethod('cod')} aria-label="Cash on Delivery"/><div><h3>Cash on Delivery (COD)<span>Available</span></h3><p>Pay when your order is delivered.</p><div><Banknote size={19}/><span>Your order remains unpaid until collection is recorded.</span></div></div></label>{online.available&&<label className="checkout-card checkout-cod"><input type="radio" name="payment" aria-label="Online payment" checked={method==='online'} disabled={locked} onChange={()=>setMethod('online')}/><div><h3>Online Payment {online.mode==='test'?'(TEST MODE)':''}</h3><p>UPI, cards and net banking through Razorpay. Available methods are shown in the payment window.</p></div></label>}{!online.available&&<div className="checkout-online-unavailable"><Info size={19}/><p>Online payments are not available. This order uses Cash on Delivery.</p></div>}</section>}
    <div className="checkout-actions"><div>{total&&<p><span>Total payable</span><strong>{total}</strong></p>}{stage==='delivery'?<button className="checkout-primary" disabled={!canContinue} onClick={()=>proceed('summary')}>Continue to Review<ArrowRight size={18}/></button>:stage==='summary'?<button className="checkout-primary" disabled={!canContinue} onClick={()=>proceed('payment')}>Continue to Payment<LockKeyhole size={17}/></button>:<button className="checkout-primary" onClick={()=>void (method==='online'?online.pay():cod.place())} disabled={online.checking||online.busy||cod.busy||(!(method==='online'?online.pending:cod.pending)&&(!usable||draft.approvedFingerprint!==review?.fingerprint))}>{cod.busy?<LoaderCircle size={18} className="checkout-spinning"/>:<LockKeyhole size={17}/>}<span>{placeLabel}</span></button>}{stage==='payment'&&<small>By placing your order, you agree to our <a href="/terms-conditions" onClick={e=>{e.preventDefault();onNavigate('/terms-conditions');}}>Terms</a> and <a href="/privacy-policy" onClick={e=>{e.preventDefault();onNavigate('/privacy-policy');}}>Privacy Policy</a>.</small>}</div></div>
    <div className="checkout-recovery-links"><button className="checkout-link" onClick={checkout.retry} disabled={checkout.status==='loading'||book.status!=='ready'||locked}>Refresh checkout review</button><button className="checkout-link" onClick={()=>onNavigate('/account/orders')}>View My Orders</button>{cod.pending&&stage!=='payment'&&<button className="checkout-link" onClick={()=>onNavigate(checkoutPath('payment',id))}>Continue order recovery</button>}</div>
   </div>
   <aside className="checkout-summary checkout-card" data-review-address={review?.address?.id||''} data-review-revision={review?.address?.revision||0}><details open={stage==='delivery'?summaryOpen:true} onToggle={e=>{if(stage==='delivery')setSummaryOpen(e.currentTarget.open);}}><summary><h2>{stage==='payment'?'Final Order Summary':'Order Summary'}</h2><span>{review?review.items.length+' items':checkout.status==='error'?'Not confirmed':'Checking...'}</span><ChevronDown size={17}/></summary><div className="checkout-summary-body">{stage!=='summary'&&<CheckoutItems compact review={review} locked={locked} onEdit={editItems} buyNow={buyNow}/>}<CheckoutTotals review={review} shippingChanged={checkout.shippingChanged}/>{stage==='payment'?<p className="checkout-selected-mode"><CheckCircle2 size={16}/>Selected mode: {method==='online'?'Online Payment':'Cash on Delivery'}</p>:<p className="checkout-small checkout-summary-next">{stage==='delivery'?'Review and payment options in the next steps.':'Next step: choose your payment method.'}</p>}</div></details></aside>
   </div>
  </div><CheckoutFooter onNavigate={onNavigate}/>
 </div>;
}

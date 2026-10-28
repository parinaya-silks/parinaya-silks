import React,{useEffect,useRef,useState} from 'react';
import {ArrowRight,Mail,Phone,MessageCircle,RefreshCw,X} from 'lucide-react';
import {useCustomerAuth} from '../customer/CustomerAuth.tsx';
import {usePublicContact,useStoreContent} from '../content/public.tsx';
import {emailLink,phoneLink,whatsappLink} from '../contact/model.ts';
import {getAuthClients} from '../services/firebase/auth.ts';
import {newOperation} from '../products/client.ts';
import {ProductError} from '../products/model.ts';
import {customerAction} from './client.ts';
import type {OrderRecord} from './model.ts';
import {consumePlacementArrival} from './confirmation.ts';
import {OrderHeader,OrderBottomNav,OrderFooter} from './OrderNavigation.tsx';
import {canCelebrate,cancellationEligible,ConfirmationMotif,CopyReference,ist,OrderAddress,OrderProgress,PaymentNotice,PaymentSummary,PurchasedItems} from './customerPresentation.tsx';
import './customerOrders.css';

function useOwnedOrder(uid:string,id:string) {
 const [attempt,setAttempt]=useState(0),[state,setState]=useState<{key:string;order?:OrderRecord;loading:boolean;error?:string}>();
 const key=uid+':'+id,latest=useRef(key);latest.current=key;
 useEffect(()=>{let live=true,request=0;const controller=new AbortController();
  async function load(){const sequence=++request;setState(old=>({key,order:old?.key===key?old.order:undefined,loading:true}));
   try{const order=await customerAction<OrderRecord>(uid,{action:'orders:get',id},controller.signal);if(order.uid!==uid||(order.id!==id&&order.reference!==id))throw new Error('Order identity mismatch');if(live&&latest.current===key&&sequence===request)setState({key,order,loading:false});}
   catch(failure){if(live&&latest.current===key&&sequence===request)setState(old=>({key,order:old?.key===key?old.order:undefined,loading:false,error:failure instanceof ProductError&&failure.code==='not-found'?'Order not found.':failure instanceof ProductError&&failure.code==='unauthorized'?'Sign in again to view this order.':'We couldn’t load this order. Please try again.'}));}
  }
  void load();const refresh=()=>{if(document.visibilityState==='visible')void load();};const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);
  return()=>{live=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[key,attempt]);
 return {order:state?.key===key?state.order:undefined,loading:state?.key!==key||state.loading,error:state?.key===key?state.error:undefined,retry:()=>setAttempt(n=>n+1)};
}
function AssistanceSheet({order,onClose,onSaved}:{order:OrderRecord;onClose:()=>void;onSaved:()=>void}) {
 const {content}=useStoreContent(),uid=getAuthClients().auth.currentUser?.uid||'';
 const dialog=useRef<HTMLDialogElement>(null),alive=useRef(true),lock=useRef(false),pending=useRef<Record<string,unknown>|null>(null);
 const [reason,setReason]=useState(''),[kind,setKind]=useState(()=>['Placed','Confirmed','Processing'].includes(order.status)?'cancellation':content.returnKinds[0]||'return'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[received,setReceived]=useState(false),[uncertain,setUncertain]=useState(false);
 // Keep the customer's original intent if fulfilment changes while open.
 const cancel=kind==='cancellation',eligible=cancel?cancellationEligible(order):(['Shipped','Delivered'].includes(order.status)&&content.returnsEnabled&&content.returnKinds.includes(kind as 'return'|'exchange')&&(!order.request||order.request.status==='rejected'));
 const actualKind=kind;
 useEffect(()=>{alive.current=true;const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();dialog.current?.querySelector('textarea')?.focus();return()=>{alive.current=false;dialog.current?.close();previous?.isConnected&&previous.focus();};},[]);
 async function submit(event:React.FormEvent){event.preventDefault();if(lock.current||!eligible||!reason.trim())return;lock.current=true;setBusy(true);setError('');
  const body=pending.current||{action:'orders:request',id:order.id,expectedRevision:order.revision,operationId:newOperation(),command:'request-'+actualKind,note:reason.trim()};pending.current=body;
  try{await customerAction(uid,body);if(!alive.current||getAuthClients().auth.currentUser?.uid!==uid)return;setReceived(true);setUncertain(false);pending.current=null;onSaved();}
  catch(failure){if(!alive.current||getAuthClients().auth.currentUser?.uid!==uid)return;const definite=failure instanceof ProductError&&['invalid','permission','conflict','not-found','unauthorized'].includes(failure.code);if(definite)pending.current=null;setUncertain(!definite);setError(definite?'The request could not be saved. Review the latest order status and try again.':'We couldn’t confirm your request. Retry safely to check the same request.');onSaved();}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <dialog ref={dialog} className="customer-order-dialog" aria-labelledby="order-request-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><form onSubmit={submit}><header><h2 id="order-request-title">{cancel?'Request Cancellation':'Request Assistance'}</h2><button type="button" aria-label="Close request" disabled={busy} onClick={onClose}><X size={20}/></button></header><div className="order-dialog-body">{received?<div role="status"><h3>Request received</h3><p>The store will review your request. Your order has not been automatically cancelled.</p></div>:!eligible?<p role="status">{order.request&&order.request.status!=='rejected'?'An order request already exists. See its current status on your order.':'This request is no longer available for the current order status.'}</p>:<><p>{cancel?'The store reviews cancellation requests before dispatch. Submitting a request does not cancel your order.':'Requests are reviewed under the store’s approved returns policy.'}</p>{!cancel&&<label>Request type<select value={actualKind} disabled={busy||uncertain} onChange={event=>setKind(event.target.value)}>{content.returnKinds.map(kind=><option key={kind} value={kind}>{kind==='return'?'Return':'Exchange'}</option>)}</select></label>}<label>Reason<textarea aria-label="Reason" required maxLength={500} rows={4} disabled={busy||uncertain} value={reason} onChange={event=>setReason(event.target.value)} autoFocus/></label></>}{error&&<p role="alert">{error}</p>}</div><footer><button type="button" onClick={onClose} disabled={busy}>{received?'Close':'Cancel'}</button>{!received&&eligible&&<button className="order-primary" type="submit" disabled={busy||!reason.trim()}>{busy?'Sending…':uncertain?'Retry request':'Submit request'}</button>}</footer></form></dialog>;
}
export function CustomerOrderPage({id,confirmed,onNavigate}:{id:string;confirmed:boolean;onNavigate:(path:string)=>void}) {
 const {user}=useCustomerAuth(),uid=user?.uid||'',resource=useOwnedOrder(uid,id),{order}=resource,contact=usePublicContact(),{content}=useStoreContent();
 const [sheet,setSheet]=useState(false),[animate,setAnimate]=useState(false),animationChecked=useRef(false);
 useEffect(()=>{if(order&&!animationChecked.current){animationChecked.current=true;const fresh=consumePlacementArrival(uid,order.id);setAnimate(confirmed&&order.status==='Placed'&&fresh);}},[order?.id,confirmed,uid]);
 const confirmedOrder=confirmed&&order&&canCelebrate(order);
 const requestAllowed=order&&(cancellationEligible(order)||(['Shipped','Delivered'].includes(order.status)&&content.returnsEnabled&&content.returnKinds.length>0&&(!order.request||order.request.status==='rejected')));
 const requestLabel=order&&['Placed','Confirmed','Processing'].includes(order.status)?'Request Cancellation':'Request Assistance';
 return <div className={'customer-order-experience '+(confirmed?'order-confirmation':'customer-order-detail-screen')}><OrderHeader confirmed={confirmed} onNavigate={onNavigate}/><div className="customer-order-container">
 {!order&&<section className="order-card order-load-state" aria-busy={resource.loading}>{resource.loading?<p role="status">Loading your order…</p>:<><h1>Order unavailable</h1><p role="alert">{resource.error}</p><button onClick={resource.retry}>Retry</button><button onClick={()=>onNavigate('/account/orders')}>View My Orders</button></>}</section>}
 {order&&<>{resource.error&&<div className="order-notice" role="alert"><p>{resource.error} Showing the last loaded details.</p><button onClick={resource.retry}>Retry</button></div>}
 {confirmedOrder?<><section className={'order-greeting'+(animate?' order-greeting-animate':'')} data-animated={animate}><ConfirmationMotif animate={animate}/><span className="order-label">Order Confirmation</span><h1>Thank you for choosing Parinaya.</h1><h2>Your order has been placed.</h2><p className="order-greeting-quote">“Your next beautiful drape is on its way to becoming part of your story.”</p><p>You can follow your order updates from your account anytime.</p></section><PaymentNotice order={order}/><div className="order-confirm-actions"><button className="order-primary" onClick={()=>onNavigate('/order-tracking/'+order.id)}>View Order & Updates <ArrowRight size={17}/></button><button onClick={()=>onNavigate('/shop')}>Continue Shopping</button><button className="order-text-button" onClick={()=>onNavigate('/account/orders')}>View My Orders</button></div><div className="order-confirm-grid"><div className="order-card order-confirm-items"><div className="order-reference-heading"><div><span className="order-label">Order Reference</span><CopyReference reference={order.reference}/></div><div><span className="order-label">Placed on</span><time>{ist(order.createdAt)}</time></div></div><PurchasedItems order={order}/></div><div className="order-confirm-side"><OrderAddress order={order}/><PaymentSummary order={order}/></div></div></>:<>
 {confirmed&&<div className="order-notice" role="status">This order is currently {order.status.toLowerCase()}. See its current details below.</div>}
 <section className="order-card order-detail-heading"><div><span className="order-status" data-status={order.status}>{order.status}</span><h1>Order Details</h1><span className="order-label">Order Reference</span><CopyReference reference={order.reference}/><time>Placed on {ist(order.createdAt)}</time></div><PaymentNotice order={order}/></section>
 <div className="order-detail-grid"><OrderProgress order={order}/><PurchasedItems order={order}/><OrderAddress order={order}/><PaymentSummary order={order}/><section className="order-card order-assistance"><h2>Need help with this order?</h2><p>Contact the Parinaya Silks team for help with your order.</p><div className="order-support-actions">{contact.mobile&&<a href={phoneLink(contact.mobile)}><Phone size={15}/>Call Support</a>}{contact.email&&<a href={emailLink(contact.email)}><Mail size={15}/>Email Support</a>}{whatsappLink(contact)&&<a href={whatsappLink(contact,'I need help with order '+order.reference)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15}/>WhatsApp</a>}{!contact.mobile&&!contact.email&&!whatsappLink(contact)&&<a href="/contact">Contact Us</a>}</div>{order.request&&<div className="order-request-status" role="status"><p>{order.request.kind} request: {order.request.status}.</p><p>{order.request.reason}</p>{order.request.restocked&&<p>Returned stock received by the store.</p>}</div>}{requestAllowed&&<button className="order-text-button order-request-trigger" onClick={()=>setSheet(true)}>{requestLabel}</button>}{!requestAllowed&&!order.request&&<p className="order-muted">Cancellation is unavailable after dispatch or for a closed order.</p>}<button className="order-text-button order-refresh" disabled={resource.loading} onClick={resource.retry}><RefreshCw size={13}/>{resource.loading?'Refreshing…':'Refresh order'}</button></section></div>
 </>}{sheet&&<AssistanceSheet order={order} onClose={()=>setSheet(false)} onSaved={resource.retry}/>}</>}
 </div><OrderFooter/><OrderBottomNav onNavigate={onNavigate}/></div>;
}

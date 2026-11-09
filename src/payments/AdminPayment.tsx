import {ButtonLoader} from '../loading/Loading.tsx';
import {useState} from 'react';
import {getAuthClients} from '../services/firebase/auth.ts';
import {useAdminWritePermission} from '../admin/permission.tsx';
import type {OrderRecord} from '../orders/model.ts';
import {paymentRequest} from './client.ts';
import {money} from '../shopping/model.ts';
import {ist} from '../orders/customerPresentation.tsx';
export function AdminPayment({order,onRefresh}:{order:OrderRecord;onRefresh:()=>void}){
 const allowed=useAdminWritePermission(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),p=order.payment;if(!p)return null;
 async function reconcile(){if(busy||!allowed)return;setBusy(true);setMessage('');try{await paymentRequest(getAuthClients().auth.currentUser!.uid,'reconcile',{id:order.id});setMessage('Provider reconciliation completed.');onRefresh();}catch(e){setMessage(e instanceof Error?e.message:'Reconciliation is pending.');}finally{setBusy(false);}}
 return <section className="detail-panel"><header><h2>Online payment {p.mode==='test'?'— TEST':''}</h2></header><div className="detail-panel-body"><dl>{[['Internal order',order.id],['Razorpay order',p.providerOrderId||'Creation outcome pending'],['Razorpay payment',p.providerPaymentId||'Not confirmed'],['State',p.state],['Method',p.method||'Not confirmed'],['Amount',money(BigInt(p.amountPaise))],['Reservation',p.reservation],['Provider checked',p.verifiedAt?ist(p.verifiedAt):'Not yet verified'],['Authorization time',p.authorizedAt?ist(p.authorizedAt):'Not recorded'],['Captured',p.capturedAt?ist(p.capturedAt):'Not confirmed'],[p.capturedAt?'Earlier failed attempt':'Failed attempt',p.failedAt?ist(p.failedAt):'None recorded'],['Refund',p.refundState||'None confirmed'],['Refund confirmed',p.refundedAt?ist(p.refundedAt):'None confirmed'],['Refunded amount',money(BigInt(p.refundedPaise||0))],['Review reason',p.reason||'None']].map(([label,value])=><div key={label}><dt>{label}</dt><dd style={{overflowWrap:'anywhere'}}>{value}</dd></div>)}</dl>{p.refundReviewRequired&&<p role="alert">Refund merchandise allocation requires trusted review. Points spending is held; no automatic refund or stock restoration is promised.</p>}<button type="button" className="admin-secondary" disabled={!allowed||busy} onClick={()=>void reconcile()}>{busy?<ButtonLoader label={'Reconciling…'}/>: 'Reconcile with Razorpay'}</button><p role="status">{message}</p><p>Refund initiation is not enabled here. Refund status comes from the provider. Do not record an online payment as a COD collection.</p></div></section>;
}

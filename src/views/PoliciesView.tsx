import React,{Suspense,lazy} from 'react';
import {Info,FileText,RefreshCw} from 'lucide-react';
import {useStoreContent} from '../content/public.tsx';
import {ContactSupportLinks} from '../contact/ContactLinks.tsx';
import '../policies/policy.css';
import {PolicyLayout} from '../policies/PolicyLayout.tsx';
import {publicPolicy,samplePreviewEnabled,type PolicyKey} from '../policies/model.ts';
// The preview module and all sample wording are removed from production builds.
const LocalSample=import.meta.env.DEV?lazy(()=>import('../policies/PolicySample.tsx')):null;
export const PoliciesView=({initialTab='shipping',onNavigate}:{initialTab?:PolicyKey;onNavigate:(path:string)=>void})=>{
 const {content,status,hasLoaded,retry}=useStoreContent(),policy=publicPolicy(initialTab,content.policies[initialTab]);
 const preview=samplePreviewEnabled(import.meta.env.DEV,window.location.search);
 const loading=<div className="policy-loading" role="status"><FileText size={25}/><span>Loading policy...</span><div/><div/><div/></div>;
 if(hasLoaded&&status!=='error'&&!policy.available&&preview&&LocalSample)return <Suspense fallback={<PolicyLayout support={<ContactSupportLinks/>} policyKey={initialTab} heading={policy.heading} onNavigate={onNavigate}>{loading}</PolicyLayout>}><LocalSample support={<ContactSupportLinks/>} key={initialTab} policyKey={initialTab} onNavigate={onNavigate}/></Suspense>;
 return <PolicyLayout support={<ContactSupportLinks/>} policyKey={initialTab} heading={policy.heading} preview={preview} onNavigate={onNavigate} notice={status==='error'?<div className="policy-load-error" role="alert"><Info size={21}/><div><strong>{hasLoaded&&policy.available?'Unable to refresh this policy.':'Unable to load this policy.'}</strong><p>{hasLoaded&&policy.available?'Showing the last successfully loaded wording.':'Please try again or contact our team.'}</p><button className="policy-button" onClick={retry}><RefreshCw size={16}/>Retry policy</button></div></div>:undefined}>
  {!hasLoaded&&status==='loading'?loading:hasLoaded&&policy.available?<article className="policy-real-copy" aria-label="Published policy content" data-policy-state="published">{policy.text}</article>:status!=='error'?<section className="policy-unavailable" data-policy-state="unavailable"><FileText size={28}/><h2>Policy content unavailable</h2><p>Final policy terms are pending. Please contact us with any questions.</p></section>:null}
 </PolicyLayout>;
};

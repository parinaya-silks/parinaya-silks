import {Loading,Recovery,Updating} from '../loading/Loading.tsx';
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
 const {content,status,hasLoaded,retry,busy}=useStoreContent(),policy=publicPolicy(initialTab,content.policies[initialTab]);
 const preview=samplePreviewEnabled(import.meta.env.DEV,window.location.search);
 const loading=<Loading kind="text" label="Loading policy" retry={retry}/>;
 if(hasLoaded&&status!=='error'&&!policy.available&&preview&&LocalSample)return <Suspense fallback={<PolicyLayout support={<ContactSupportLinks/>} policyKey={initialTab} heading={policy.heading} onNavigate={onNavigate}>{loading}</PolicyLayout>}><LocalSample support={<ContactSupportLinks/>} key={initialTab} policyKey={initialTab} onNavigate={onNavigate}/></Suspense>;
 return <PolicyLayout support={<ContactSupportLinks/>} policyKey={initialTab} heading={policy.heading} preview={preview} onNavigate={onNavigate} notice={hasLoaded?<Updating busy={busy} error={status==='error'} retry={retry}/>:status==='error'?<Recovery retry={retry} label="Retry policy" message="Unable to load this policy. Please try again."/>:undefined}>
  {!hasLoaded&&status==='loading'?loading:hasLoaded&&policy.available?<article className="policy-real-copy" aria-label="Published policy content" data-policy-state="published">{policy.text}</article>:status!=='error'?<section className="policy-unavailable" data-policy-state="unavailable"><FileText size={28}/><h2>Policy content unavailable</h2><p>Final policy terms are pending. Please contact us with any questions.</p></section>:null}
 </PolicyLayout>;
};

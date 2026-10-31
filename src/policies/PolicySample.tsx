// Local design fixture only. The importing branch is eliminated by Vite's DEV flag.
// These paragraphs describe placeholders, never actual business/legal promises.
import React from 'react';
import {Info} from 'lucide-react';
import {PolicyLayout} from './PolicyLayout.tsx';
import {policyPages,type PolicyKey,type PolicySection} from './model.ts';

const paragraph='This local design sample demonstrates the reading layout. Parinaya Silks will supply and approve the final wording before this policy is published.';
const review='The topics below are placeholders for content review. They do not establish a service, deadline, entitlement, charge or business commitment.';
const section=(heading:string,topic:string,extra?:Partial<PolicySection>):PolicySection=>({heading,paragraphs:[topic,paragraph],...extra});
export const policySamples:Record<PolicyKey,PolicySection[]>={
 privacy:[
  section('Introduction','This sample introduces the privacy page and its intended reading structure.',{paragraphs:[paragraph,review]}),
  section('Information You Provide','The final policy should describe the information requested through the store.',{list:['Customer contact details: final scope to be provided.','Account and shopping information: final wording to be provided.','Enquiry information: final wording to be provided.']}),
  section('How Information Is Used','The owner will provide the purposes and scope of information use.',{cards:[{heading:'Shopping and orders',text:'Placeholder for the approved description of shopping-related information use.'},{heading:'Customer enquiries',text:'Placeholder for the approved description of enquiry handling.'}]}),
  section('Service Providers & Sharing','The final policy should identify applicable service-provider disclosures without implying services that are not offered.'),
  section('Cookies & Preferences','The final wording should describe the website behaviour and preferences that actually apply.'),
  section('Your Choices & Requests','The owner will provide the appropriate wording for privacy enquiries and requests.',{note:review}),
  section('Contacting Us','Use the existing Contact Us page for assistance. Final policy contact wording is awaiting the owner.'),
 ],
 terms:[
  section('Using Our Website','This is a sample reading section for the website terms.',{paragraphs:[paragraph,review]}),
  section('Product Information','The owner will provide the applicable product-information terms.',{note:review}),
  section('Prices & Availability','Final wording must reflect the store\u2019s actual pricing and availability practices.'),
  section('Orders & Payments','The owner will provide applicable order and payment wording. This sample does not describe available payment methods.'),
  section('Customer Accounts','Final account terms will be provided by Parinaya Silks.'),
  section('Related Policies','The other policy pages can be reached through the Policy Centre.',{cards:[{heading:'Privacy Policy',text:'Read the available privacy wording.'},{heading:'Shipping Policy',text:'Read the available shipping wording.'},{heading:'Returns & Exchanges',text:'Read the available return and exchange wording.'}]}),
  section('Questions & Contact','Use Contact Us for questions. No special legal office, address or response time is established by this sample.'),
 ],
 shipping:[
  section('Delivery Coverage','Parinaya Silks will provide the actual delivery coverage in the final policy.',{note:'This sample does not promise domestic or international coverage.'}),
  section('Processing & Dispatch','Final processing and dispatch information will be supplied by the owner.'),
  section('Shipping Charges','The final policy wording will describe applicable shipping charges. This page does not change checkout calculations.',{note:review}),
  section('Delivery Estimates','Any delivery estimates must be supplied and approved by the owner. No estimate is specified in this local sample.'),
  section('Order Tracking','The final wording should explain the tracking information actually available to customers.',{cards:[{heading:'Order information',text:'Placeholder for approved order-information wording.'},{heading:'Delivery updates',text:'Placeholder for approved delivery-update wording.'}]}),
  section('Delivery Assistance','Use Contact Us for assistance. Final delivery instructions remain to be supplied.'),
 ],
 returns:[
  section('Overview','This local page demonstrates the return and exchange policy layout.',{paragraphs:[paragraph,review]}),
  section('Requesting a Cancellation','The owner will provide the applicable cancellation process and conditions.',{note:'No cancellation cutoff, fee or guarantee is established by this sample.'}),
  section('Return Eligibility','Applicable eligibility wording will be provided and approved by Parinaya Silks.',{list:['Conditions and exclusions: final wording pending.','Required item information: final wording pending.','Request channels: final wording pending.']}),
  section('Raising a Return Request','Final request instructions will be supplied by the owner. This presentation does not enable or alter return requests.'),
  section('Refund Information','The owner will provide any applicable refund process and terms. This sample promises no refund deadline or payment channel.'),
  section('Damaged or Incorrect Items','Final guidance for reporting item concerns will be provided by Parinaya Silks.',{note:review}),
  section('Contacting Support','Use the existing Contact Us page for questions about the available policy wording.'),
 ],
};
export default function PolicySample({policyKey,onNavigate,support}:{policyKey:PolicyKey;support?:React.ReactNode;onNavigate:(path:string)=>void}){
 return <PolicyLayout support={support} policyKey={policyKey} heading={policyPages[policyKey].title} preview sections={policySamples[policyKey]} onNavigate={onNavigate} notice={<div className="policy-sample-notice" role="note" data-policy-state="sample" data-fixture="LOCAL_POLICY_SAMPLE_ONLY"><Info size={23}/><div><strong>Local design preview</strong><p>Sample content for design review. Final policy wording will be provided by Parinaya Silks.</p></div></div>}>
  {policyKey!=='shipping'&&<aside className="policy-intro-card"><Info size={23}/><div><h2>{policyKey==='privacy'?'Privacy policy preview':policyKey==='terms'?'Reading these terms':'Policy review note'}</h2><p>The sections below demonstrate the page layout. They do not replace approved policy wording.</p></div></aside>}
 </PolicyLayout>;
}

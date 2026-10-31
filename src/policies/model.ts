export const policyPages={
 privacy:{title:'Privacy Policy',path:'/privacy-policy',intro:'Information about privacy and your use of our website.'},
 terms:{title:'Terms & Conditions',path:'/terms-conditions',intro:'Terms and information for shopping with Parinaya Silks.'},
 shipping:{title:'Shipping Policy',path:'/shipping-policy',intro:'Information about shipping and delivery.'},
 returns:{title:'Returns & Exchanges',path:'/returns-policy',intro:'Information about returns, exchanges and related requests.'},
} as const;
export type PolicyKey=keyof typeof policyPages;
export const policyKeys=Object.keys(policyPages) as PolicyKey[];
export function policyFromPath(path:string){return policyKeys.find(key=>policyPages[key].path===path.split('?')[0]);}
export function publicPolicy(key:PolicyKey,value?:{approved?:boolean;text?:string;heading?:string}){
 const available=value?.approved===true&&typeof value.text==='string'&&!!value.text.trim();
 return {available,heading:available&&typeof value.heading==='string'&&value.heading.trim()?value.heading:policyPages[key].title,text:available?value.text!:''};
}
export function samplePreviewEnabled(dev:boolean,search:string){return dev&&new URLSearchParams(search).get('preview')==='policy';}
export type PolicySection={heading:string;paragraphs:string[];list?:string[];note?:string;cards?:{heading:string;text:string}[]};
export function sectionAnchors(key:PolicyKey,sections:PolicySection[]){return sections.map((section,i)=>({...section,id:`policy-${key}-${i+1}`}));}

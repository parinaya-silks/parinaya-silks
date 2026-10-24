import {ProductError,type PublicProductRecord} from '../products/model.ts';
import {exact,text} from '../orders/model.ts';
import {validateAppearance,appearanceInput,type Appearance,type AppearanceInput} from '../appearance/model.ts';
export const campaignIntents=['draft','published','paused','ended','archived'] as const;
export type CampaignIntent=typeof campaignIntents[number];
export type CampaignInput={name:string;description:string;slug:string;banners:AppearanceInput;ctaLabel:string;mode:'products'|'categories';productIds:string[];categoryIds:string[];startsAt:number|null;endsAt:number|null;displayOrder:number;intent:CampaignIntent};
export type CampaignRecord=Omit<CampaignInput,'banners'>&{id:string;banners:Appearance;revision:number;createdAt:number;updatedAt:number;createdBy:string;updatedBy:string};
export type PublicCampaign={name:string;description:string;slug:string;ctaLabel:string;banners:{desktop:Omit<NonNullable<Appearance['desktop']>,'mediaId'>|null;mobile:Omit<NonNullable<Appearance['mobile']>,'mediaId'>|null};endsAt:number|null};
export type Membership={items:PublicProductRecord[];selectedCount:number;eligibleCount:number;hiddenCount:number;outOfStock:number};
export const blankCampaign=():CampaignInput=>({name:'',description:'',slug:'',banners:{desktop:null,mobile:null},ctaLabel:'Explore Sarees',mode:'products',productIds:[],categoryIds:[],startsAt:null,endsAt:null,displayOrder:0,intent:'draft'});
export const campaignInput=(c:CampaignRecord):CampaignInput=>({name:c.name,description:c.description,slug:c.slug,banners:appearanceInput(c.banners),ctaLabel:c.ctaLabel,mode:c.mode,productIds:c.productIds,categoryIds:c.categoryIds,startsAt:c.startsAt,endsAt:c.endsAt,displayOrder:c.displayOrder,intent:c.intent});
export function validateCampaign(value:unknown):CampaignInput{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Invalid campaign.');const raw=value as Record<string,unknown>;exact(raw,Object.keys(blankCampaign()));
 const name=text(raw.name,100,true),description=typeof raw.description==='string'?raw.description.trim():null;if(description===null||description.length>2000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(description))throw new ProductError('invalid','Use a description up to 2,000 characters.');
 const slug=text(raw.slug,80,true);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new ProductError('invalid','Choose a permanent lowercase campaign link.');
 const refs=(key:string,max:number)=>{const values=raw[key];if(!Array.isArray(values)||values.length>max||values.some(id=>typeof id!=='string'||!/^[A-Za-z0-9]{20}$/.test(id))||new Set(values).size!==values.length)throw new ProductError('invalid',`Use up to ${max} distinct ${key==='productIds'?'products':'categories'}.`);return values as string[];};
 for(const key of ['startsAt','endsAt'])if(raw[key]!==null&&(!Number.isSafeInteger(raw[key])||(raw[key] as number)<0||(raw[key] as number)>253402300799999))throw new ProductError('invalid','Choose a valid campaign schedule.');
 if(raw.startsAt!==null&&raw.endsAt!==null&&(raw.startsAt as number)>=(raw.endsAt as number))throw new ProductError('invalid','The end must be after the start.');
 if(!['products','categories'].includes(raw.mode as string)||!campaignIntents.includes(raw.intent as CampaignIntent)||!Number.isSafeInteger(raw.displayOrder)||(raw.displayOrder as number)<0||(raw.displayOrder as number)>9999)throw new ProductError('invalid','Check campaign membership, visibility and display order.');
 return {name,description,slug,banners:validateAppearance(raw.banners),ctaLabel:text(raw.ctaLabel,50),mode:raw.mode as CampaignInput['mode'],productIds:refs('productIds',100),categoryIds:refs('categoryIds',10),startsAt:raw.startsAt as number|null,endsAt:raw.endsAt as number|null,displayOrder:raw.displayOrder as number,intent:raw.intent as CampaignIntent};
}
export function campaignStatus(c:Pick<CampaignInput,'intent'|'startsAt'|'endsAt'>,now=Date.now()){return c.intent==='archived'?'Archived':c.intent==='ended'?'Ended':c.intent==='draft'?'Draft':c.endsAt!==null&&now>=c.endsAt?'Ended':c.intent==='paused'?'Paused':c.startsAt!==null&&now<c.startsAt?'Scheduled':'Live';}
export function campaignTransition(from:CampaignIntent,to:CampaignIntent){if(from===to)return true;if(from==='archived')return false;if(from==='ended')return to==='archived';if(from==='draft')return ['published','archived'].includes(to);return ['draft','published','paused','ended','archived'].includes(to);}
export const campaignSlug=(name:string)=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80).replace(/-$/,'');
export function campaignDestination(link:string):string|null{try{const url=new URL(link,'https://parinayasilks.vercel.app');return url.origin==='https://parinayasilks.vercel.app'&&/^\/sale\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname)?url.pathname.slice(6):null;}catch{return null;}}

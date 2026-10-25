import {ProductError} from '../products/model.ts';
import {validateAppearance,type AppearanceInput,type Appearance} from '../appearance/model.ts';
import {exact,text,safeLink,referenceId} from '../orders/model.ts';
export interface BannerInput {id:string;title:string;link:string;enabled:boolean;images:AppearanceInput;name?:string;supportingText?:string;showButton?:boolean;buttonLabel?:string;placement?:'left'|'center'|'bottom';startsAt?:number|null;endsAt?:number|null}
export interface StoreContentInput {banners:BannerInput[];featuredProductIds:string[];featuredCategoryIds:string[];contact:{email:string;mobile:string;address:string;instagram:string};policies:Record<'shipping'|'returns'|'privacy'|'terms',{text:string;approved:boolean}>;returnsEnabled:boolean;returnKinds:('return'|'exchange')[]}
export interface StoreContent extends Omit<StoreContentInput,'banners'> {banners:(Omit<StoreContentInput['banners'][number],'images'>&{images:Appearance})[];revision:number}
export function blankContent():StoreContent{return {banners:[],featuredProductIds:[],featuredCategoryIds:[],contact:{email:'',mobile:'',address:'',instagram:''},policies:{shipping:{text:'',approved:false},returns:{text:'',approved:false},privacy:{text:'',approved:false},terms:{text:'',approved:false}},returnsEnabled:false,returnKinds:[],revision:0};}
export function validateContent(value:unknown):StoreContentInput{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Invalid store content.');const raw=value as unknown as StoreContentInput;exact(raw as unknown as Record<string,unknown>,['banners','featuredProductIds','featuredCategoryIds','contact','policies','returnsEnabled','returnKinds']);
 if(!Array.isArray(raw.banners)||raw.banners.length>6)throw new ProductError('invalid','Use up to six homepage banners.');const ids=new Set<string>();
 const banners=raw.banners.map(item=>{const banner=validateBanner(item);if(ids.has(banner.id))throw new ProductError('invalid','Use distinct banners.');ids.add(banner.id);return banner;});
 const references=(input:unknown)=>{if(!Array.isArray(input)||input.length>20||input.some(id=>typeof id!=='string'||!/^[A-Za-z0-9]{20}$/.test(id))||new Set(input).size!==input.length)throw new ProductError('invalid','Choose up to 20 distinct product/category IDs.');return input as string[];};
 if(!raw.contact||!raw.policies)throw new ProductError('invalid','Missing contact or policy settings.');exact(raw.contact as unknown as Record<string,unknown>,['email','mobile','address','instagram']);exact(raw.policies,['shipping','returns','privacy','terms']);
 const email=text(raw.contact.email,254);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ProductError('invalid','Enter a valid contact email.');const mobile=text(raw.contact.mobile,20);if(mobile&&!/^\+[1-9][0-9]{7,14}$/.test(mobile))throw new ProductError('invalid','Use an international contact number.');
 const policies=Object.fromEntries(Object.entries(raw.policies).map(([key,policy])=>{exact(policy as unknown as Record<string,unknown>,['text','approved']);if(typeof policy.approved!=='boolean'||typeof policy.text!=='string'||policy.text.length>12000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(policy.text)||(policy.approved&&!policy.text.trim()))throw new ProductError('invalid','Approved policies need nonempty reviewed content (up to 12000 characters).');return [key,{text:policy.text.trim(),approved:policy.approved}];})) as StoreContentInput['policies'];
 if(typeof raw.returnsEnabled!=='boolean'||!Array.isArray(raw.returnKinds)||raw.returnKinds.some(kind=>!['return','exchange'].includes(kind))||new Set(raw.returnKinds).size!==raw.returnKinds.length||(raw.returnsEnabled&&(!policies.returns.approved||!raw.returnKinds.length)))throw new ProductError('invalid','Returns require approved policy content and an explicitly selected request type.');
 return {banners,featuredProductIds:references(raw.featuredProductIds),featuredCategoryIds:references(raw.featuredCategoryIds),contact:{email,mobile,address:text(raw.contact.address,500),instagram:safeLink(raw.contact.instagram)},policies,returnsEnabled:raw.returnsEnabled,returnKinds:raw.returnKinds};
}
export type Banner=StoreContent['banners'][number];
export type PublicBanner=Pick<Banner,'id'|'title'|'link'|'supportingText'|'buttonLabel'|'showButton'|'placement'>&{images:{desktop:Omit<NonNullable<Banner['images']['desktop']>,'mediaId'>|null;mobile:Omit<NonNullable<Banner['images']['mobile']>,'mediaId'>|null}};
export function bannerStatus(b:Pick<BannerInput,'enabled'|'startsAt'|'endsAt'>,now=Date.now()){return !b.enabled?'Disabled':b.endsAt!=null&&now>=b.endsAt?'Ended':b.startsAt!=null&&now<b.startsAt?'Scheduled':'Live';}
export function validateBanner(value:unknown):BannerInput {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Invalid banner.');const item=value as BannerInput;
 exact(item as unknown as Record<string,unknown>,['id','title','link','enabled','images'],['name','supportingText','showButton','buttonLabel','placement','startsAt','endsAt']);
 const id=referenceId(item.id);if(typeof item.enabled!=='boolean')throw new ProductError('invalid','Choose banner visibility.');
 const result:BannerInput={id,title:text(item.title,160),link:safeLink(item.link,true),enabled:item.enabled,images:validateAppearance(item.images)};
 // Absent fields preserve the legacy title/Explore button and continuous visibility.
 if(item.name!==undefined){result.name=text(item.name,100);if(!result.name)throw new ProductError('invalid','Enter an internal banner name.');}
 if(item.supportingText!==undefined)result.supportingText=text(item.supportingText,500);
 if(item.showButton!==undefined){if(typeof item.showButton!=='boolean')throw new ProductError('invalid','Choose whether to show a button.');result.showButton=item.showButton;}
 if(item.buttonLabel!==undefined)result.buttonLabel=text(item.buttonLabel,60);
 if(item.placement!==undefined){if(!['left','center','bottom'].includes(item.placement))throw new ProductError('invalid','Choose a text placement.');result.placement=item.placement;}
 for(const key of ['startsAt','endsAt'] as const)if(item[key]!==undefined){const n=item[key];if(n!==null&&(!Number.isSafeInteger(n)||n<0||n>253402300799999))throw new ProductError('invalid','Enter valid schedule instants.');result[key]=n;}
 if(result.startsAt!=null&&result.endsAt!=null&&result.endsAt<=result.startsAt)throw new ProductError('invalid','End must follow start.');
 if(result.showButton===true&&(!result.link||!result.buttonLabel))throw new ProductError('invalid','A visible button needs a label and destination.');
 return result;
}
export function bannerInput(b:Banner):BannerInput {return {...b,images:{desktop:b.images.desktop?(({mediaId,alt,focalX,focalY})=>({mediaId,alt,focalX,focalY}))(b.images.desktop):null,mobile:b.images.mobile?(({mediaId,alt,focalX,focalY})=>({mediaId,alt,focalX,focalY}))(b.images.mobile):null}};}
export function publicBanner(b:Banner):PublicBanner {return {id:b.id,title:b.title,link:b.showButton===false?'':b.link,supportingText:b.supportingText||'',showButton:b.showButton??!!b.link,buttonLabel:b.buttonLabel??'Explore',placement:b.placement??'bottom',images:{desktop:b.images.desktop?(({url,alt,focalX,focalY,width,height})=>({url,alt,focalX,focalY,width,height}))(b.images.desktop):null,mobile:b.images.mobile?(({url,alt,focalX,focalY,width,height})=>({url,alt,focalX,focalY,width,height}))(b.images.mobile):null}};}

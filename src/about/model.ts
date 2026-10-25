import {ProductError} from '../products/model.ts';
import {exact} from '../orders/model.ts';
import {validateAppearance,type LoginImage,type LoginImageInput} from '../appearance/model.ts';

export interface AboutInput {heading:string;intro:string;storyHeading:string;story:string;showFounder:boolean;founderName:string;founderRole:string;founderBio:string;photo:LoginImageInput|null}
export interface AboutSettings extends Omit<AboutInput,'photo'> {photo:LoginImage|null}
export type PublicAbout=Pick<AboutInput,'heading'|'intro'|'storyHeading'|'story'>&{founder:null|{name:string;role:string;bio:string;photo:Omit<LoginImage,'mediaId'>|null}};
// Compatibility copy is the previous public page, not a saved or invented founder.
export const fallbackAbout=():AboutSettings=>({heading:'About Parinaya Silks',intro:'Discover sarees for celebrations, special occasions and everyday elegance.',storyHeading:'About the Store',story:'PARINAYA SILKS is based in Hyderabad, India. Browse our saree collection and contact us via WhatsApp or email for product information.\n\nOur Collection\nOur curations embrace the spectrum of occasionwear and refined staples. From opulent bridal silks rich with heritage motifs to lightweight, graceful drapes crafted for celebrations and everyday elegance, each piece is selected for distinct craftsmanship and drape quality.\n\nYour Shopping Experience\nBrowse the website and contact us via WhatsApp or email for product information and assistance.',showFounder:false,founderName:'',founderRole:'',founderBio:'',photo:null});
export function aboutInput(v:AboutSettings):AboutInput {return {...v,photo:v.photo?(({mediaId,alt,focalX,focalY})=>({mediaId,alt,focalX,focalY}))(v.photo):null};}
export function validateAbout(value:unknown):AboutInput {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new ProductError('invalid','Enter About Us content.');
 const r=value as AboutInput;exact(r as unknown as Record<string,unknown>,['heading','intro','storyHeading','story','showFounder','founderName','founderRole','founderBio','photo']);
 const clean=(v:unknown,max:number,label:string,required=false)=>{if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v)||required&&!v.trim())throw new ProductError('invalid',`${label}${required?' is required and':''} must be text up to ${max} characters.`);return v.replaceAll('\r\n','\n').trim();};
 if(typeof r.showFounder!=='boolean')throw new ProductError('invalid','Choose founder visibility.');
 const result={heading:clean(r.heading,100,'Page heading',true),intro:clean(r.intro,1500,'Short introduction'),storyHeading:clean(r.storyHeading,150,'Story heading'),story:clean(r.story,12000,'Brand story',true),showFounder:r.showFounder,founderName:clean(r.founderName,160,'Founder name',r.showFounder),founderRole:clean(r.founderRole,200,'Founder role'),founderBio:clean(r.founderBio,3000,'Founder introduction'),photo:validateAppearance({desktop:r.photo,mobile:null}).desktop};
 return result;
}
export function storedAbout(raw?:Record<string,unknown>):AboutSettings {
 if(!raw)return fallbackAbout();
 const candidate={...fallbackAbout(),...Object.fromEntries(Object.keys(fallbackAbout()).filter(k=>k in raw).map(k=>[k,raw[k]]))};
 try{const input=validateAbout(aboutInput(candidate as AboutSettings));const photo=raw.photo as LoginImage|null|undefined;if(photo&&(!/^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/[^\s?#]+$/.test(photo.url)||![photo.width,photo.height].every(n=>Number.isSafeInteger(n)&&n>0&&n<=20000)))throw Error('Invalid saved portrait metadata');return {...input,photo:photo?{...input.photo!,url:photo.url,width:photo.width,height:photo.height}:null};}catch{throw new ProductError('schema','Saved About Us content needs owner review.');}
}
export function publicAbout(v:AboutSettings):PublicAbout {const {heading,intro,storyHeading,story}=v;return {heading,intro,storyHeading,story,founder:v.showFounder?{name:v.founderName,role:v.founderRole,bio:v.founderBio,photo:v.photo?(({url,alt,focalX,focalY,width,height})=>({url,alt,focalX,focalY,width,height}))(v.photo):null}:null};}

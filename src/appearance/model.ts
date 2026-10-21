import {ProductError,type ProductImage} from '../products/model.ts';
export type Device='desktop'|'mobile';
export interface LoginImageInput {mediaId:string;alt:string;focalX:number;focalY:number}
export interface LoginImage extends LoginImageInput {url:string;width:number;height:number}
export interface AppearanceInput {desktop:LoginImageInput|null;mobile:LoginImageInput|null}
export interface Appearance {desktop:LoginImage|null;mobile:LoginImage|null;revision:number}
export const emptyAppearance=():Appearance=>({desktop:null,mobile:null,revision:0});
export const appearanceInput=(value:Appearance):AppearanceInput=>Object.fromEntries((['desktop','mobile'] as const).map(device=>[device,value[device]?(({mediaId,alt,focalX,focalY})=>({mediaId,alt,focalX,focalY}))(value[device]!):null])) as unknown as AppearanceInput;
export function validateAppearance(value:unknown):AppearanceInput {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='desktop,mobile')throw new ProductError('invalid','Choose desktop and mobile appearance settings.');
  const result:AppearanceInput={desktop:null,mobile:null};
  for(const device of ['desktop','mobile'] as const){
    const item=(value as AppearanceInput)[device];if(item===null)continue;
    if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).sort().join(',')!=='alt,focalX,focalY,mediaId'||typeof item.mediaId!=='string'||!/^[a-f0-9]{32}$/.test(item.mediaId)||typeof item.alt!=='string'||item.alt.length>200||/[\x00-\x1f\x7f]/.test(item.alt)||![item.focalX,item.focalY].every(n=>Number.isInteger(n)&&n>=0&&n<=100))throw new ProductError('invalid','Use verified images, alt text up to 200 characters and focal points between 0 and 100.');
    result[device]={mediaId:item.mediaId,alt:item.alt.trim(),focalX:item.focalX,focalY:item.focalY};
  }
  return result;
}
export function loginImage(input:LoginImageInput,metadata:Omit<ProductImage,'mediaId'|'alt'>):LoginImage {
  return {...input,url:metadata.url,width:metadata.width,height:metadata.height};
}

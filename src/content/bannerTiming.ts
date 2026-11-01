import {ProductError} from '../products/model.ts';
export const DEFAULT_BANNER_SECONDS=3;
export function bannerSeconds(value:unknown){return Number.isInteger(value)&&Number(value)>=2&&Number(value)<=15?Number(value):DEFAULT_BANNER_SECONDS;}
export function validateBannerTiming(value:unknown):{seconds:number}{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='seconds')||!Number.isInteger((value as {seconds?:unknown}).seconds)||Number((value as {seconds?:unknown}).seconds)<2||Number((value as {seconds?:unknown}).seconds)>15)throw new ProductError('invalid','Time per banner must be a whole number from 2 to 15 seconds.');return {seconds:(value as {seconds:number}).seconds};}

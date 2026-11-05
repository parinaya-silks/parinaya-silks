import {ProductError} from '../products/model.ts';
export const themes=['classic-cream','light-maroon'] as const;
export type StoreTheme=typeof themes[number];
export type ThemeSettings={theme:StoreTheme;revision:number};
export const defaultTheme:ThemeSettings={theme:'classic-cream',revision:0};
export function themeInput(value:unknown):{theme:StoreTheme}{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!themes.includes((value as any).theme))throw new ProductError('invalid','Choose Classic Cream or Light Maroon.');return {theme:(value as {theme:StoreTheme}).theme};}
export function savedTheme(value:any):ThemeSettings{if(value===undefined)return {...defaultTheme};if(value.schemaVersion!==1||!Number.isSafeInteger(value.revision)||value.revision<1)throw new ProductError('schema','Storefront appearance needs owner review.');return {...themeInput({theme:value.theme}),revision:value.revision};}
export function publicTheme(value:unknown):ThemeSettings{try{return savedTheme(value);}catch{return {...defaultTheme};}}

import type {PublicProductRecord} from '../products/model.ts';
import {ProductError} from '../products/model.ts';

export const SHOPPING_LIMIT=100;
export interface SavedItem {id:string;productId:string;variantId:string|null;quantity:number}
export interface ShoppingItem extends SavedItem {product:PublicProductRecord|null;stock:number;variantName:string;reason:string|null}
export interface ShoppingData {bag:ShoppingItem[];wishlist:ShoppingItem[]}
export function productId(value:unknown):string {if(typeof value!=='string'||!/^[A-Za-z0-9]{20}$/.test(value))throw new ProductError('invalid','Invalid product reference.');return value;}
export function variantId(value:unknown):string|null {if(value===null)return null;if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(value))throw new ProductError('invalid','Invalid colour reference.');return value;}
export const bagId=(product:string,variant:string|null)=>`${product}--${variant===null?'simple':'v-'+variant}`;
export function positiveQuantity(value:unknown):number {if(!Number.isSafeInteger(value)||(value as number)<1||(value as number)>1000000)throw new ProductError('invalid','Use a whole quantity from 1 to 1,000,000.');return value as number;}
export function resolveItem(item:SavedItem,product:PublicProductRecord|null,bag:boolean):ShoppingItem {
  const variant=product?.inventory.variants?.find(value=>value.id===item.variantId);
  const valid=!!product&&(!bag||(product.inventory.mode==='simple'?item.variantId===null:!!variant));
  const stock=valid?(product!.inventory.mode==='simple'?product!.inventory.quantity||0:bag?variant!.quantity:(product!.inventory.variants||[]).reduce((sum,value)=>sum+value.quantity,0)):0;
  return {...item,product,stock,variantName:variant?.name||'',reason:!product?'This product is no longer available.':!valid?'This colour is no longer available.':stock===0?'Currently out of stock.':bag&&item.quantity>stock?`Only ${stock} available. Reduce the quantity to include this item in your subtotal.`:null};
}
export const subtotalPaise=(items:ShoppingItem[])=>items.reduce((sum,item)=>sum+(!item.reason&&item.product?BigInt(item.quantity)*BigInt(item.product.pricePaise):0n),0n);
export function money(paise:number|bigint){
  // BigInt keeps the bounded catalogue's largest possible subtotal exact.
  if(typeof paise==='bigint')return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:0}).format(paise/100n)+'.'+String(paise%100n).padStart(2,'0');
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(paise/100);
}

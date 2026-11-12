import type {Firestore,Transaction} from 'firebase-admin/firestore';
import {ProductError} from '../src/products/model.ts';
export function maintenanceSettings(raw:any){
 if(raw===undefined)return {enabled:false,revision:0};
 if(raw.schemaVersion!==1||typeof raw.enabled!=='boolean'||!Number.isSafeInteger(raw.revision)||raw.revision<1)throw new ProductError('unavailable','Store availability cannot be verified. Please try again.');
 return {enabled:raw.enabled,revision:raw.revision};
}
export async function assertStoreOpen(db:Firestore,tx?:Transaction){
 const ref=db.doc('siteSettings/maintenance'),doc=tx?await tx.get(ref):await ref.get();
 if(maintenanceSettings(doc.data()).enabled)throw new ProductError('unavailable','The website is under maintenance. Please try again soon.');
}

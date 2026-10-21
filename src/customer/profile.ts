import {normalizeMobile,mobileCountry} from './mobile.ts';
import {pendingProfile,clearPendingProfile} from './pendingProfile.ts';
import {doc,runTransaction,serverTimestamp,type Firestore} from 'firebase/firestore';

export interface CustomerProfile {uid:string;displayName:string;mobileNumber?:string}
export async function ensureCustomerProfile(database:Firestore,user:{uid:string;displayName:string|null},recoveryName?:string,recoveryMobile?:string):Promise<CustomerProfile> {
  const reference=doc(database,'customerProfiles',user.uid);
  const value=await runTransaction(database,async transaction=>{
    const existing=await transaction.get(reference);
    if(existing.exists()){
      const value=existing.data();
      if(value.uid!==user.uid||typeof value.displayName!=='string')throw new Error('Customer profile needs review.');
      return {uid:value.uid,displayName:value.displayName,...(typeof value.mobileNumber==='string'?{mobileNumber:value.mobileNumber}:{})};
    }
    const pending=pendingProfile(user.uid);
    const name=(recoveryName||user.displayName||pending?.displayName||'').trim();
    const mobileNumber=recoveryMobile||pending?.mobileNumber||'';
    const mobile=normalizeMobile(mobileNumber,mobileCountry(mobileNumber));
    if(!name||name.length>100||/[\x00-\x1f\x7f]/.test(name))throw new Error('A profile name is required.');
    transaction.set(reference,{uid:user.uid,displayName:name,mobileNumber:mobile,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    return {uid:user.uid,displayName:name,mobileNumber:mobile};
  });
  clearPendingProfile(user.uid);return value;
}

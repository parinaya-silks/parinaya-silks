import {setPersistence,browserLocalPersistence,browserSessionPersistence,createUserWithEmailAndPassword,signInWithEmailAndPassword,updateProfile,sendPasswordResetEmail,validatePassword} from 'firebase/auth';
import {getAuthClients} from '../services/firebase/auth.ts';
import {CustomerError,passwordPolicyMessage,validateCustomerFields} from './policy.ts';
import {normalizeMobile,type CountryCode} from './mobile.ts';
import {rememberPendingProfile} from './pendingProfile.ts';
import {customerAction} from '../orders/client.ts';
import {ensureCustomerProfile} from './profile.ts';

function actionSettings(path:string){return {url:new URL(path,window.location.origin).href,handleCodeInApp:false};}
export async function customerSignIn(email:string,password:string,remember:boolean) {
  const auth=getAuthClients().auth;
  if(auth.currentUser)throw new CustomerError('You are already signed in. Open your account or sign out first.');
  await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);
  if(auth.currentUser)throw new CustomerError('Your session changed. Open your account before continuing.');
  return signInWithEmailAndPassword(auth,validateCustomerFields({email,password}),password);
}
export async function customerRegister(name:string,email:string,password:string,confirm:string,mobileNumber:string,country:CountryCode) {
  const {auth,database}=getAuthClients();
  if(auth.currentUser)throw new CustomerError('You are already signed in. Open your account or sign out first.');
  const cleanEmail=validateCustomerFields({name,email,password,confirm},true);
  const mobile=normalizeMobile(mobileNumber,country);
  const policy=await validatePassword(auth,password);
  if(!policy.isValid)throw new CustomerError('Please check your password.',{password:passwordPolicyMessage(policy)});
  if(auth.currentUser)throw new CustomerError('Your session changed. Open your account before continuing.');
  await setPersistence(auth,browserSessionPersistence);
  if(auth.currentUser)throw new CustomerError('Your session changed. Open your account before continuing.');
  const {user}=await createUserWithEmailAndPassword(auth,cleanEmail,password);
  rememberPendingProfile(user.uid,{displayName:name.trim(),mobileNumber:mobile});
  // Account creation has succeeded. Never retry registration or delete the
  // account because a later profile operation fails.
  let nameSaved=true,profileSaved=true;
  try{await updateProfile(user,{displayName:name.trim()});}catch{nameSaved=false;}
  try{await ensureCustomerProfile(database,user,name,mobile);}catch{profileSaved=false;}
  if(profileSaved)void customerAction(user.uid,{action:'profile:syncDirectory'}).catch(()=>{});
  return {user,nameSaved,profileSaved};
}
export async function customerPasswordReset(email:string) {
  const clean=validateCustomerFields({email});
  try{await sendPasswordResetEmail(getAuthClients().auth,clean,actionSettings('/login'));}
  catch(error){if((error as {code?:string}).code!=='auth/user-not-found')throw error;}
}

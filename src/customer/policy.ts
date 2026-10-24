import type {PasswordValidationStatus} from 'firebase/auth';

export class CustomerError extends Error {
  constructor(message:string,public fields:Record<string,string>={}){super(message);this.name='CustomerError';}
}
export const customerAuthPaths=['/login','/register','/forgot-password','/verify-email'];
export function safeCustomerReturn(value:string|null|undefined):string {
  if(!value||value.length>1500||!value.startsWith('/')||value.startsWith('//')||/[\\\x00-\x20\x7f#]/.test(value))return '/account';
  let decoded:string;
  try{decoded=decodeURIComponent(value);}catch{return '/account';}
  if(/[\\\x00-\x1f\x7f#]/.test(decoded)||decoded.startsWith('//')||/%[0-9a-f]{2}/i.test(decoded))return '/account';
  const path=decoded.split('?')[0];
  // Return only to implemented public browsing/account routes. No admin or
  // recursive auth returns, payment endpoints, schemes or traversal segments.
  if(/^\/(?:account\/orders|order-tracking\/[a-f0-9]{32}|order-confirmed\/[a-f0-9]{32})$/.test(path))return new URLSearchParams(value.split('?')[1]||'').has('returnTo')?'/account':value;
  if(/^\/checkout\/(?:delivery|summary|payment)$/.test(path))return new URLSearchParams(value.split('?')[1]||'').has('returnTo')?'/account':value;
  if(path==='/account/addresses')return new URLSearchParams(value.split('?')[1]||'').has('returnTo')?'/account':value;
  if(!/^(?:\/|\/(?:account|checkout|shop|collections|sale|search|wishlist|bag|about|contact|shipping-policy|returns-policy|privacy-policy|terms-conditions)|\/(?:product|collections|sale)\/[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(path))return '/account';
  if(new URLSearchParams(value.split('?')[1]||'').has('returnTo'))return '/account';
  return value;
}
export function validateCustomerFields(values:{email:string;password?:string;name?:string;confirm?:string},register=false) {
  const fields:Record<string,string>={};
  const email=values.email.trim();
  if(!email||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fields.email='Enter a valid email address.';
  if(values.password!==undefined&&!values.password)fields.password='Enter your password.';
  if(register){if(!values.name?.trim()||values.name.trim().length>100||/[\x00-\x1f\x7f]/.test(values.name))fields.name='Enter your name, up to 100 characters.';if(values.password!==values.confirm)fields.confirm='The passwords do not match.';}
  if(Object.keys(fields).length)throw new CustomerError('Please check the highlighted fields.',fields);
  return email;
}
export function passwordPolicyMessage(status:PasswordValidationStatus):string {
  const unmet:string[]=[];
  if(status.meetsMinPasswordLength===false)unmet.push('at least '+status.passwordPolicy.customStrengthOptions.minPasswordLength+' characters');
  if(status.meetsMaxPasswordLength===false)unmet.push('no more than '+status.passwordPolicy.customStrengthOptions.maxPasswordLength+' characters');
  for(const [key,label]of [['containsLowercaseLetter','a lowercase letter'],['containsUppercaseLetter','an uppercase letter'],['containsNumericCharacter','a number'],['containsNonAlphanumericCharacter','a symbol']] as const)if(status[key]===false)unmet.push(label);
  return unmet.length?'Use '+unmet.join(', ')+'.':'Choose a password that meets the store’s password policy.';
}
export function customerErrorMessage(error:unknown):string {
  if(error instanceof CustomerError)return error.message;
  const code=(error as {code?:string})?.code;
  if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-login-credentials'].includes(code||''))return 'Unable to sign in with those details. Check your email and password.';
  if(code==='auth/email-already-in-use')return 'An account with this email already exists. Sign in or reset your password.';
  if(code==='auth/network-request-failed'||code==='unavailable')return 'Unable to connect. Check your internet connection and try again.';
  if(code==='auth/too-many-requests')return 'Too many attempts. Please wait a little and try again.';
  if(code==='auth/user-disabled')return 'This account is unavailable. Please contact the store owner.';
  if(['auth/weak-password','auth/password-does-not-meet-requirements'].includes(code||''))return 'Choose a password that meets the store’s password policy.';
  if(['auth/operation-not-allowed','auth/unauthorized-domain','auth/invalid-api-key','auth/app-not-authorized'].includes(code||''))return 'Customer sign-in is unavailable. Please contact the store owner.';
  return 'Unable to complete this request. Please try again.';
}

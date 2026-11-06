import {ProductError} from '../../src/products/model.ts';

export interface PaymentConfig {mode:'test'|'live';keyId:string;keySecret:string;webhookSecret:string}
export function paymentConfig(env:NodeJS.ProcessEnv=process.env):PaymentConfig {
 const mode=env.RAZORPAY_MODE;
 if(mode!=='test'&&mode!=='live')throw new ProductError('configuration','Online payments are not configured.');
 const keyId=env.RAZORPAY_KEY_ID||'',keySecret=env.RAZORPAY_KEY_SECRET||'',webhookSecret=env.RAZORPAY_WEBHOOK_SECRET||'';
 if(!new RegExp('^rzp_'+mode+'_[A-Za-z0-9]{8,64}$').test(keyId)||![keySecret,webhookSecret].every(v=>v.length>=16&&v.length<=512&&v===v.trim()&&!/[\r\n]/.test(v)))throw new ProductError('configuration','Online payments are not configured.');
 return {mode,keyId,keySecret,webhookSecret};
}
export function initiationAllowed(config:PaymentConfig,uid:string,env:NodeJS.ProcessEnv=process.env){
 if(config.mode==='live')return env.RAZORPAY_LIVE_ACTIVATED==='true';
 const allowed=(env.RAZORPAY_TEST_UIDS||'').split(',').map(v=>v.trim()).filter(Boolean);
 return allowed.includes(uid)||(env.RAZORPAY_TEST_ENVIRONMENT==='true'&&env.VERCEL_ENV!=='production'&&env.NODE_ENV!=='production');
}

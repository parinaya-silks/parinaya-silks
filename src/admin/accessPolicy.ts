import {contentSections} from '../content/sections.ts';
import {customerUid} from './customers/model.ts';
export function isAdminLocation(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

export function safeAdminDestination(value: string): string {
  if (/^\/admin(?:\/(?:dashboard|login|orders|products|categories|customers|coupons|inventory|marketing|banners|website-content|contact-information|about|enquiries|settings))?$/.test(value)) return value;
  if(contentSections.some(s=>value==='/admin/website-content/'+s.id))return value;
  if(/^\/admin\/marketing\/(?:new|edit\/[a-f0-9]{32})$/.test(value))return value;
  if(value.startsWith('/admin/customers/')){try{customerUid(decodeURIComponent(value.slice('/admin/customers/'.length)));if(!/[?#]/.test(value))return value;}catch{}}
  if (/^\/admin\/orders\/[a-zA-Z0-9_-]+$/.test(value)) return value;
  if (/^\/admin\/products\/(?:new|edit\/[a-zA-Z0-9_-]+)$/.test(value)) return value;
  return '/admin/dashboard';
}

export function hasAdminClaim(claims: Record<string, unknown>, expiresAt: string, now = Date.now()): boolean {
  return claims.admin === true && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) > now;
}

export function adminErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(code)) return 'Unable to sign in with those details. Check your email and password.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait before trying again.';
  if (code === 'auth/network-request-failed') return 'Unable to reach the sign-in service. Check your connection and try again.';
  if (code === 'auth/user-disabled') return 'This account is unavailable. Contact the store owner.';
  if (['auth/operation-not-allowed', 'auth/unauthorized-domain', 'auth/invalid-api-key', 'auth/app-not-authorized'].includes(code)) return 'Administrator sign-in is not configured correctly. Contact the site owner.';
  return 'Unable to verify administrator access. Please try again or contact the store owner.';
}

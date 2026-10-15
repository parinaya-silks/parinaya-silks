export const ADMIN_PROJECT = 'parinaya-silks';
export const FIRST_ADMIN_EMAIL = 'parinayasilks.in@gmail.com';

export function prepareAdminProvisioning(user: { uid: string; email?: string; disabled?: boolean; customClaims?: Record<string, unknown> }, options: { action: 'grant' | 'revoke'; confirmUid?: string; confirmEmail?: string; apply: boolean }) {
  if (!user.uid || user.email?.toLowerCase() !== FIRST_ADMIN_EMAIL || (options.action === 'grant' && user.disabled)) throw new Error('The existing account must match the approved email and be enabled before granting access.');
  if (options.apply && (options.confirmUid !== user.uid || options.confirmEmail?.toLowerCase() !== FIRST_ADMIN_EMAIL)) throw new Error('UID and email confirmation must exactly match the resolved account. No changes were made.');
  const claims = { ...user.customClaims };
  if (options.action === 'grant') claims.admin = true;
  else delete claims.admin;
  return { uid: user.uid, email: user.email, claims, enabled: options.action === 'grant' };
}

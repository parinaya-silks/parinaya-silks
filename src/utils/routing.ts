export function normalizePath(path: string): string {
  const [pathname, query = ''] = path.split('?');
  if (pathname === '/policies') {
    const tab = new URLSearchParams(query).get('tab');
    return ({ shipping: '/shipping-policy', returns: '/returns-policy', privacy: '/privacy-policy', terms: '/terms-conditions' })[tab || 'shipping'] || '/shipping-policy';
  }
  if (pathname === '/verify-email') return '/verify-email';
  if (pathname.startsWith('/account/orders/')) return pathname.replace('/account/orders/', '/order-tracking/');
  return path;
}

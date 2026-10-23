// Read failures must not use the uncertain-mutation recovery instructions.
export function customerFailureMessage(action:unknown):string{
 if(action==='orders:list')return 'We couldn’t load your orders. Please try again.';
 if(action==='orders:review')return 'Unable to load checkout review. Please try again.';
 return 'Unable to confirm this request. Retry safely or check your order history.';
}

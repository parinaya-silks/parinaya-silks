import {paymentHandler,paymentWebHandler} from '../../server/payments/http.ts';

// Use Web exports: legacy Vercel body helpers must not parse webhook JSON.
async function initialize(){
 const [{serverFirebase},{catalogService},{cloudinaryMedia},{paymentService}]=await Promise.all([import('../../server/firebase.ts'),import('../../server/catalog.ts'),import('../../server/cloudinary.ts'),import('../../server/payments/service.ts')]);
 const firebase=serverFirebase(),catalog=catalogService({...firebase,media:cloudinaryMedia()});
 return paymentService(firebase.database,catalog.paymentContext);
}
export const GET=paymentWebHandler(initialize);
export const POST=GET;
// Loopback development server only; the hosted builder selects GET/POST exports.
export const nodeHandler=paymentHandler(initialize);

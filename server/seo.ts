import type {Firestore} from 'firebase-admin/firestore';
const origin='https://parinayasilks.vercel.app';
export async function sitemap(db:Firestore){
 const categories=await db.collection('categories').where('enabled','==',true).limit(1000).get(),enabled=new Set(categories.docs.map(doc=>doc.id)),products=await db.collection('products').where('status','==','Published').limit(1000).get(),paths=['/','/shop','/collections','/sale','/about','/contact','/shipping-policy','/returns-policy','/privacy-policy','/terms-conditions'];
 for(const doc of categories.docs)if(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.data().slug))paths.push('/collections/'+doc.data().slug);
 for(const doc of products.docs)if(enabled.has(doc.data().categoryId)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.data().slug))paths.push('/product/'+doc.data().slug);
 return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+origin+path+'</loc></url>').join('')+'</urlset>';
}

import {FieldPath,type Firestore,type Query,type DocumentSnapshot} from 'firebase-admin/firestore';
import {ProductError,type PublicProductRecord} from '../src/products/model.ts';
import {discoveryFilters} from '../src/products/discovery.ts';
import {discoveryPage} from './discovery.ts';
export const MAX_DISCOVERY_PRODUCTS=5000;
export function browseService(db:Firestore,present:(doc:DocumentSnapshot,categoryName?:string)=>Promise<PublicProductRecord>){return async(parameters:Record<string,string>)=>{
 const filters=discoveryFilters(parameters);let query:Query=db.collection('products').where('status','==','Published');
 if(filters.category){const categories=await db.collection('categories').where('slug','==',filters.category).where('enabled','==',true).limit(2).get();if(categories.size!==1)throw new ProductError('not-found','Category unavailable.');query=query.where('categoryId','==',categories.docs[0].id);}
 if(filters.sort.startsWith('price-'))query=query.orderBy('pricePaise',filters.sort==='price-asc'?'asc':'desc');else if(filters.sort==='featured')query=query.orderBy('featured','desc');
 query=query.orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
 // Bounded server-only scan: never return a partial page/count as a complete result.
 // A readonly transaction pins source/category eligibility across scan batches.
 const docs:DocumentSnapshot[]=[],categoryMap=new Map<string,FirebaseFirestore.DocumentData>();
 await db.runTransaction(async tx=>{docs.length=0;categoryMap.clear();let after:DocumentSnapshot|undefined;
  for(;;){const page=await tx.get((after?query.startAfter(after):query).limit(200));docs.push(...page.docs);if(docs.length>MAX_DISCOVERY_PRODUCTS)throw new ProductError('unavailable','Catalog discovery exceeds its supported scope. Contact the store owner.');if(page.size<200)break;after=page.docs.at(-1);}
  const ids=[...new Set(docs.map(d=>d.get('categoryId')).filter(id=>typeof id==='string'&&/^[A-Za-z0-9]{20}$/.test(id)))];
  for(let i=0;i<ids.length;i+=200){const categories=await tx.getAll(...ids.slice(i,i+200).map(id=>db.doc('categories/'+id)));for(const c of categories)if(c.data()?.enabled===true)categoryMap.set(c.id,c.data()!);}
 },{readOnly:true});
 const rows=docs.filter(doc=>categoryMap.has(doc.get('categoryId'))).map(doc=>({...doc.data(),id:doc.id,categoryName:categoryMap.get(doc.get('categoryId'))!.name,updatedAt:doc.get('updatedAt')?.toMillis?.()??null}) as unknown as PublicProductRecord);
 const result=discoveryPage(rows,filters,parameters.cursor,filters.category||'catalog');const byId=new Map(docs.map(d=>[d.id,d]));
 return {...result,items:await Promise.all(result.items.map(p=>present(byId.get(p.id)!,p.categoryName)))};
 };}

import {FieldPath,type Firestore,type Query,type DocumentSnapshot} from 'firebase-admin/firestore';
import {ProductError,type PublicProductRecord,quantity} from '../src/products/model.ts';
import {text} from '../src/orders/model.ts';
export function browseService(db:Firestore,present:(doc:DocumentSnapshot,categoryName?:string)=>Promise<PublicProductRecord>){return async(parameters:Record<string,string>)=>{
 const allowed=['browse','cursor','q','category','sort','maxPrice','colors','inStock','sale'];if(Object.keys(parameters).some(key=>!allowed.includes(key)))throw new ProductError('invalid','Unsupported browse filter.');
 const q=text(parameters.q||'',100).toLocaleLowerCase(),colors=text(parameters.colors||'',500).toLowerCase().split('|').filter(Boolean),sort=parameters.sort||'featured';if(!['featured','newest','price-asc','price-desc'].includes(sort)||colors.length>20)throw new ProductError('invalid','Invalid sort or colour filter.');
 const maxPrice=parameters.maxPrice===undefined?null:Number(parameters.maxPrice);if(maxPrice!==null&&(!Number.isSafeInteger(maxPrice)||maxPrice<0||maxPrice>100000000))throw new ProductError('invalid','Invalid price filter.');
 let query:Query=db.collection('products').where('status','==','Published');
 if(parameters.category){const slug=text(parameters.category,100,true);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new ProductError('invalid','Invalid category.');const category=await db.collection('categories').where('slug','==',slug).where('enabled','==',true).limit(1).get();if(category.empty)return {items:[],nextCursor:null};query=query.where('categoryId','==',category.docs[0].id);}
 if(sort.startsWith('price-'))query=query.orderBy('pricePaise',sort==='price-asc'?'asc':'desc');else if(sort==='featured')query=query.orderBy('featured','desc');
 query=query.orderBy('createdAt','desc').orderBy(FieldPath.documentId(),'desc');
 if(parameters.cursor){if(!/^[A-Za-z0-9]{20}$/.test(parameters.cursor))throw new ProductError('invalid','Invalid product cursor.');const cursor=await db.doc('products/'+parameters.cursor).get();if(!cursor.exists)throw new ProductError('invalid','Invalid product cursor.');query=query.startAfter(cursor);}
 // Bounded scan supports substring/colour filters without an external search
 // service. A next cursor can accompany an empty page; never claim exhaustion.
 const page=await query.limit(200).get(),ids=[...new Set(page.docs.map(doc=>doc.data().categoryId).filter(id=>typeof id==='string'&&/^[A-Za-z0-9]{20}$/.test(id)))],categories=ids.length?await db.getAll(...ids.map(id=>db.doc('categories/'+id))):[],byId=new Map(categories.map(doc=>[doc.id,doc.data()])),items:PublicProductRecord[]=[];
 let consumed=0,last:string|null=null;for(const doc of page.docs){consumed++;last=doc.id;const raw=doc.data(),category=byId.get(raw.categoryId);if(category?.enabled!==true)continue;const item=await present(doc,category.name);if(q&&![item.name,item.description,item.sku,item.categoryName,item.fabric,item.weaveType,item.colorName].join(' ').toLocaleLowerCase().includes(q))continue;if(maxPrice!==null&&item.pricePaise>maxPrice)continue;if(parameters.sale==='true'&&(!item.originalPricePaise||item.originalPricePaise<=item.pricePaise))continue;if(parameters.inStock==='true'&&quantity(item)<=0)continue;if(colors.length&&!colors.some(color=>[item.colorName,...(item.inventory.variants||[]).map(variant=>variant.name)].some(name=>name.toLowerCase()===color)))continue;items.push(item);if(items.length===50)break;}
 return {items,nextCursor:consumed<page.size||page.size===200?last:null};
 };}

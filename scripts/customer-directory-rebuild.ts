// Explicit maintenance tool. It never edits profiles, authentication users or orders.
import {readFileSync} from 'node:fs';
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getAuth,type Auth} from 'firebase-admin/auth';
import {getFirestore,FieldPath,FieldValue,type Firestore} from 'firebase-admin/firestore';
import {directoryContact} from '../server/customerDirectory.ts';
export async function rebuildCustomerDirectory(db:Firestore,auth:Pick<Auth,'getUser'>){
 let after:string|undefined,processed=0;
 do{let query=db.collection('customerProfiles').orderBy(FieldPath.documentId()).limit(50);if(after)query=query.startAfter(after);const page=await query.get();
  for(const profile of page.docs){let email:string|null=null,joinedAt:number|null=null;try{const user=await auth.getUser(profile.id);email=user.email||null;joinedAt=Date.parse(user.metadata.creationTime)||null;}catch(error){if((error as {code:string}).code!=='auth/user-not-found')throw error;}
   let cursor:string|undefined,orderCount=0,itemsOrdered:number|null=0,latestOrderAt:any=null,latestOrderId:string|null=null,latestOrderReference:string|null=null;
   do{let orders=db.collection('orders').where('uid','==',profile.id).orderBy(FieldPath.documentId()).select('items','createdAt','reference').limit(200);if(cursor)orders=orders.startAfter(cursor);const chunk=await orders.get();
    for(const order of chunk.docs){orderCount++;const data=order.data(),quantity=Array.isArray(data.items)?data.items.reduce((sum:number,item:any)=>Number.isSafeInteger(item.quantity)&&item.quantity>0?sum+item.quantity:NaN,0):NaN;itemsOrdered=itemsOrdered!==null&&Number.isSafeInteger(quantity)?itemsOrdered+quantity:null;
     if(data.createdAt?.toMillis&&(latestOrderAt===null||data.createdAt.toMillis()>latestOrderAt.toMillis()||(data.createdAt.toMillis()===latestOrderAt.toMillis()&&order.id>(latestOrderId||'')))){latestOrderAt=data.createdAt;latestOrderId=order.id;latestOrderReference=typeof data.reference==='string'?data.reference:null;}
    }cursor=chunk.size===200?chunk.docs.at(-1)!.id:undefined;
   }while(cursor);
   // Reject concurrent profile/order changes instead of certifying a partial rebuild.
   await db.runTransaction(async tx=>{const [current,orders]=await Promise.all([tx.get(profile.ref),tx.get(db.collection('orders').where('uid','==',profile.id).count())]);if(!current.exists||current.updateTime?.isEqual(profile.updateTime!)!==true||orders.data().count!==orderCount)throw Error('Source changed during directory preparation. Rerun safely.');tx.set(db.doc('customerDirectory/'+profile.id),{...directoryContact(profile.data(),email,joinedAt),orderCount,itemsOrdered,hasOrders:orderCount>0,latestOrderAt,latestOrderId,latestOrderReference,syncedAt:FieldValue.serverTimestamp()});});processed++;
  }after=page.size===50?page.docs.at(-1)!.id:undefined;
 }while(after);return {processed};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/customer-directory-rebuild.ts')){
 const local=process.argv.includes('--emulator'),apply=process.argv.includes('--apply'),path=process.argv[process.argv.indexOf('--credentials')+1];
 if(!apply)throw Error('Explicit --apply is required. This tool writes only the private directory read model.');
 let credential;if(local){if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required.');}
 else{if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.argv.includes('--credentials'))throw Error('Explicit trusted --credentials path required; do not paste keys.');const key=JSON.parse(readFileSync(path,'utf8'));if(key.project_id!=='parinaya-silks'||key.type!=='service_account')throw Error('Credential project mismatch');credential=cert(key);}
 const app=initializeApp({projectId:'parinaya-silks',...(credential?{credential}:{})},'directory-maintenance');
 try{console.log(JSON.stringify(await rebuildCustomerDirectory(getFirestore(app,'(default)'),getAuth(app))));}catch(error){console.error(JSON.stringify({error:'Directory preparation failed',code:(error as {code?:string}).code||'unknown'}));process.exitCode=1;}finally{await deleteApp(app);}
}

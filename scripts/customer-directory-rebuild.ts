// Explicit maintenance tool. It never edits profiles, authentication users or orders.
import {readFileSync} from 'node:fs';
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getAuth,type Auth} from 'firebase-admin/auth';
import {getFirestore,FieldPath,FieldValue,type Firestore} from 'firebase-admin/firestore';
import {directoryContact} from '../server/customerDirectory.ts';
export async function rebuildCustomerDirectory(db:Firestore,auth:Pick<Auth,'getUser'>,options:{dryRun?:boolean;verify?:boolean}={}){
 let after:string|undefined,processed=0,missingAuth=0,unknownQuantities=0,mismatches=0;
 do{let query=db.collection('customerProfiles').orderBy(FieldPath.documentId()).limit(50);if(after)query=query.startAfter(after);const page=await query.get();
  for(const profile of page.docs){let email:string|null=null,joinedAt:number|null=null;try{const user=await auth.getUser(profile.id);email=user.email||null;joinedAt=Date.parse(user.metadata.creationTime)||null;}catch(error){if((error as {code:string}).code!=='auth/user-not-found')throw error;missingAuth++;}
   // Read the current profile, directory and every order page in one transaction.
   // This prevents a scan/count race and conflicts with concurrent application
   // profile/order synchronization. Retries recompute, rather than reuse totals.
   const unknown=await db.runTransaction(async tx=>{
   const directory=db.doc('customerDirectory/'+profile.id);
   const [current,previous]=await Promise.all([tx.get(profile.ref),tx.get(directory)]);
   if(!current.exists)throw Error('Source profile removed during preparation; owner review required.');
   let cursor:string|undefined,orderCount=0,itemsOrdered:number|null=0,latestOrderAt:any=null,latestOrderId:string|null=null,latestOrderReference:string|null=null;
   do{let orders=db.collection('orders').where('uid','==',profile.id).orderBy(FieldPath.documentId()).select('items','createdAt','reference').limit(200);if(cursor)orders=orders.startAfter(cursor);const chunk=await tx.get(orders);
    for(const order of chunk.docs){orderCount++;const data=order.data(),quantity=Array.isArray(data.items)?data.items.reduce((sum:number,item:any)=>Number.isSafeInteger(item.quantity)&&item.quantity>0?sum+item.quantity:NaN,0):NaN;itemsOrdered=itemsOrdered!==null&&Number.isSafeInteger(quantity)&&Number.isSafeInteger(itemsOrdered+quantity)?itemsOrdered+quantity:null;
     if(data.createdAt?.toMillis&&(latestOrderAt===null||data.createdAt.toMillis()>latestOrderAt.toMillis()||(data.createdAt.toMillis()===latestOrderAt.toMillis()&&order.id>(latestOrderId||'')))){latestOrderAt=data.createdAt;latestOrderId=order.id;latestOrderReference=typeof data.reference==='string'?data.reference:null;}
    }cursor=chunk.size===200?chunk.docs.at(-1)!.id:undefined;
    if(orderCount>10000)throw Error('Per-customer preparation bound exceeded; owner review required.');
   }while(cursor);
   const derived={...directoryContact(current.data(),email,joinedAt),orderCount,itemsOrdered,hasOrders:orderCount>0,latestOrderAt,latestOrderId,latestOrderReference};
   if(!options.dryRun&&!options.verify)tx.set(directory,{...derived,syncedAt:FieldValue.serverTimestamp()},{merge:true});
   return {unknown:itemsOrdered===null,mismatch:!previous.exists||Object.entries(derived).some(([field,value])=>JSON.stringify(previous.get(field))!==JSON.stringify(value))};
   },{maxAttempts:5});if(unknown.unknown)unknownQuantities++;if(unknown.mismatch)mismatches++;processed++;
  }after=page.size===50?page.docs.at(-1)!.id:undefined;
 }while(after);return {processed,missingAuth,unknownQuantities,mismatches,dryRun:!!options.dryRun||!!options.verify};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/customer-directory-rebuild.ts')){
 const local=process.argv.includes('--emulator'),apply=process.argv.includes('--apply'),dryRun=process.argv.includes('--dry-run'),path=process.argv[process.argv.indexOf('--credentials')+1];
 if(apply===dryRun)throw Error('Choose exactly one of --dry-run or --apply. This tool writes only the private directory read model.');
 let credential;if(local){if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required.');}
 else{if(process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.argv.includes('--credentials'))throw Error('Explicit trusted --credentials path required; do not paste keys.');const key=JSON.parse(readFileSync(path,'utf8'));if(key.project_id!=='parinaya-silks'||key.type!=='service_account')throw Error('Credential project mismatch');credential=cert(key);}
 const app=initializeApp({projectId:'parinaya-silks',...(credential?{credential}:{})},'directory-maintenance');
 try{console.log(JSON.stringify(await rebuildCustomerDirectory(getFirestore(app,'(default)'),getAuth(app),{dryRun})));}catch(error){console.error(JSON.stringify({error:'Directory preparation failed; rerun safely after resolving the cause',code:(error as {code?:string}).code||'unknown'}));process.exitCode=1;}finally{await deleteApp(app);}
}

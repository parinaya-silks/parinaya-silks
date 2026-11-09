// Create no records; delete ONLY nextCheckAt on revalidated terminal TEST attempts.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {initializeApp,cert,deleteApp} from 'firebase-admin/app';
import {getFirestore,FieldPath,FieldValue,type Firestore} from 'firebase-admin/firestore';
import {firebaseServiceAccount} from '../server/credentials.ts';
import {completedTestCapture} from '../server/payments/queue.ts';

export async function retireTestPaymentSchedules(db:Firestore,options:{apply?:boolean;expectedCount?:number}={}){
 // The installed SDK exposes projectId at runtime but omits it from its public typings.
 if((db as Firestore&{readonly projectId:string}).projectId!=='parinaya-silks'||db.databaseId!=='(default)')throw Error('Target must be parinaya-silks/(default).');
 let after:string|undefined,scanned=0;const candidates:string[]=[];
 do{
  let query=db.collection('paymentAttempts').where('mode','==','test').orderBy(FieldPath.documentId()).limit(100);
  if(after)query=query.startAfter(after);
  const page=await query.get();
  for(const attempt of page.docs){
   if(++scanned>1000)throw Error('Maintenance scan bound exceeded; no changes applied.');
   if(!Number.isSafeInteger(attempt.get('nextCheckAt')))continue;
   const order=await db.doc('orders/'+attempt.id).get();
   if(completedTestCapture(attempt.data(),order.exists?{...order.data(),id:order.id}:undefined))candidates.push(attempt.id);
  }
  after=page.size===100?page.docs.at(-1)!.id:undefined;
 }while(after);
 if(options.apply&&options.expectedCount!==candidates.length)throw Error('Candidate count differs from reviewed expected count; no changes applied.');
 let retired=0,changedSincePreview=0;
 if(options.apply)for(const id of candidates){
  const outcome=await db.runTransaction(async tx=>{
   const ref=db.doc('paymentAttempts/'+id),attempt=await tx.get(ref),order=await tx.get(db.doc('orders/'+id));
   if(!Number.isSafeInteger(attempt.get('nextCheckAt'))||!completedTestCapture(attempt.data(),order.exists?{...order.data(),id:order.id}:undefined))return false;
   tx.update(ref,{nextCheckAt:FieldValue.delete()});return true;
  },{maxAttempts:5});
  if(outcome)retired++;else changedSincePreview++;
 }
 return {project:'parinaya-silks',database:'(default)',dryRun:!options.apply,scanned,candidates:candidates.length,retired,changedSincePreview};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 let app;
 try{
  const args=process.argv.slice(2),apply=args.includes('--apply'),expected=args.find(v=>v.startsWith('--expected-count='));
  if(args.some(v=>v!=='--apply'&&v!=='--project=parinaya-silks'&&v!=='--database=(default)'&&v!==expected)
   ||!args.includes('--project=parinaya-silks')||!args.includes('--database=(default)')
   ||apply&&(!expected||!/^--expected-count=\d+$/.test(expected)))throw Error('Explicit target and reviewed --expected-count=N required for apply.');
  if(process.env.FIRESTORE_EMULATOR_HOST)throw Error('CLI maintenance requires the explicit production target, not an emulator.');
  const account=firebaseServiceAccount(process.env);if(!account)throw Error('Trusted Firebase credentials are required in the secure local environment.');
  app=initializeApp({projectId:'parinaya-silks',credential:cert(account)},'retire-test-payment-schedules');
  console.log(JSON.stringify(await retireTestPaymentSchedules(getFirestore(app,'(default)'),{apply,expectedCount:expected?Number(expected.split('=')[1]):undefined})));
 }catch(error){
  // SDK errors may include document identifiers. Emit only a code for these.
  console.error(JSON.stringify({operation:'retire-test-payment-schedules',failed:true,code:(error as {code?:unknown}).code||'maintenance-precondition',...((error as {code?:unknown}).code?{}:{message:(error as Error).message})}));process.exitCode=1;
 }finally{if(app)await deleteApp(app);}
}

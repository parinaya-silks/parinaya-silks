import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {initializeTestEnvironment,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc} from 'firebase/firestore';
import {serverFirebase} from '../server/firebase.ts';
import {catalogService} from '../server/catalog.ts';
import {catalogHandler} from '../server/handler.ts';
import type {Appearance} from '../src/appearance/model.ts';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Loopback emulators required.');
process.env.PARINAYA_SERVER_EMULATORS='true';
test('appearance uses dual administrator checks, isolated verified media, atomic publication and public projection',async()=>{
  const env=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}});
  const {database:db,auth}=serverFirebase(),users:string[]=[],tokens:Record<string,string>={};let fail=false;
  const service=catalogService({database:db,auth,media:{sign:ticket=>({public_id:ticket.publicId,signature:'synthetic'}),verify:async ticket=>{if(fail)throw new Error('Fixture verification failure');return {assetId:'verified',publicId:ticket.publicId,url:`https://res.cloudinary.com/parinaya-emulator/image/upload/v1/${ticket.publicId}.png`,width:1200,height:1500,bytes:1000,format:'png',version:1};}}});
  const server=createServer(catalogHandler(()=>service)).listen(0,'127.0.0.1');await once(server,'listening');const url='http://127.0.0.1:'+(server.address() as {port:number}).port+'/api/catalog';
  try{
    await env.clearFirestore();
    for(const [role,claim,enabled]of [['owner',true,true],['customer',false,false],['claim',true,false],['record',false,true]] as const){
      const uid='appearance-'+role,password=randomUUID()+'Aa9!';users.push(uid);await auth.createUser({uid,email:uid+'@example.test',password});await auth.setCustomUserClaims(uid,{admin:claim});if(enabled)await db.doc('adminAccess/'+uid).set({enabled:true});
      const response=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=synthetic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:uid+'@example.test',password,returnSecureToken:true})});tokens[role]=(await response.json()).idToken;
    }
    const call=(body:Record<string,unknown>,role='owner')=>service.privileged(tokens[role],body);
    const publicGet=async()=>{const response=await fetch(url+'?appearance=login');assert.equal(response.status,200);assert.match(response.headers.get('cache-control')||'',/no-store/);return response.json();};
    assert.deepEqual(await publicGet(),{desktop:null,mobile:null});
    for(const role of ['customer','claim','record'])for(const action of ['appearance:get','appearance:sign','appearance:verify','appearance:save'])await assert.rejects(call({action},role),{code:'permission'});
    const imageId='a'.repeat(32),sign={action:'appearance:sign',device:'desktop',mediaId:imageId,type:'image/png',size:1000};
    for(const invalid of [{...sign,public_id:'forged'},{...sign,type:'image/svg+xml'},{...sign,size:10485761},{...sign,device:'product'}])await assert.rejects(call(invalid),{code:'invalid'});
    const signed=await call(sign) as {public_id:string};assert.equal(signed.public_id,`parinaya-silks/login/desktop/${imageId}`);
    const image={mediaId:imageId,alt:'Owner',focalX:30,focalY:15},save={action:'appearance:save',appearance:{desktop:image,mobile:null},expectedRevision:0,operationId:'b'.repeat(32)};
    await assert.rejects(call(save),{code:'media'});
    await assert.rejects(call({action:'verify',productId:'p'.repeat(20),mediaId:imageId}),{code:'permission'});
    await assert.rejects(call({action:'appearance:verify',device:'mobile',mediaId:imageId}),{code:'permission'});
    fail=true;await assert.rejects(call({action:'appearance:verify',device:'desktop',mediaId:imageId}));fail=false;
    await call({action:'appearance:verify',device:'desktop',mediaId:imageId});assert.deepEqual(await publicGet(),{desktop:null,mobile:null},'Verification alone must not publish');
    const result=await call(save) as Appearance;assert.equal(result.revision,1);assert.equal((await call(save) as Appearance).revision,1,'Save retry is idempotent');
    const published=await publicGet();assert.equal(published.desktop.focalY,15);assert.equal(published.mobile,null);assert.deepEqual(Object.keys(published.desktop).sort(),['alt','focalX','focalY','height','url','width']);assert.ok(!JSON.stringify(published).includes('appearance-owner'));
    await assert.rejects(call({...save,operationId:'c'.repeat(32)}),{code:'conflict'});
    await db.doc('productMedia/'+'d'.repeat(32)).set({verified:true,productId:'p'.repeat(20),metadata:{}});
    await assert.rejects(call({...save,expectedRevision:1,operationId:'e'.repeat(32),appearance:{desktop:{...image,mediaId:'d'.repeat(32)},mobile:null}}),{code:'media'});
    for(const context of [env.unauthenticatedContext(),env.authenticatedContext('appearance-customer'),env.authenticatedContext('appearance-owner',{admin:true})])for(const path of ['siteSettings/loginAppearance','loginAppearanceMedia/'+imageId]){await assertFails(getDoc(doc(context.firestore(),path)));await assertFails(setDoc(doc(context.firestore(),path),{enabled:true}));}
    await db.doc('adminAccess/appearance-owner').update({enabled:false});await assert.rejects(call({...save,expectedRevision:1}),{code:'permission'});
    assert.equal((await db.doc('loginAppearanceMedia/'+imageId).get()).exists,true,'Replacement never deletes media');
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));for(const uid of users)await auth.deleteUser(uid);await env.clearFirestore();await env.cleanup();}
});

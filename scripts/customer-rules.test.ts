import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,getDocs,collection,setDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp,setLogLevel,type Firestore} from 'firebase/firestore';
import {ensureCustomerProfile} from '../src/customer/profile.ts';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080')throw new Error('Loopback emulator required.');
setLogLevel('silent');
test('UID-keyed profiles are idempotent, private, timestamped and unable to grant privileges',async()=>{
  const environment=await initializeTestEnvironment({projectId:'parinaya-silks',firestore:{host:'127.0.0.1',port:8080,rules:await readFile('firestore.rules','utf8')}});
  try {
    await environment.clearFirestore();
    const owner=environment.authenticatedContext('customer-owner',{email:'owner@example.test'}).firestore();
    const other=environment.authenticatedContext('customer-other').firestore();
    const guest=environment.unauthenticatedContext().firestore();
    const administrator=environment.authenticatedContext('profile-admin',{admin:true}).firestore();
    await environment.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'adminAccess/profile-admin'),{enabled:true});});
    const person={uid:'customer-owner',displayName:'Owner Name'};
    assert.deepEqual(await ensureCustomerProfile(owner as unknown as Firestore,person,undefined,'+919876543210'),{uid:person.uid,displayName:person.displayName,mobileNumber:'+919876543210'});
    const reference=doc(owner,'customerProfiles',person.uid),before=(await getDoc(reference)).data()!;
    assert.ok(before.createdAt instanceof Timestamp);assert.ok(before.updatedAt instanceof Timestamp);
    assert.deepEqual(Object.keys(before).sort(),['createdAt','displayName','mobileNumber','uid','updatedAt']);
    assert.equal((await ensureCustomerProfile(owner as unknown as Firestore,{...person,displayName:'Changed Auth Name'})).displayName,'Owner Name');
    assert.deepEqual((await getDoc(reference)).data(),before);
    for(const database of [other,guest,administrator])await assertFails(getDoc(doc(database,'customerProfiles',person.uid)));
    for(const database of [owner,other,guest,administrator])await assertFails(getDocs(collection(database,'customerProfiles')));
    await assertFails(updateDoc(reference,{displayName:'Overwrite'}));await assertFails(deleteDoc(reference));
    await assertFails(setDoc(doc(other,'customerProfiles',person.uid),{...before,displayName:'Stolen'}));
    const data={uid:'customer-other',displayName:'Other Customer',mobileNumber:'+919876543211',createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    for(const extra of [{admin:true},{role:'admin'},{emailVerified:true},{enabled:true},{accessLevel:'owner'},{password:'synthetic'},{token:'synthetic'},{uid:'someone-else'}])await assertFails(setDoc(doc(other,'customerProfiles/customer-other'),{...data,...extra}));
    await assertFails(setDoc(doc(other,'customerProfiles/customer-other'),{...data,createdAt:Timestamp.fromMillis(1)}));
    await assertFails(setDoc(doc(other,'customerProfiles/customer-other'),{...data,displayName:'   '}));
    await assertFails(setDoc(doc(other,'customerProfiles/customer-other'),{...data,displayName:'bad\nname'}));
    for(const mobileNumber of ['', '9876543210', '+911234567890', '+910123', '+000000000', 'invalid'])await assertFails(setDoc(doc(other,'customerProfiles/customer-other'),{...data,mobileNumber}));
    const {mobileNumber:omitted,...missingMobile}=data;await assertFails(setDoc(doc(other,'customerProfiles/customer-other'),missingMobile));
    await environment.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),'customerProfiles/legacy-customer'),{uid:'legacy-customer',displayName:'Legacy Customer',createdAt:Timestamp.fromMillis(1),updatedAt:Timestamp.fromMillis(1)});});
    const legacy=environment.authenticatedContext('legacy-customer').firestore();assert.deepEqual(await ensureCustomerProfile(legacy as unknown as Firestore,{uid:'legacy-customer',displayName:'Original name'}),{uid:'legacy-customer',displayName:'Legacy Customer'});
    await assertSucceeds(setDoc(doc(other,'customerProfiles/customer-other'),data));
    for(const path of ['adminAccess/customer-other','categories/unauthorized','products/unauthorized','orders/unauthorized','customers/unauthorized','siteSettings/loginAppearance','loginAppearanceMedia/unauthorized'])await assertFails(setDoc(doc(other,path),{enabled:true,admin:true}));
  }finally{await environment.clearFirestore();await environment.cleanup();}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp, setDoc, updateDoc, deleteDoc, setLogLevel, Timestamp } from 'firebase/firestore';
import { allocateCategoryId, createCategory, editCategory } from '../src/categories/repository.ts';
import type { Firestore } from 'firebase/firestore';
import type { Category, CategoryInput } from '../src/categories/model.ts';

if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Local Firestore emulator required.');
setLogLevel('silent');

test('categories persist with atomic unique slugs, strict administrator writes, public visibility and deletion protection', async () => {
  const environment = await initializeTestEnvironment({ projectId: 'parinaya-silks', firestore: { host: '127.0.0.1', port: 8080, rules: await readFile('firestore.rules','utf8') } });
  try {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async context => {
      for (const [uid,enabled] of [['category-admin',true],['category-revoked',false],['category-record-only',true]] as const) await setDoc(doc(context.firestore(),'adminAccess',uid),{enabled});
    });
    const admin=environment.authenticatedContext('category-admin',{admin:true}).firestore() as unknown as Firestore;
    const guest=environment.unauthenticatedContext().firestore() as unknown as Firestore;
    const customer=environment.authenticatedContext('category-customer',{}).firestore() as unknown as Firestore;
    const claimOnly=environment.authenticatedContext('category-claim-only',{admin:true}).firestore() as unknown as Firestore;
    const recordOnly=environment.authenticatedContext('category-record-only',{}).firestore() as unknown as Firestore;
    const revoked=environment.authenticatedContext('category-revoked',{admin:true}).firestore() as unknown as Firestore;
    const input: CategoryInput={name:'Emulator category',slug:'emulator-category',description:'Isolated test',enabled:true,displayOrder:4};
    const id=allocateCategoryId(admin);
    await createCategory(id,input,admin);
    const ref=doc(admin,'categories',id);
    const original=(await getDoc(ref)).data()!;
    assert.equal(original.name,input.name);
    assert.ok(original.createdAt instanceof Timestamp);
    await createCategory(id,input,admin); // Stable create-ID retry must not duplicate or rewrite.
    assert.equal((await getDocs(collection(admin,'categories'))).size,1);
    assert.ok((await getDoc(ref)).data()!.updatedAt.isEqual(original.updatedAt));
    await assert.rejects(createCategory(allocateCategoryId(admin),input,admin),{code:'category/duplicate-slug'});
    await assert.rejects(createCategory(id,{...input,name:'Changed payload'},admin),{code:'category/conflict'});
    for(const denied of [guest,customer,claimOnly,recordOnly,revoked]) await assertFails(createCategory(allocateCategoryId(denied),{...input,slug:'unauthorized'},denied));
    for(const db of [guest,customer]) {
      await assertSucceeds(getDoc(doc(db,'categories',id)));
      await assertSucceeds(getDocs(query(collection(db,'categories'),where('enabled','==',true))));
      await assertFails(getDocs(collection(db,'categories')));
      await assertFails(getDoc(doc(db,'categorySlugs',input.slug)));
    }
    const category: Category={...input,id,createdAt:original.createdAt.toMillis(),updatedAt:original.updatedAt.toMillis()};
    await editCategory(category,{...input,name:'Renamed category',description:'Updated',displayOrder:0,enabled:false},admin);
    const edited=(await getDoc(ref)).data()!;
    assert.equal(edited.name,'Renamed category');assert.equal(edited.displayOrder,0);assert.equal(edited.description,'Updated');assert.equal(edited.slug,input.slug);
    assert.ok(edited.createdAt.isEqual(original.createdAt));
    await assertFails(getDoc(doc(guest,'categories',id)));
    assert.equal((await getDocs(query(collection(guest,'categories'),where('enabled','==',true)))).size,0);
    await assertSucceeds(getDoc(ref));
    await assert.rejects(editCategory(category,{...input,name:'Stale update'},admin),{code:'category/conflict'});
    // Bypass client validation: rules must reject each malformed write themselves.
    for(const invalid of [{name:'x'},{name:' leading'},{slug:'changed-slug'},{enabled:'true'},{displayOrder:0.5},{displayOrder:10000},{description:'x'.repeat(241)},{extra:'private'},{createdAt:Timestamp.fromMillis(0)},{updatedAt:Timestamp.fromMillis(0)}]) {
      await assertFails(updateDoc(ref,{...invalid, ...('updatedAt' in invalid ? {} : {updatedAt:serverTimestamp()})}));
    }
    const loneId=allocateCategoryId(admin);
    await assertFails(setDoc(doc(admin,'categories',loneId),{...input,slug:'lone',createdAt:serverTimestamp(),updatedAt:serverTimestamp()}));
    await assertFails(setDoc(doc(admin,'categorySlugs','lone'),{categoryId:loneId,createdAt:serverTimestamp()}));
    const forged=writeBatch(admin);const forgedId=allocateCategoryId(admin);
    forged.set(doc(admin,'categories',forgedId),{...input,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    forged.set(doc(admin,'categorySlugs',input.slug),{categoryId:forgedId,createdAt:serverTimestamp()});
    await assertFails(forged.commit());
    const races=await Promise.allSettled([createCategory(allocateCategoryId(admin),{...input,slug:'race'},admin),createCategory(allocateCategoryId(admin),{...input,slug:'race'},admin)]);
    assert.equal(races.filter(result=>result.status==='fulfilled').length,1);
    // No deletion is released before trusted product-reference checks exist.
    await assertFails(deleteDoc(ref));
    await environment.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),'products','reference-fixture'),{categoryId:id}));
    await assertFails(deleteDoc(ref));
    await assertFails(deleteDoc(doc(admin,'categorySlugs',input.slug)));
    await environment.withSecurityRulesDisabled(context=>updateDoc(doc(context.firestore(),'adminAccess','category-admin'),{enabled:false}));
    await assertFails(updateDoc(ref,{name:'Revoked edit',updatedAt:serverTimestamp()}));
  } finally { await environment.clearFirestore(); await environment.cleanup(); }
});

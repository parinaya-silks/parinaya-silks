import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' || process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080') throw new Error('Local emulators required.');
async function run(command: string, args: string[], environment = process.env) {
  await new Promise<void>((resolve, reject) => { const child = spawn(command, args, { stdio: 'inherit', env: environment }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Test command exited ${code}`))); });
}
for(const test of (process.env.PARINAYA_LOADING_BROWSER_ONLY?[]:['category-rules','shopping-emulator','delivery-emulator','orders-emulator','customer-history-emulator','discovery-emulator']))await run(process.execPath,['--import','tsx','--test','scripts/'+test+'.test.ts']);
const app = initializeApp({ projectId: 'parinaya-silks' }, 'admin-emulator-fixtures');
const password = randomUUID() + 'aA7!';
try {
  const auth = getAuth(app);
  const database = getFirestore(app);
  for (const [uid, email, claim, enabled] of [
    ['test-approved-admin', 'parinayasilks.in@gmail.com', true, true],
    ['legacy-customer', 'legacy-customer@example.test', false, false],
    ['test-customer', 'customer@example.test', false, false],
    ['test-claim-only', 'claim-only@example.test', true, false],
    ['test-record-only', 'record-only@example.test', false, true],
  ] as const) {
    await auth.createUser({ uid, email, password, emailVerified: true });
    await auth.setCustomUserClaims(uid, { admin: claim });
    if(uid==='legacy-customer')await database.doc('customerProfiles/'+uid).set({uid,displayName:'Legacy Customer',createdAt:new Date(),updatedAt:new Date()});
    if (uid !== 'test-claim-only') await database.doc(`adminAccess/${uid}`).set({ enabled });
  }
} finally { await deleteApp(app); }
const fixtureApp=initializeApp({projectId:'parinaya-silks'},'discovery-browser-seed');await (await import('./discovery-fixtures.ts')).seedDiscovery(getFirestore(fixtureApp));const db=getFirestore(fixtureApp);await db.doc('siteSettings/homepageBanners').set({seconds:6,revision:1,schemaVersion:1});await db.doc('customerProfiles/test-customer').set({uid:'test-customer',displayName:'Local Customer',mobileNumber:'+919876543210',createdAt:new Date(),updatedAt:new Date()});const pid='p'+String(2).padStart(19,'0');await db.doc('customerShopping/test-customer/bag/'+pid+'--simple').set({productId:pid,variantId:null,quantity:1,createdAt:new Date()});await db.doc('customerShopping/test-customer/wishlist/'+pid).set({productId:pid,createdAt:new Date()});await deleteApp(fixtureApp);
const catalogApi = spawn(process.execPath, ['--import','tsx','scripts/catalog-emulator-server.ts'], {stdio:'inherit',env:process.env});
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '3100', '--strictPort', '--mode', 'admin-test'], { stdio: 'inherit', env: process.env });
const preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4200', '--strictPort'], { stdio: 'inherit', env: process.env });
const missingConfiguration = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '3101', '--strictPort', '--mode', 'admin-test'], { stdio: 'inherit', env: { ...process.env, VITE_FIREBASE_API_KEY: '' } });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:3100/admin')).ok && (await fetch('http://127.0.0.1:4200/admin')).ok && (await fetch('http://127.0.0.1:3101/admin')).ok && (await fetch('http://127.0.0.1:3200/api/catalog')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('Local test server unavailable.');
  
  if(!process.env.PARINAYA_LOADING_REGRESSIONS_ONLY)await run('python',['scripts/loading-browser.test.py'],{...process.env,PARINAYA_ADMIN_TEST_PASSWORD:password});
  const a=initializeApp({projectId:'parinaya-silks'},'reseed-discovery');await (await import('./discovery-fixtures.ts')).seedDiscovery(getFirestore(a));await deleteApp(a);
  for(const file of (process.env.PARINAYA_LOADING_FILES?.split(',')||['discovery','banner-timing','customer-history','shopping-design','customer-order-states','checkout-design']))await run('python',['scripts/'+file+'-browser.test.py'],{...process.env,PARINAYA_ADMIN_TEST_PASSWORD:password});


} finally { vite.kill(); preview.kill(); missingConfiguration.kill(); catalogApi.kill(); }

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

export function serverFirebase() {
  const projectId='parinaya-silks';
  for(const key of ['GOOGLE_CLOUD_PROJECT','GCLOUD_PROJECT','FIREBASE_PROJECT_ID']) if(process.env[key] && process.env[key]!==projectId) throw new Error('Server project mismatch.');
  const emulator=process.env.PARINAYA_SERVER_EMULATORS==='true';
  if(emulator && (process.env.NODE_ENV==='production' || process.env.VERCEL || process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080' || process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')) throw new Error('Invalid server emulator configuration.');
  if(!emulator && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error('Unexpected emulator configuration.');
  let app=getApps().find(item=>item.name==='parinaya-catalog');
  if(!app) {
    let credential;
    if(!emulator) {
      const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.GOOGLE_APPLICATION_CREDENTIALS ? readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8') : '');
      if(raw) {const account=JSON.parse(raw);if(account.project_id!==projectId) throw new Error('Credential project mismatch.');credential=cert(account);}
      else credential=applicationDefault();
    }
    app=initializeApp({projectId,...(credential?{credential}:{})},'parinaya-catalog');
  }
  return {database:getFirestore(app,'(default)'),auth:getAuth(app)};
}

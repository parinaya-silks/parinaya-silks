import {initializeAuth,getAuth,browserLocalPersistence,browserSessionPersistence,inMemoryPersistence,connectAuthEmulator,type Auth} from 'firebase/auth';
import type {Firestore} from 'firebase/firestore';
import {getFirebaseApp} from './app.ts';
import {getDatabaseClient} from './database.ts';

type Clients={auth:Auth;database:Firestore};
const clients:Map<string,Clients>=import.meta.hot?.data.authClients??new Map();
if(import.meta.hot)import.meta.hot.data.authClients=clients;

// Shared by customer and administrator routes. Mounting a screen does not
// change persistence or sign out the current Firebase session.
export function getAuthClients():Clients {
  const result=getFirebaseApp();
  if(result.status!=='app-initialized'||import.meta.env.VITE_FIREBASE_DATABASE_ID!=='(default)')throw new Error('Firebase authentication is not configured.');
  const cached=clients.get(result.app.name);if(cached)return cached;
  let auth:Auth,created=false;
  try {auth=initializeAuth(result.app,{persistence:[browserLocalPersistence,browserSessionPersistence,inMemoryPersistence]});created=true;}
  catch(error){if((error as {code?:string}).code!=='auth/already-initialized')throw error;auth=getAuth(result.app);}
  if(created&&!auth.emulatorConfig&&import.meta.env.DEV&&import.meta.env.MODE==='admin-test')connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const value={auth,database:getDatabaseClient()};clients.set(result.app.name,value);return value;
}

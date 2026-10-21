import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw new Error('Only loopback emulators are allowed.');
const app=initializeApp({projectId:'parinaya-silks'},'customer-fixture-control');
try{
  const user=await getAuth(app).getUserByEmail(process.argv[2]);
  const db=getFirestore(app),profile=await db.doc('customerProfiles/'+user.uid).get(),access=await db.doc('adminAccess/'+user.uid).get();
  console.log(JSON.stringify({profileExists:profile.exists,createdAt:profile.data()?.createdAt?.toMillis(),updatedAt:profile.data()?.updatedAt?.toMillis(),adminClaim:user.customClaims?.admin===true,adminAccessExists:access.exists}));
  await db.terminate();
}finally{await deleteApp(app);}

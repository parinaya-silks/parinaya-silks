// Isolated derived test content; cannot run against a live database.
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {blankContent} from '../src/content/model.ts';
import {fallbackAbout} from '../src/about/model.ts';
if(process.env.VERCEL||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8080'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Loopback emulators required');
const app=initializeApp({projectId:'parinaya-silks'},'editorial-fixtures'),db=getFirestore(app,'(default)'),ref=db.doc('siteSettings/storeContent');
try{
 const command=process.argv[2];
 const about={...fallbackAbout(),founderName:'Private retained founder',founderRole:'Private role',founderBio:'Private bio',photo:{mediaId:'a'.repeat(32),url:'https://res.cloudinary.com/parinaya-emulator/image/upload/founder-private.jpg',width:600,height:750,alt:'Private retained portrait',focalX:50,focalY:50}};
 const contact={email:'support.long.address@example.test',mobile:'+919876543210',address:'Hyderabad',instagram:'https://instagram.com/example',whatsappEnabled:true,whatsappUseSupport:true,whatsappMessage:'Hello & help?\nSaree question',showAddress:true,showHours:true,hours:'Monday - Saturday\n10:00 AM - 6:00 PM',mapsUrl:'https://maps.app.goo.gl/example'};
 if(command==='seed')await ref.set({...blankContent(),schemaVersion:1,about,contact});
 else if(command==='hidden')await ref.update({about:{...about,heading:'Short About',intro:'',storyHeading:'',story:'A short saved story.'},contact:{...contact,mobile:'',email:'',instagram:'',whatsappEnabled:false,showAddress:false,showHours:false}});
 else if(command==='founder')await ref.update({about:{...about,showFounder:true}});
 else if(command==='legacy')await ref.set({...blankContent(),schemaVersion:1,contact:{email:'saved@example.test',mobile:'',address:'Hyderabad',instagram:''}});
 else throw Error('Unknown fixture');
 console.log('Loopback editorial fixture completed');
}finally{await deleteApp(app);}

import {serverFirebase} from '../server/firebase.ts';
import {repairDeliveryAwards} from '../server/loyaltyRepair.ts';
const args=process.argv.slice(2),apply=args.includes('--apply'),ids=args.filter(a=>!a.startsWith('--'));
if(args.some(a=>a.startsWith('--')&&!['--apply','--confirm-project=parinaya-silks'].includes(a))||apply&&!args.includes('--confirm-project=parinaya-silks'))throw Error('Use reviewed order IDs; default is read-only. Apply requires --apply --confirm-project=parinaya-silks and separate owner authorization.');
// serverFirebase validates project/environment, explicitly selecting (default).
const {database}=serverFirebase();try{console.log(JSON.stringify({project:'parinaya-silks',database:'(default)',apply,results:await repairDeliveryAwards(database,ids,apply)}));}catch(e){console.error('Delivery award review failed.',{code:(e as {code?:unknown}).code||'review-failed'});process.exitCode=1;}finally{await database.terminate();}

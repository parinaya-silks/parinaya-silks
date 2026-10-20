import {adminErrorMessage,hasAdminClaim} from './accessPolicy.ts';

export type SessionUser={uid:string;email:string|null};
export type AdminSession<U extends SessionUser=SessionUser>=
  | {status:'checking'} | {status:'signed-out'} | {status:'restricted';user:U}
  | {status:'authorized';user:U;verification:'ready'|'checking'|'blocked';message?:string}
  | {status:'error';message:string};
interface Dependencies<U extends SessionUser> {
  publish(state:AdminSession<U>):void;
  token(user:U,force:boolean):Promise<{claims:Record<string,unknown>;expirationTime:string}>;
  record(user:U,next:(enabled:boolean,fromCache:boolean)=>void,error:()=>void):()=>void;
  now?:()=>number;
  timeoutMs?:number;
}

// One live permission-record listener per user; routine token checks never tear
// down that listener or replace the already mounted editor.
export function adminSessionWatcher<U extends SessionUser>({publish,token,record,now=Date.now,timeoutMs=10000}:Dependencies<U>) {
  let active=true,generation=0,user:U|null=null,approved=false,recordFresh=false,recordEnabled=false,claim=false,expires=0;
  let pending:Promise<void>|undefined,problem='',lastRoutine=-Infinity,paused=false,checkGeneration=0;
  let stopRecord:(()=>void)|undefined,deadline:ReturnType<typeof setTimeout>|undefined,expiry:ReturnType<typeof setTimeout>|undefined,routineTimer:ReturnType<typeof setTimeout>|undefined;
  const clearDeadline=()=>{clearTimeout(deadline);deadline=undefined;};
  const emit=()=>{
    if(!active||!user)return;
    if((recordFresh&&!recordEnabled)||(expires&&!claim)){approved=false;clearDeadline();publish({status:'restricted',user});return;}
    if(paused&&approved){
      if(!problem&&!pending&&claim&&recordFresh&&recordEnabled&&expires>now())paused=false;
      else {publish({status:'authorized',user,verification:'blocked',message:problem||'Rechecking permissions. Your work is kept; saving is paused.'});return;}
    }
    if(problem){publish(approved?{status:'authorized',user,verification:'blocked',message:problem}:{status:'error',message:problem});return;}
    if(claim && recordFresh && recordEnabled && expires>now()) {
      approved=true;
      if(!pending)clearDeadline();
      publish({status:'authorized',user,verification:pending?'checking':'ready'});
    } else publish(approved?{status:'authorized',user,verification:'checking'}:{status:'checking'});
  };
  const fail=(message:string)=>{checkGeneration++;pending=undefined;paused=true;problem=message;clearDeadline();if(user)emit();else if(active)publish({status:'error',message});};
  const wait=()=>{if(!deadline)deadline=setTimeout(()=>fail('Permission verification is unavailable. Your work is kept; reconnect and retry before saving.'),timeoutMs);};
  function listen(checked:U) {
    const current=generation;
    stopRecord=record(checked,(enabled,fromCache)=>{
      if(!active||current!==generation)return;
      recordFresh=!fromCache;
      if(!fromCache)recordEnabled=enabled;else wait();
      emit();
    },()=>{if(active&&current===generation){recordFresh=false;stopRecord=undefined;fail('Administrator permission could not be verified. Your work is kept; retry before saving.');}});
  }
  const verify=(force:boolean)=>{
    if(!active||!user)return Promise.resolve();
    if(pending)return pending;
    const checked=user,current=generation,check=++checkGeneration;
    if(!stopRecord)listen(checked);
    problem='';wait();
    // Assign the promise before token callbacks can publish another check.
    pending=Promise.resolve().then(async()=>{
      try {
        const result=await token(checked,force);
        if(!active||current!==generation||check!==checkGeneration)return;
        claim=hasAdminClaim(result.claims,result.expirationTime,now());expires=Date.parse(result.expirationTime)||1;
        clearTimeout(expiry);
        if(claim)expiry=setTimeout(()=>{if(active&&current===generation)fail('Your permission check has expired. Your work is kept; refresh permissions before saving.');},Math.max(1,expires-now()));
      } catch(error) {
        if(!active||current!==generation||check!==checkGeneration)return;
        const code=(error as {code?:string})?.code;
        if(['auth/user-disabled','auth/user-token-expired','auth/id-token-revoked','auth/invalid-user-token'].includes(code||'')) {approved=false;claim=false;expires=1;problem='';}
        else {paused=true;problem=adminErrorMessage(error)+' Your work is kept; retry before saving.';}
      } finally {
        if(active&&current===generation&&check===checkGeneration){pending=undefined;emit();}
      }
    });
    emit();return pending;
  };
  const session=(next:U|null)=>{
    if(!active)return;
    if(next && user && next.uid===user.uid){user=next;void verify(false);return;}
    generation++;stopRecord?.();stopRecord=undefined;clearDeadline();clearTimeout(expiry);clearTimeout(routineTimer);routineTimer=undefined;pending=undefined;
    user=next;approved=false;recordFresh=false;recordEnabled=false;claim=false;expires=0;problem='';paused=false;lastRoutine=-Infinity;
    if(!next){publish({status:'signed-out'});return;}
    publish({status:'checking'});wait();
    void verify(false);
  };
  return {
    session,
    refresh:()=>{clearTimeout(routineTimer);routineTimer=undefined;return verify(true);},
    routine:()=>{
      const remaining=5000-(now()-lastRoutine);
      if(remaining>0){if(!routineTimer)routineTimer=setTimeout(()=>{routineTimer=undefined;lastRoutine=now();void verify(true);},remaining);return Promise.resolve();}
      clearTimeout(routineTimer);routineTimer=undefined;lastRoutine=now();return verify(true);
    },
    error:(error:unknown)=>fail(adminErrorMessage(error)),
    unsubscribe:()=>{active=false;generation++;stopRecord?.();clearDeadline();clearTimeout(expiry);clearTimeout(routineTimer);},
  };
}

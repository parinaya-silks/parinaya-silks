import {useReconnect} from '../loading/useRead.ts';
import {boundedRead} from '../loading/request.ts';
import {useCallback,useEffect,useRef,useState} from 'react';
import {collection,doc,getDoc,onSnapshot} from 'firebase/firestore';
import {useCustomerAuth} from '../customer/CustomerAuth.tsx';
import {getAuthClients} from '../services/firebase/auth.ts';
import {type AddressBook} from './model.ts';
import {deliveryAction} from './client.ts';
const empty:AddressBook={addresses:[],defaultAddressId:null,revision:0};
export function useAddressBook(){
  const session=useCustomerAuth(),uid=session.user?.uid||'';
  const active=useRef(uid);active.current=uid;
  const [state,setState]=useState<{uid:string;status:'loading'|'ready'|'error';book:AddressBook;hasLoaded?:boolean}>({uid:'',status:'loading',book:empty});
  const [profile,setProfile]=useState<{uid:string;name:string;mobile:string}>({uid:'',name:'',mobile:''});
  const epoch=useRef(0),request=useRef(0),pending=useRef(false);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState<{uid:string;message:string}|null>(null);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const readController=useRef<AbortController|null>(null);
  const readLock=useRef<Promise<AddressBook|null|undefined>|null>(null);
  const reload=useCallback(()=>{
    if(!mounted.current)return Promise.resolve(null);if(readLock.current)return readLock.current;const task=(async()=>{if(!uid)return;readController.current=new AbortController();const current=++request.current,generation=epoch.current;
    try{const book=await boundedRead(signal=>deliveryAction<AddressBook>(uid,{action:'addresses:list'},signal),readController.current.signal);if(active.current===uid&&epoch.current===generation&&current===request.current){setState({uid,status:'ready',book,hasLoaded:true});return book;}return null;}
    catch{if(active.current===uid&&epoch.current===generation&&current===request.current)setState(previous=>({...previous,uid,status:'error',book:previous.uid===uid?previous.book:empty}));}
    })();readLock.current=task;void task.finally(()=>{if(readLock.current===task)readLock.current=null;});return task;
  },[uid]);
  useReconnect(()=>{const owner=uid;if(readLock.current)void readLock.current.then(()=>{if(mounted.current&&active.current===owner)void reload();});else void reload();},!!uid);
  useEffect(()=>{
    readLock.current=null;epoch.current++;pending.current=false;setBusy(false);setNotice(null);setState({uid,status:'loading',book:empty});
    if(!uid)return;
    const generation=epoch.current;let live=true,timer:ReturnType<typeof setTimeout>;
    const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(live)void reload();},50);};
    const failed=()=>{if(live&&active.current===uid)setState(previous=>({...previous,uid,status:'error'}));};
    const stops:(()=>void)[]=[];
    try{const {database}=getAuthClients();stops.push(onSnapshot(collection(database,'customerShopping',uid,'addresses'),changed,failed));stops.push(onSnapshot(doc(database,'customerShopping',uid,'preferences','delivery'),changed,failed));
      void getDoc(doc(database,'customerProfiles',uid)).then(result=>{if(live&&active.current===uid&&epoch.current===generation)setProfile({uid,name:result.data()?.displayName||session.user?.displayName||'',mobile:result.data()?.mobileNumber||''});}).catch(()=>{});
    }catch{failed();}
    void reload();
    return()=>{live=false;readController.current?.abort();epoch.current++;clearTimeout(timer);stops.forEach(stop=>stop());};
  },[uid,reload]);
  const mutate=async(body:Record<string,unknown>)=>{
    if(pending.current)throw new Error('Please wait for the current change.');pending.current=true;setBusy(true);
    const owner=uid,generation=epoch.current;
    try{const result=await deliveryAction<{id:string;bookRevision:number}>(uid,body);if(active.current!==owner||epoch.current!==generation)throw new Error('Your account changed.');await reload();if(active.current!==owner||epoch.current!==generation)throw new Error('Your account changed.');setNotice({uid:owner,message:'Address book updated.'});return result;}
    finally{if(active.current===owner&&epoch.current===generation){pending.current=false;setBusy(false);}}
  };
  const current=state.uid===uid?state:{uid,status:'loading' as const,book:empty};
  return {...current.book,status:current.status,hasLoaded:!!current.hasLoaded,uid,session,busy,notice:notice?.uid===uid?notice.message:'',reload,mutate,prefill:profile.uid===uid?{name:profile.name,mobile:profile.mobile}:{name:session.user?.displayName||'',mobile:''}};
}
export type AddressBookState=ReturnType<typeof useAddressBook>;

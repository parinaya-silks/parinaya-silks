import {onIdTokenChanged} from 'firebase/auth';
import {getAuthClients} from '../services/firebase/auth.ts';
import type {HistoryPage} from './historyModel.ts';
type Context={uid:string;path:string;key:string;page:HistoryPage;scroll:number;at:number};
let cached:Context|undefined,watching=false;
export function watchHistoryIdentity(){if(watching)return;watching=true;let owner=getAuthClients().auth.currentUser?.uid;onIdTokenChanged(getAuthClients().auth,user=>{if(owner!==user?.uid)cached=undefined;owner=user?.uid;});}
export function restoreHistory(uid:string,path:string){return cached?.uid===uid&&cached.path===path&&cached.key===window.history.state?.customerOrdersKey&&Date.now()-cached.at<300000?cached:undefined;}
export function saveHistory(value:Context){if(getAuthClients().auth.currentUser?.uid===value.uid)cached=value;}
export function returnToHistory(onNavigate:(path:string)=>void){const value=window.history.state?.customerOrdersReturn;const valid=value&&/^\/account\/orders(?:\?status=(?:progress|delivered|cancelled))?$/.test(value.path)&&typeof value.key==='string';onNavigate(valid?value.path:'/account/orders');if(valid)window.history.replaceState({...window.history.state,customerOrdersKey:value.key},'');}

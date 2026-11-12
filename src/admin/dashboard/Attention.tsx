import React,{createContext,useContext} from 'react';
import {useAdminResource} from './resource.tsx';
export interface Attention {statuses:Record<string,number>;orders:number;enquiries:number;inventory:number|null;updatedAt:number}
const Context=createContext<Attention|undefined>(undefined);
export function AttentionProvider({children}:{children:React.ReactNode}){const resource=useAdminResource<Attention>({action:'dashboard:attention'},'Unable to refresh actionable counts.');return <Context value={resource.error?undefined:resource.data}>{resource.error&&<div role="alert" className="settings-error">{resource.error} <button onClick={resource.retry}>Retry counts</button></div>}{children}</Context>;}
export const useAttention=()=>useContext(Context);
export function AttentionBadge({section}:{section:string}){const data=useAttention(),count=data?.[section as 'orders'|'enquiries'|'inventory'];return typeof count==='number'&&count>0?<small className="admin-attention-badge" aria-label={count+' requiring attention'}>{count>99?'99+':count}</small>:null;}

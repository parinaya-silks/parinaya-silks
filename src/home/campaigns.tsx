import React,{createContext,useContext,useEffect,useState} from 'react';
import {useRead} from '../loading/useRead.ts';
import {catalogResponse} from '../products/response.ts';
import type {PublicCampaign} from '../campaigns/model.ts';
type Snapshot={items:PublicCampaign[];serverNow:number;nextBoundary:number|null;received:number};
const Context=createContext<{items:PublicCampaign[];loading:boolean;error:unknown;retry:()=>void}>({items:[],loading:false,error:null,retry:()=>{}});
// One server-authoritative snapshot for navigation, hero and Sale overview.
export const useHomeCampaigns=()=>useContext(Context);
export function CampaignProvider({children}:{children:React.ReactNode}){
 const r=useRead<Snapshot>('storefront-campaigns',async signal=>{const v=await catalogResponse(await fetch('/api/catalog?campaigns=1',{cache:'no-store',signal}));if(!Array.isArray(v.items)||typeof v.serverNow!=='number')throw Error('Invalid campaigns');return {...v,received:performance.now()};},{interval:15000});
 const [,renderBoundary]=useState(0);
 useEffect(()=>{const s=r.data;if(!s||s.nextBoundary==null)return;const timer=setTimeout(()=>{renderBoundary(n=>n+1);r.retry();},Math.min(2147483647,Math.max(0,s.nextBoundary-s.serverNow-(performance.now()-s.received))));return()=>clearTimeout(timer);},[r.data,r.retry]);
 const items=r.error?[]:(r.data?.items||[]).filter(c=>c.endsAt===null||c.endsAt>r.data!.serverNow+(performance.now()-r.data!.received));
 return <Context value={{items,loading:!r.hasLoaded&&r.busy,error:r.error,retry:r.retry}}>{children}</Context>;
}

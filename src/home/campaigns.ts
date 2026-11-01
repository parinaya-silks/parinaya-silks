import {useRead} from '../loading/useRead.ts';
import {catalogResponse} from '../products/response.ts';
import type {PublicCampaign} from '../campaigns/model.ts';
export function useHomeCampaigns(){const r=useRead<PublicCampaign[]>('home-campaigns',async signal=>{const v=await catalogResponse(await fetch('/api/catalog?campaigns=1',{cache:'no-store',signal}));if(!Array.isArray(v.items))throw Error('Invalid campaigns');return v.items;},{interval:15000});return {...r,items:r.data||[]};}

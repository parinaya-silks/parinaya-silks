import {shippingAmount,initialShipping,MAX_FLAT_FEE,MAX_THRESHOLD,type ShippingSettings} from '../../shipping/model.ts';
import type {Appearance} from '../../appearance/model.ts';
export interface SettingsSnapshot {shipping:ShippingSettings;appearance:Appearance;updatedAt:{shipping:number|null;appearance:number|null};capabilities:{cod:string;online:string;maintenance:string}}
export function shippingDraft(s:ShippingSettings){return s.config?{fee:(s.config.flatFeePaise/100).toFixed(2),threshold:(s.config.freeThresholdPaise/100).toFixed(2),free:s.config.freeShippingEnabled}:{fee:'',threshold:'',free:false};}
export function shippingInput(d:ReturnType<typeof shippingDraft>,saved:ShippingSettings){return {...initialShipping(),flatFeePaise:shippingAmount(d.fee,MAX_FLAT_FEE),freeShippingEnabled:d.free,freeThresholdPaise:d.threshold===''&&!d.free?saved.config?.freeThresholdPaise??0:shippingAmount(d.threshold,MAX_THRESHOLD)};}

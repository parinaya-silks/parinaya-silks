import {ProductError} from '../../products/model.ts';
import {customRange,periodRange} from '../dashboard/model.ts';
import {csvCell} from '../../orders/model.ts';
export type CustomerFilters={search:string;sort:'newest'|'oldest'|'name';orders:'all'|'with'|'without';missingMobile:boolean;missingEmail:boolean;period:string;start:string;end:string};
export const blankCustomerFilters=():CustomerFilters=>({search:'',sort:'newest',orders:'all',missingMobile:false,missingEmail:false,period:'all',start:'',end:''});
export type CustomerListState={filters:CustomerFilters;cursors:(string|null)[];scroll:number};
export const initialCustomers=():CustomerListState=>({filters:blankCustomerFilters(),cursors:[null],scroll:0});
export function restoreCustomers(value:any,uid:string):CustomerListState{try{const saved=value?.customersContext;if(!uid||saved?.uid!==uid)throw Error();const state=saved.state as CustomerListState;customerFilterQuery(state.filters);if(!Array.isArray(state.cursors)||!state.cursors.length||state.cursors.length>1000||state.cursors[0]!==null||state.cursors.some(cursor=>cursor!==null&&(typeof cursor!=='string'||cursor.length>2000))||!Number.isFinite(state.scroll)||state.scroll<0)throw Error();return state;}catch{return initialCustomers();}}
export type CustomerRow={availablePoints?:number;uid:string;displayName:string;email:string|null;mobileNumber:string|null;joinedAt:number|null;orderCount:number|null;itemsOrdered:number|null;latestOrderAt:number|null;latestOrderId:string|null;latestOrderReference:string|null};
export type CustomerPage={items:CustomerRow[];nextCursor:string|null;total:number};
export function customerUid(value:unknown):string{if(typeof value!=='string'||!value.length||value.length>128||/[\/\x00-\x1f\x7f]/.test(value))throw new ProductError('invalid','Invalid customer reference.');return value;}
export const customerPath=(uid:string)=>'/admin/customers/'+encodeURIComponent(customerUid(uid));
export function searchTerm(value:string){const normalized=value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');return /^[+\d\s().-]+$/.test(normalized)?normalized.replace(/\D/g,''):normalized;}
export function searchPrefixes(name:string,email:string|null,mobile:string|null){const terms=[name,...name.split(/\s+/),email||'',mobile||'',mobile?.startsWith('+91')?mobile.slice(3):''].map(searchTerm);return [...new Set(terms.flatMap(term=>Array.from({length:Math.min(term.length,254)},(_,i)=>term.slice(0,i+1))))];}
export function customerFilterQuery(filters:CustomerFilters){
 if(!['newest','oldest','name'].includes(filters.sort)||!['all','with','without'].includes(filters.orders)||filters.search.length>100||typeof filters.missingMobile!=='boolean'||typeof filters.missingEmail!=='boolean')throw new ProductError('invalid','Choose valid customer filters.');
 let range;if(filters.period==='custom')range=customRange(filters.start,filters.end);else if(['today','week','month'].includes(filters.period))range=periodRange(filters.period as 'today'|'week'|'month');else if(filters.period!=='all')throw new ProductError('invalid','Choose a valid joined-date range.');
 return {search:searchTerm(filters.search),sort:filters.sort,orders:filters.orders,missingMobile:filters.missingMobile,missingEmail:filters.missingEmail,from:range?.from??0,to:range?.to??253402300799999};
}
export const exportFields=['name','email','mobile','joined','orders','latest','address'] as const;
export type ExportField=typeof exportFields[number];
export const fieldLabels:Record<ExportField,string>={name:'Customer name',email:'Email address',mobile:'Mobile number',joined:'Joined date',orders:'Orders placed',address:'Current default delivery address',latest:'Latest order date'};
export const defaultExportFields:ExportField[]=['name','email','mobile','joined','orders'];
export const joinedDate=(time:number|null)=>time===null?'Not recorded':new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric'}).format(time);
export const initials=(name:string)=>name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase()||'?';
export const customerCsv=(fields:ExportField[],rows:string[][])=>'\ufeff'+[fields.map(field=>fieldLabels[field]),...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');

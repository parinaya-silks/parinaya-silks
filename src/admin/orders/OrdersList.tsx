import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Download,Search,X,ChevronLeft,ChevronRight,Phone,ArrowRight} from 'lucide-react';
import {useAdminResource} from '../dashboard/resource.tsx';
import {ResourceStatus} from '../dashboard/Status.tsx';
import {bulkEligible} from '../dashboard/model.ts';
import {useAdminWritePermission} from '../permission.tsx';
import {money} from '../../shopping/model.ts';
import {BulkActions,useOrderSelection} from './BulkActions.tsx';
import {OrderFiltersControl} from './Filters.tsx';
import {blankFilters,periods,codLabel,orderDate,orderQuery,pageCsv,type OrderFilters,type OrderListItem,type OrderListState,type OrderPage} from './model.ts';
import './orders.css';

const empty:OrderListItem[]=[];
export function OrdersList({state,onState,onNavigate}:{state:OrderListState;onState:(value:OrderListState)=>void;onNavigate:(path:string)=>void}){
 const [search,setSearch]=useState(state.filters.search),[error,setError]=useState(''),[busy,setBusy]=useState(false),allowed=useAdminWritePermission();
 const page=state.cursors.length,cursor=state.cursors.at(-1),body={action:'adminOrders:list',view:'summary',pageSize:10,...orderQuery(state.filters),...(cursor?{cursor}:{})},context=JSON.stringify(body);
 const resource=useAdminResource<OrderPage>(body,'Unable to load orders. Please try again.'),items=resource.data?.items||empty,selection=useOrderSelection(items,context),restored=useRef(false);
 useEffect(()=>setSearch(state.filters.search),[state.filters.search]);
 useLayoutEffect(()=>{if(resource.data&&!restored.current){restored.current=true;window.scrollTo(0,state.scroll);}},[resource.data]);
 function apply(filters:OrderFilters){try{orderQuery(filters);setError('');selection.clear();onState({filters,cursors:[null],scroll:0});}catch(error){setError(error instanceof Error?error.message:'Choose valid filters.');}}
 function move(cursors:(string|null)[]){selection.clear();onState({...state,cursors,scroll:0});}
 function view(item:OrderListItem){onState({...state,scroll:window.scrollY});onNavigate('/admin/orders/'+item.id);}
 function exportPage(){if(!resource.data||resource.error)return;const url=URL.createObjectURL(new Blob([pageCsv(items)],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='parinaya-orders-current-page.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
 const filtered=!!state.filters.search||state.filters.statuses.length>0||!!state.filters.paymentStatus||state.filters.period!=='all';
 const checkbox=(item:OrderListItem)=><input className="orders-check" type="checkbox" aria-label={'Select '+item.reference} checked={selection.rows.some(row=>row.id===item.id)} disabled={!allowed||busy||!bulkEligible(item)} onChange={()=>selection.toggle(item)}/>;
 const selectAll=<input className="orders-check" type="checkbox" aria-label="Select all eligible orders on this page" checked={selection.all} ref={node=>{if(node)node.indeterminate=!selection.all&&selection.rows.length>0;}} disabled={!allowed||busy||!selection.eligible.length} onChange={selection.toggleAll}/>;
 const status=(item:OrderListItem)=><span className="orders-badge" data-status={item.status}>{item.status}</span>;
 const payment=(item:OrderListItem)=><div className="orders-payment"><span className="orders-badge" data-payment={item.paymentStatus}>{codLabel(item)}</span>{item.paymentStatus==='due'&&BigInt(item.collectedPaise)>0n&&<small>{money(BigInt(item.collectedPaise))} recorded; {money(BigInt(item.totalPaise)-BigInt(item.collectedPaise))} remaining</small>}</div>;
 const viewButton=(item:OrderListItem)=><button className="orders-view admin-secondary" onClick={()=>view(item)}>View Order<ArrowRight size={13} aria-hidden="true"/></button>;
 const chip=(label:string,clear:()=>void)=><button className="orders-chip" disabled={busy} onClick={clear}>{label}<X size={12} aria-hidden="true"/><span className="sr-only">Remove filter</span></button>;
 return <section className="orders-list" aria-label="Orders list">
  <header className="orders-heading"><div><h1>Orders</h1><p>Manage customer orders &amp; fulfilment.</p></div><button className="admin-secondary" disabled={!resource.data||!!resource.error||!items.length} onClick={exportPage}><Download size={15} aria-hidden="true"/>Export current page</button></header>
  <div className="orders-toolbar"><form className="orders-search" onSubmit={event=>{event.preventDefault();apply({...state.filters,search});}}><Search size={15} aria-hidden="true"/><label className="sr-only" htmlFor="order-reference">Exact order reference</label><input id="order-reference" type="search" placeholder="Exact PS- reference" value={search} disabled={busy} maxLength={100} onChange={event=>setSearch(event.target.value)}/><button className="orders-link" disabled={busy}>Search</button></form><OrderFiltersControl value={state.filters} disabled={busy} onApply={apply}/>{filtered&&<button className="orders-link orders-clear" disabled={busy} onClick={()=>apply(blankFilters())}>Clear filters</button>}</div>
  <div className="orders-chips">{state.filters.search&&chip('Reference: '+state.filters.search,()=>apply({...state.filters,search:''}))}{state.filters.statuses.length>0&&chip('Status: '+state.filters.statuses.join(', '),()=>apply({...state.filters,statuses:[]}))}{state.filters.paymentStatus&&chip('COD: '+state.filters.paymentStatus,()=>apply({...state.filters,paymentStatus:''}))}{state.filters.period!=='all'&&chip('Dates: '+(state.filters.period==='custom'?state.filters.start+' – '+state.filters.end:periods.find(([key])=>key===state.filters.period)?.[1]),()=>apply({...state.filters,period:'all',start:'',end:''}))}</div>
  {error&&<p role="alert">{error}</p>}
  <BulkActions rows={selection.rows} items={items} context={context} refreshing={resource.refreshing||!!resource.error} onClear={selection.clear} onSuccess={selection.remove} onRetry={resource.retry} onBusy={setBusy}/>
  <ResourceStatus resource={resource} label="orders"/>
  {!resource.data&&resource.refreshing&&<div className="orders-loading" aria-hidden="true">{[0,1,2,3,4].map(key=><div key={key}/>)}</div>}
  {resource.data&&items.length===0&&<div className="orders-empty"><h2>{filtered?'No orders match these criteria':'No orders yet'}</h2><p>{filtered?'Try another reference or adjust your filters.':'New customer orders will appear here.'}</p>{filtered&&<button className="admin-secondary" onClick={()=>apply(blankFilters())}>Clear filters and show all orders</button>}{page>1&&<button className="admin-secondary" onClick={()=>move([null])}>First page</button>}</div>}
  {resource.data&&items.length>0&&<div className="orders-results">
   <table className="orders-table"><thead><tr><th className="orders-check-cell">{selectAll}</th><th>Order ID / Date</th><th>Customer</th><th>Total amount</th><th>Status</th><th>Payment</th><th className="orders-action-cell">Action</th></tr></thead><tbody>{items.map(item=><tr key={item.id} data-order-id={item.id} data-selected={selection.rows.some(row=>row.id===item.id)}><td>{checkbox(item)}</td><td><strong className="orders-reference">{item.reference}</strong><time dateTime={Number.isFinite(item.createdAt)?new Date(item.createdAt).toISOString():undefined}>{orderDate(item.createdAt)}</time></td><td><span className="orders-customer">{item.customerName}</span><small>{item.customerPhone||'Phone not recorded'}</small></td><td className="orders-amount">{money(BigInt(item.totalPaise))}</td><td>{status(item)}</td><td>{payment(item)}</td><td>{viewButton(item)}</td></tr>)}</tbody></table>
   <div className="orders-cards"><label className="orders-select-page">{selectAll}Select eligible orders on this page</label>{items.map(item=><article className="orders-card" key={item.id} data-order-id={item.id} data-selected={selection.rows.some(row=>row.id===item.id)}><header>{checkbox(item)}<strong className="orders-reference">{item.reference}</strong><time>{orderDate(item.createdAt)}</time></header><div className="orders-card-customer"><strong>{item.customerName}</strong><small><Phone size={12} aria-hidden="true"/>{item.customerPhone||'Phone not recorded'}</small></div><footer><div><span className="orders-total-label">Total amount</span><strong className="orders-amount">{money(BigInt(item.totalPaise))}</strong></div><div className="orders-card-status">{status(item)}{payment(item)}{viewButton(item)}</div></footer></article>)}</div>
   <footer className="orders-pagination"><span>Showing {(page-1)*10+1}–{(page-1)*10+items.length} · Page {page}.</span><div><button className="admin-secondary" disabled={page===1||busy||resource.refreshing} onClick={()=>move(state.cursors.slice(0,-1))}><ChevronLeft size={14}/>Previous</button><button className="admin-secondary" disabled={!resource.data.nextCursor||busy||resource.refreshing||!!resource.error} onClick={()=>move([...state.cursors,resource.data!.nextCursor])}>Next<ChevronRight size={14}/></button></div></footer>
  </div>}
 </section>;
}

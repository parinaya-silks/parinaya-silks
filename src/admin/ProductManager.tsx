import React,{useEffect,useRef,useState} from 'react';
import { AdminProducts } from './AdminProducts.tsx';
import { AdminProductForm } from './AdminProductForm.tsx';
import { productButton as button } from './ProductImages.tsx';
import { catalogAction,newOperation,saveProduct,type CatalogPage } from '../products/client.ts';
import { productInput,type ProductRecord } from '../products/model.ts';
import { storefrontProduct } from '../products/adapter.ts';

export function ProductManager({path,onNavigate}:{path:string;onNavigate:(path:string)=>void}) {
  const [items,setItems]=useState<ProductRecord[]>([]),[record,setRecord]=useState<ProductRecord>(),[state,setState]=useState<'loading'|'ready'|'error'>('loading'),[error,setError]=useState(''),[success,setSuccess]=useState(''),[cursor,setCursor]=useState<string|null>(null),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState(0);
  const lock=useRef(false),operation=useRef({key:'',id:''});
  useEffect(()=>{if(window.history.state?.productSaved){setSuccess('Product saved.');window.history.replaceState(null,'',window.location.href);}},[]);
  const list=path==='/admin/products',create=path==='/admin/products/new';
  useEffect(()=>{let active=true;setState('loading');setError('');if(create){setState('ready');return;}const request=list?catalogAction<CatalogPage>({action:'list'}):catalogAction<ProductRecord>({action:'get',id:path.split('/').at(-1)});void request.then(result=>{if(!active)return;if(list){setItems((result as CatalogPage).items);setCursor((result as CatalogPage).nextCursor);}else setRecord(result as ProductRecord);setState('ready');}).catch(failure=>{if(active){setError(failure.message);setState('error');}});return()=>{active=false;};},[path,attempt]);
  async function loadMore(){if(lock.current||!cursor)return;lock.current=true;setBusy(true);try{const page=await catalogAction<CatalogPage>({action:'list',cursor});setItems(old=>[...old,...page.items.filter(item=>!old.some(previous=>previous.id===item.id))]);setCursor(page.nextCursor);setError('');}catch(failure){setError(failure instanceof Error?failure.message:'Could not load products.');}finally{lock.current=false;setBusy(false);}}
  async function change(id:string,kind:'stock'|'status',delta=0){if(lock.current)return;const product=items.find(item=>item.id===id);if(!product)return;if(kind==='stock'&&product.inventory.mode==='variants'){onNavigate(`/admin/products/edit/${id}`);return;}lock.current=true;setBusy(true);setError('');setSuccess('');try{const input=productInput(product);if(kind==='stock')input.inventory={...input.inventory,quantity:input.inventory.quantity+delta};else input.status=input.status==='Published'?'Draft':'Published';const key=JSON.stringify({id,revision:product.revision,input});if(operation.current.key!==key)operation.current={key,id:newOperation()};const result=await saveProduct(id,product.revision,operation.current.id,input);setItems(old=>old.map(item=>item.id===id?result:item));operation.current={key:'',id:''};setSuccess('Product saved.');}catch(failure){setError(failure instanceof Error?failure.message:'Could not save product.');}finally{lock.current=false;setBusy(false);}}
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>onNavigate('/admin/categories')}>Manage Categories</button>{list&&<button className={button} onClick={()=>onNavigate('/admin/products/new')}>Open product editor</button>}</div>
    {state==='loading'&&<><h1 className="font-serif text-2xl">{list?'Products & Stock':'Edit Product'}</h1><p role="status">Loading products…</p></>}
    {error&&<div role="alert" className="rounded-lg border border-red-200 p-4 text-sm text-red-900 space-y-2"><p>{error}</p><button className={button} onClick={()=>setAttempt(value=>value+1)}>Reload products</button></div>}
    {success&&<p role="status" className="p-3 bg-emerald-50 rounded-lg text-sm">{success}</p>}
    {state==='error'&&<h1 className="font-serif text-2xl">{list?'Products & Stock':'Edit Product'}</h1>}
    {state==='ready'&&(list?<><fieldset disabled={busy} className="min-w-0"><AdminProducts unavailable={false} products={items.map(storefrontProduct)} onNavigate={onNavigate} onAdjustStock={(product,delta)=>void change(product.id,'stock',delta)} onToggleStatus={product=>void change(product.id,'status')}/></fieldset><p className="text-xs text-[#5F5552]">Search, filters and metrics cover the {items.length} loaded products. Load another page to search more.</p>{cursor&&<button className={button} disabled={busy} onClick={()=>void loadMore()}>Load more products</button>}</>:<AdminProductForm product={create?undefined:record} onNavigate={onNavigate}/>) }
  </div>;
}

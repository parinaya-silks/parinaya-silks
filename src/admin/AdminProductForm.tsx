import React,{useEffect,useRef,useState} from 'react';
import {doc,collection} from 'firebase/firestore';
import {getDatabaseClient} from '../services/firebase/database.ts';
import {categorySlug} from '../categories/model.ts';
import {useCategories} from '../categories/useCategories.ts';
import {emptyProduct,productInput,quantity,discount,rupeesToPaise,validateProduct,ProductError,type ProductInput,type ProductRecord,type ProductImage,type Variant,type ProductStatus} from '../products/model.ts';
import {newOperation,saveProduct} from '../products/client.ts';
import {ProductImages,productButton as button} from './ProductImages.tsx';
import {AdminCategories} from './AdminCategories.tsx';
import {useAdminWritePermission} from './permission.tsx';
const field='w-full min-h-11 px-3 border border-[#E8DDD6] rounded-lg text-sm bg-[#FBF7F0]';
const card='bg-white border border-[#E8DDD6] rounded-xl p-4 sm:p-5 space-y-4';
const labels:Record<string,string>={name:'Product name',categoryId:'Category',description:'Description',images:'Photos',pricePaise:'Selling price',originalPricePaise:'Original price',inventory:'Stock',sku:'Product code',slug:'Product link',status:'Status',fabric:'Fabric',weaveType:'Weave',sareeLength:'Saree length',careInstructions:'Care instructions',colorHex:'Colour swatch',colorName:'Colour name',blouseDetails:'Blouse details',weightGrams:'Weight',zariType:'Zari details',lowStockThreshold:'Low-stock reminder'};

function CategoryDrawer({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>previous?.focus();},[]);
  return <dialog ref={dialog} aria-label="Manage product categories" onCancel={event=>{event.preventDefault();onClose();}} className="m-auto w-[calc(100%-1rem)] max-w-3xl max-h-[90dvh] overflow-y-auto rounded-xl border border-[#E8DDD6] bg-[#FBF7F0] p-4 sm:p-6 backdrop:bg-black/50"><button autoFocus type="button" className={button+' mb-4'} onClick={onClose}>Back to product</button><AdminCategories onNavigate={onClose}/></dialog>;
}
export function AdminProductForm({product,onNavigate}:{product?:ProductRecord;onNavigate:(path:string)=>void}) {
  const writable=useAdminWritePermission();
  const {state:categories,retry:retryCategories}=useCategories(true);
  const id=useRef(product?.id||doc(collection(getDatabaseClient(),'products')).id);
  const initial=useRef<ProductInput>(product?productInput(product):{...emptyProduct(),slug:'saree-'+id.current.toLowerCase(),sku:'PS-'+id.current});
  const [saved,setSaved]=useState(product),[draft,setDraft]=useState<ProductInput>(initial.current);
  const [images,setImages]=useState<ProductImage[]>(product?.images||[]),[price,setPrice]=useState(product?String(product.pricePaise/100):''),[original,setOriginal]=useState(product?.originalPricePaise?String(product.originalPricePaise/100):'');
  const [errors,setErrors]=useState<Record<string,string>>({}),[message,setMessage]=useState(''),[success,setSuccess]=useState(''),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[manageCategories,setManageCategories]=useState(false);
  const lock=useRef(false),operation=useRef({fingerprint:'',id:''}),form=useRef<HTMLFormElement>(null);
  const stockMemory=useRef({simple:initial.current.inventory.quantity||0,variants:initial.current.inventory.variants||[]});
  const baseline=useRef(JSON.stringify({draft:initial.current,images:product?.images||[],price:product?String(product.pricePaise/100):'',original:product?.originalPricePaise?String(product.originalPricePaise/100):''}));
  const dirty=JSON.stringify({draft,images,price,original})!==baseline.current;
  const dirtyRef=useRef(dirty);dirtyRef.current=dirty||uploading||saving;
  useEffect(()=>{const unload=(event:BeforeUnloadEvent)=>{if(dirtyRef.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[]);
  useEffect(()=>{const guard=(event:Event)=>{if(dirtyRef.current&&!window.confirm('Discard unsaved product changes? Uploaded photos will be kept.'))event.preventDefault();};window.addEventListener('parinaya:before-admin-navigation',guard);return()=>window.removeEventListener('parinaya:before-admin-navigation',guard);},[]);
  const set=<K extends keyof ProductInput>(key:K,value:ProductInput[K])=>{setDraft(old=>({...old,[key]:value}));setSuccess('');};
  const goBack=()=>{if(!dirtyRef.current||window.confirm('Discard unsaved product changes? Uploaded photos will be kept.')){dirtyRef.current=false;onNavigate('/admin/products');}};
  const invalid=(failure:ProductError)=>{
    setErrors(failure.fields);setMessage(failure.message);
    requestAnimationFrame(()=>{
      const first=form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      for(let ancestor=first?.parentElement;ancestor;ancestor=ancestor.parentElement)if(ancestor instanceof HTMLDetailsElement)ancestor.open=true;
      first?.focus();first?.scrollIntoView({block:'center',behavior:'smooth'});
    });
  };
  async function save(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault();if(lock.current||uploading||!writable)return;
    setErrors({});setMessage('');setSuccess('');
    const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
    const status=(submitter?.value||draft.status) as ProductStatus;
    const inventory=draft.inventory.mode==='simple'?{mode:'simple' as const,quantity:draft.inventory.quantity??0}:{mode:'variants' as const,variants:draft.inventory.variants||[]};
    let input:ProductInput;
    try{input=validateProduct({...draft,status,sku:draft.sku.trim()||'PS-'+id.current,inventory,pricePaise:price===''?0:rupeesToPaise(price),originalPricePaise:original===''?null:rupeesToPaise(original)});}
    catch(error){if(error instanceof ProductError)invalid(error);return;}
    lock.current=true;setSaving(true);
    const fingerprint=JSON.stringify(input);if(operation.current.fingerprint!==fingerprint)operation.current={fingerprint,id:newOperation()};
    try {
      const result=await saveProduct(id.current,saved?.revision||0,operation.current.id,input);
      const clean=productInput(result),nextPrice=String(result.pricePaise/100),nextOriginal=result.originalPricePaise?String(result.originalPricePaise/100):'';
      setSaved(result);setDraft(clean);setImages(result.images);setPrice(nextPrice);setOriginal(nextOriginal);
      baseline.current=JSON.stringify({draft:clean,images:result.images,price:nextPrice,original:nextOriginal});
      operation.current={fingerprint:'',id:''};setSuccess('Product saved.');
      if(!saved){dirtyRef.current=false;window.history.replaceState({productSaved:true},'','/admin/products/edit/'+result.id);window.dispatchEvent(new PopStateEvent('popstate',{state:{skipUnsaved:true}}));}
    }catch(error){if(error instanceof ProductError)invalid(error);else setMessage('Save could not be confirmed. Your changes are kept; retry.');}
    finally{lock.current=false;setSaving(false);}
  }
  function text(key:keyof ProductInput,label:string,multiline=false,type='text') {
    const change=(value:string)=>{
      if(key==='name')setDraft(old=>({...old,name:value,...(!saved?{slug:(categorySlug(value).slice(0,70)||'saree')+'-'+id.current.toLowerCase()}:{})}));
      else set(key,(type==='number'?(value===''?null:Number(value)):value) as never);
      setSuccess('');
    };
    return <label className={'block text-sm space-y-1 '+(multiline?'sm:col-span-2':'')}><span className="font-medium">{label}</span>{multiline?<textarea aria-label={label} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key]?'error-'+key:undefined} className={field+' min-h-24 py-3'} value={String(draft[key])} onChange={event=>change(event.target.value)}/>:<input aria-label={label} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key]?'error-'+key:undefined} className={field} type={type} value={draft[key]===null?'':String(draft[key])} onChange={event=>change(event.target.value)}/>}{errors[key]&&<span id={'error-'+key} className="block text-red-800 text-xs">{errors[key]}</span>}</label>;
  }
  function newColour():Variant {const colourId=newOperation();return {id:colourId,sku:'C-'+colourId,name:'',hex:'#780D24',quantity:0};}
  function mode(value:'simple'|'variants') {
    if(draft.inventory.mode==='simple')stockMemory.current.simple=draft.inventory.quantity||0;else stockMemory.current.variants=draft.inventory.variants||[];
    if(value==='simple')set('inventory',{mode:'simple',quantity:stockMemory.current.simple});
    else set('inventory',{mode:'variants',variants:stockMemory.current.variants.length?stockMemory.current.variants:[newColour()]});
  }
  const selectedCategory=categories.status==='ready'?categories.items.find(category=>category.id===draft.categoryId):undefined;
  const disabledCategory=categories.status==='ready'&&draft.categoryId&&(!selectedCategory||!selectedCategory.enabled);
  const preview={pricePaise:rupeesToPaise(price)||0,originalPricePaise:original?rupeesToPaise(original):null};
  return <div className="max-w-3xl mx-auto space-y-4 font-sans" style={{overflowWrap:'anywhere'}}>
    <header className="flex flex-wrap gap-3 items-center justify-between pb-3 border-b border-[#E8DDD6]"><div><h1 className="font-serif text-2xl sm:text-[28px] font-semibold">{saved?'Edit Product':'Add Product'}</h1><p className="text-sm text-[#5F5552]">{saved?'Saved as '+saved.status.toLowerCase()+'.':'Add a saree, save a draft or publish when ready.'}</p></div><button className={button} disabled={saving||uploading} onClick={goBack}>Back to Products</button></header>
    {message&&<div role="alert" className="p-3 rounded-lg bg-red-50 text-red-900 text-sm"><p>{message}</p>{Object.keys(errors).length>0&&<ul className="list-disc pl-5 mt-1">{Object.entries(errors).map(([key,value])=><li key={key}>{labels[key]||'Product details'}: {value}</li>)}</ul>}</div>}
    {success&&<p role="status" className="p-3 bg-emerald-50 text-emerald-900 rounded-lg text-sm">{success}</p>}
    <form ref={form} onSubmit={save} noValidate className="space-y-4"><fieldset disabled={saving||!writable} className="min-w-0 space-y-4">
      <section className={card}><h2 className="font-serif text-lg">Product details</h2><div className="grid sm:grid-cols-2 gap-4">
        {text('name','Product name')}
        <label className="block text-sm space-y-1"><span className="font-medium">Category</span><select aria-label="Category" aria-invalid={Boolean(errors.categoryId)} className={field} value={draft.categoryId} onChange={event=>set('categoryId',event.target.value)}><option value="">Choose a category</option>{categories.status==='ready'&&categories.items.filter(category=>category.enabled||category.id===draft.categoryId).map(category=><option key={category.id} value={category.id} disabled={!category.enabled}>{category.name}{category.enabled?'':' (disabled)'}</option>)}{draft.categoryId&&categories.status==='ready'&&!selectedCategory&&<option value={draft.categoryId} disabled>Saved category is unavailable</option>}</select>{errors.categoryId&&<span className="text-xs text-red-800">{errors.categoryId}</span>}</label>
        {categories.status==='loading'&&<p role="status">Loading categories…</p>}{categories.status==='error'&&<div role="alert">{categories.message}<button type="button" className={button} onClick={retryCategories}>Retry categories</button></div>}
        {disabledCategory&&<p className="text-sm text-amber-900 sm:col-span-2">The saved category is {selectedCategory?'disabled':'missing'}. Its relationship is kept. Choose an enabled category before publishing; you can still save a draft.</p>}
        {text('description','Description',true)}
      </div><button type="button" className="min-h-11 underline text-sm text-[#780D24]" onClick={()=>setManageCategories(true)}>Manage Categories</button>
      <details className="border-t border-[#E8DDD6] pt-3"><summary className="cursor-pointer min-h-11 text-sm font-medium">More saree details</summary><div className="grid sm:grid-cols-2 gap-4 pt-3">
        {text('fabric','Fabric (optional)')}{text('sareeLength','Saree length (optional)')}{text('weaveType','Weave (optional)')}{text('zariType','Zari details (optional)')}{text('colorName','Colour name (optional)')}{text('colorHex','Colour swatch',false,'color')}
        <label className="block text-sm">Blouse piece included<select aria-label="Blouse piece included" className={field} value={draft.blouseIncluded?'yes':'no'} onChange={event=>set('blouseIncluded',event.target.value==='yes')}><option value="yes">Yes</option><option value="no">No</option></select></label>
        {text('blouseDetails','Blouse details (optional)')}{text('careInstructions','Care instructions (optional)',true)}{text('weightGrams','Weight in grams (optional)',false,'number')}
      </div></details><details className="border-t border-[#E8DDD6] pt-3"><summary className="cursor-pointer min-h-11 text-sm">Product code &amp; link</summary><div className="space-y-3 pt-3">{text('sku','Product code (optional)')}<p className="text-xs text-[#5F5552] break-all">Product link: /product/{draft.slug}. Created automatically and kept after the first save.</p></div></details></section>
      <div tabIndex={-1} aria-label="Product photos" aria-invalid={Boolean(errors.images)}><ProductImages productId={id.current} productName={draft.name} images={images} cover={draft.coverMediaId} disabled={saving||!writable} onBusy={setUploading} onChange={(next,cover)=>{setImages(next);setDraft(old=>({...old,images:next.map(({mediaId,alt})=>({mediaId,alt})),coverMediaId:cover}));setSuccess('');}}/>{errors.images&&<p className="text-sm text-red-800 mt-2">{errors.images}</p>}</div>
      <section className={card}><h2 className="font-serif text-lg">Price &amp; stock</h2><div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm space-y-1"><span>Selling price (₹)</span><input aria-label="Selling price (₹)" aria-invalid={Boolean(errors.pricePaise)} className={field} inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)}/>{errors.pricePaise&&<span className="text-xs text-red-800">{errors.pricePaise}</span>}</label>
        <label className="text-sm space-y-1"><span>Original price (₹, optional)</span><input aria-label="Original price (₹, optional)" aria-invalid={Boolean(errors.originalPricePaise)} className={field} inputMode="decimal" value={original} onChange={event=>setOriginal(event.target.value)}/>{errors.originalPricePaise&&<span className="text-xs text-red-800">{errors.originalPricePaise}</span>}</label>
      </div>{discount(preview)>0&&<p className="text-sm text-[#780D24]">{discount(preview)}% off · calculated from your prices</p>}
      <label className="block text-sm space-y-1"><span>Stock type</span><select aria-label="Stock type" className={field} value={draft.inventory.mode} onChange={event=>mode(event.target.value as 'simple'|'variants')}><option value="simple">One stock quantity</option><option value="variants">Stock by colour</option></select></label>
      <div aria-invalid={Boolean(errors.inventory)} tabIndex={-1} aria-label="Stock quantities">{draft.inventory.mode==='simple'?<label className="block text-sm space-y-1">Stock quantity<input aria-label="Stock quantity" className={field} type="number" min={0} step={1} value={Number.isNaN(draft.inventory.quantity)?'':draft.inventory.quantity??0} onChange={event=>set('inventory',{mode:'simple',quantity:event.target.value===''?NaN:Number(event.target.value)})}/></label>:<div className="space-y-3">{(draft.inventory.variants||[]).map((variant,index)=><div key={variant.id} className="border border-[#E8DDD6] rounded-lg p-3 space-y-3"><div className="grid sm:grid-cols-3 gap-3">{(['name','hex','quantity'] as const).map(key=><label key={key} className="text-sm">Colour {index+1} {key==='hex'?'swatch':key==='quantity'?'stock':'name'}<input className={field} type={key==='quantity'?'number':key==='hex'?'color':'text'} min={key==='quantity'?0:undefined} step={key==='quantity'?1:undefined} value={typeof variant[key]==='number'&&Number.isNaN(variant[key])?'':variant[key]} onChange={event=>set('inventory',{mode:'variants',variants:(draft.inventory.variants||[]).map(old=>old.id===variant.id?{...old,[key]:key==='quantity'?(event.target.value===''?NaN:Number(event.target.value)):event.target.value}:old)})}/></label>)}</div><button type="button" className={button} onClick={()=>set('inventory',{mode:'variants',variants:(draft.inventory.variants||[]).filter(old=>old.id!==variant.id)})}>Remove colour {index+1}</button></div>)}<button type="button" className={button} disabled={(draft.inventory.variants?.length||0)>=20} onClick={()=>set('inventory',{mode:'variants',variants:[...(draft.inventory.variants||[]),newColour()]})}>Add colour</button><p className="text-sm">Total stock: {quantity(draft)||0}</p></div>}{errors.inventory&&<p className="text-xs text-red-800 mt-2">{errors.inventory}</p>}</div>
      <details className="border-t border-[#E8DDD6] pt-3"><summary className="cursor-pointer min-h-11 text-sm">Storefront options</summary><div className="space-y-3 pt-3"><label className="block text-sm">Status<select aria-label="Status" className={field} value={draft.status} onChange={event=>set('status',event.target.value as ProductStatus)}><option>Draft</option><option>Published</option><option>Archived</option></select></label><div className="flex flex-wrap gap-5">{(['featured','newArrival'] as const).map(key=><label key={key} className="min-h-11 flex items-center gap-2 text-sm"><input type="checkbox" checked={draft[key]} onChange={event=>set(key,event.target.checked)}/>{key==='featured'?'Featured':'New Arrival'}</label>)}</div>{text('lowStockThreshold','Low-stock reminder',false,'number')}<p className="text-xs text-[#5F5552]">Draft and archived products stay private. Published products also need an enabled category.</p><button type="button" disabled className={button}>Delete unavailable</button><p className="text-xs text-[#5F5552]">Archive to keep the product and its photos.</p></div></details></section>
    </fieldset><div className="flex flex-wrap items-center gap-3 py-3 pb-6">
      {saved&&<button className={button+' bg-[#780D24] text-white'} type="submit" disabled={saving||uploading||!writable}>Save Changes</button>}
      <button className={button} type="submit" value="Draft" disabled={saving||uploading||!writable}>Save Draft</button>
      {(!saved||saved.status!=='Published')&&<button className={button+' bg-[#780D24] text-white'} type="submit" value="Published" disabled={saving||uploading||!writable}>Publish Product</button>}
      <button type="button" className={button} disabled={saving||uploading} onClick={goBack}>Cancel</button>
      {saving?<span role="status" className="text-sm">Saving…</span>:uploading?<span role="status" className="text-sm">Photos are uploading. Please wait before saving.</span>:dirty&&<span className="text-xs text-[#5F5552]">Unsaved changes</span>}
    </div></form>{manageCategories&&<CategoryDrawer onClose={()=>setManageCategories(false)}/>}
  </div>;
}

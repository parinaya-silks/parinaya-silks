import React,{useEffect,useRef,useState} from 'react';
import { doc,collection } from 'firebase/firestore';
import { getDatabaseClient } from '../services/firebase/database.ts';
import { categorySlug } from '../categories/model.ts';
import { useCategories } from '../categories/useCategories.ts';
import { emptyProduct,productInput,quantity,discount,rupeesToPaise,validateProduct,ProductError,type ProductInput,type ProductRecord,type ProductImage } from '../products/model.ts';
import { newOperation,saveProduct } from '../products/client.ts';
import { ProductImages,productButton as button } from './ProductImages.tsx';

const field='w-full min-h-11 px-3 border border-[#E8DDD6] rounded-lg text-sm bg-[#FBF7F0]';
const card='bg-white border border-[#E8DDD6] rounded-xl p-5 shadow-xs space-y-4';
export function AdminProductForm({product,onNavigate}:{product?:ProductRecord;onNavigate:(path:string)=>void}) {
  const {state:categories,retry:retryCategories}=useCategories(true);
  const id=useRef(product?.id || doc(collection(getDatabaseClient(),'products')).id);
  const [saved,setSaved]=useState(product),[draft,setDraft]=useState<ProductInput>(product?productInput(product):emptyProduct());
  const [images,setImages]=useState<ProductImage[]>(product?.images||[]),[price,setPrice]=useState(product?String(product.pricePaise/100):''),[original,setOriginal]=useState(product?.originalPricePaise?String(product.originalPricePaise/100):'');
  const [errors,setErrors]=useState<Record<string,string>>({}),[message,setMessage]=useState(''),[success,setSuccess]=useState(''),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false);
  const lock=useRef(false),operation=useRef({fingerprint:'',id:''}),slugTouched=useRef(Boolean(product));
  const baseline=useRef(JSON.stringify({draft:product?productInput(product):emptyProduct(),images:product?.images||[],price:product?String(product.pricePaise/100):'',original:product?.originalPricePaise?String(product.originalPricePaise/100):''}));
  const dirty=JSON.stringify({draft,images,price,original})!==baseline.current;
  const dirtyRef=useRef(dirty);dirtyRef.current=dirty||uploading||saving;
  useEffect(()=>{const unload=(event:BeforeUnloadEvent)=>{if(dirtyRef.current){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);return()=>window.removeEventListener('beforeunload',unload);},[]);
  const set=<K extends keyof ProductInput>(key:K,value:ProductInput[K])=>{setDraft(old=>({...old,[key]:value}));setSuccess('');};
  const goBack=()=>{if(!dirtyRef.current||window.confirm('Discard unsaved product changes? Uploaded media will be retained.')){dirtyRef.current=false;onNavigate('/admin/products');}};
  // Guard sidebar/link navigation as well as reload. Browser Back is handled by
  // the panel's navigation guard below through the shared event.
  useEffect(()=>{const guard=(event:Event)=>{if(dirtyRef.current && !window.confirm('Discard unsaved product changes? Uploaded media will be retained.'))event.preventDefault();};window.addEventListener('parinaya:before-admin-navigation',guard);return()=>window.removeEventListener('parinaya:before-admin-navigation',guard);},[]);
  async function save(event:React.FormEvent) {
    event.preventDefault();if(lock.current||uploading)return;setErrors({});setMessage('');setSuccess('');
    let input:ProductInput;
    try{input=validateProduct({...draft,pricePaise:price===''?0:rupeesToPaise(price),originalPricePaise:original===''?null:rupeesToPaise(original)});}catch(error){if(error instanceof ProductError){setErrors(error.fields);setMessage(error.message);}return;}
    lock.current=true;setSaving(true);
    const fingerprint=JSON.stringify(input);if(operation.current.fingerprint!==fingerprint)operation.current={fingerprint,id:newOperation()};
    try {
      const result=await saveProduct(id.current,saved?.revision||0,operation.current.id,input);
      const clean=productInput(result),nextPrice=String(result.pricePaise/100),nextOriginal=result.originalPricePaise?String(result.originalPricePaise/100):'';
      setSaved(result);setDraft(clean);setImages(result.images);setPrice(nextPrice);setOriginal(nextOriginal);
      baseline.current=JSON.stringify({draft:clean,images:result.images,price:nextPrice,original:nextOriginal});
      slugTouched.current=true;operation.current={fingerprint:'',id:''};setSuccess('Product saved.');
      if(!saved) {
        dirtyRef.current=false;
        window.history.replaceState({productSaved:true},'',`/admin/products/edit/${result.id}`);
        window.dispatchEvent(new PopStateEvent('popstate',{state:{skipUnsaved:true}}));
      }
    }
    catch(error){if(error instanceof ProductError){setErrors(error.fields);setMessage(error.message);}else setMessage('Save could not be confirmed. Your changes are kept; retry.');}
    finally{lock.current=false;setSaving(false);}
  }
  function text(key:keyof ProductInput,label:string,multiline=false,type='text') {
    const value=draft[key];
    const change=(event:React.ChangeEvent<HTMLInputElement>)=>{
      if(key==='name') {
        const name=event.target.value;
        setDraft(old=>({...old,name,...(!slugTouched.current?{slug:categorySlug(name)}:{})}));
      } else {
        if(key==='slug')slugTouched.current=true;
        set(key,(type==='number'?(event.target.value===''?null:Number(event.target.value)):event.target.value) as never);
      }
    };
    return <label className={'block text-sm space-y-1 '+(multiline?'sm:col-span-2':'')}><span className="font-semibold">{label}</span>{multiline?<textarea aria-label={label} aria-invalid={Boolean(errors[key])} className={field+' min-h-28 py-3'} value={String(value)} onChange={event=>set(key,event.target.value as never)}/>:<input aria-label={label} aria-invalid={Boolean(errors[key])} className={field} type={type} value={value===null?'':String(value)} readOnly={key==='slug'&&Boolean(saved)} onChange={change}/>}{errors[key]&&<span className="block text-red-800 text-xs">{errors[key]}</span>}</label>;
  }
  const preview={pricePaise:rupeesToPaise(price)||0,originalPricePaise:original?rupeesToPaise(original):null};
  return <div className="max-w-4xl mx-auto space-y-6 font-sans" style={{overflowWrap:'anywhere'}}>
    <header className="flex flex-wrap gap-3 items-center justify-between pb-4 border-b border-[#E8DDD6]"><div><h1 className="font-serif text-2xl sm:text-[28px] font-semibold">{saved?'Edit Product':'Add Product'}</h1><p className="text-sm text-[#5F5552]">{saved?'Saved URL: /product/'+saved.slug:'Save an incomplete draft, or complete the details before publishing.'}</p></div><button className={button} disabled={saving||uploading} onClick={goBack}>Back to Products</button></header>
    {message&&<div role="alert" className="p-4 rounded-lg bg-red-50 text-red-900 text-sm">{message}{Object.keys(errors).length>0&&<ul className="list-disc pl-5 mt-2">{Object.entries(errors).map(([key,value])=><li key={key}>{key}: {value}</li>)}</ul>}</div>}
    {success&&<p role="status" className="p-3 bg-emerald-50 text-emerald-900 rounded-lg text-sm">{success}</p>}
    <form onSubmit={save} noValidate className="space-y-6">
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        <section className={card}><h2 className="font-serif text-lg">Saree Taxonomy &amp; Details</h2><div className="grid sm:grid-cols-2 gap-4">
          {text('name','Product name')}{text('slug','URL slug')}{text('sku','SKU')}
          <label className="block text-sm space-y-1"><span className="font-semibold">Category</span><select aria-label="Category" className={field} value={draft.categoryId} onChange={event=>set('categoryId',event.target.value)}><option value="">Unassigned (draft only)</option>{categories.status==='ready'&&categories.items.map(category=><option key={category.id} value={category.id}>{category.name}{category.enabled?'':' (disabled)'}</option>)}</select>{errors.categoryId&&<span className="text-xs text-red-800">{errors.categoryId}</span>}</label>
          {categories.status==='loading'&&<p role="status">Loading categories…</p>}{categories.status==='error'&&<div role="alert">{categories.message}<button type="button" className={button} onClick={retryCategories}>Retry categories</button></div>}
          {text('description','Description',true)}{text('fabric','Fabric')}{text('weaveType','Weave / type')}{text('zariType','Zari details')}{text('sareeLength','Saree length')}{text('colorName','Colour name')}{text('colorHex','Colour swatch',false,'color')}
          <label className="block text-sm space-y-1"><span>Blouse piece included</span><select aria-label="Blouse piece included" className={field} value={draft.blouseIncluded?'yes':'no'} onChange={event=>set('blouseIncluded',event.target.value==='yes')}><option value="yes">Yes</option><option value="no">No</option></select></label>
          {text('blouseDetails','Blouse details')}{text('weightGrams','Weight (grams, optional)',false,'number')}{text('careInstructions','Wash / care instructions',true)}
        </div><p className="text-xs text-[#5F5552]">The URL slug is permanent after the first save. Category identity uses its saved ID.</p></section>
        <section className={card}><h2 className="font-serif text-lg">Pricing &amp; Loom Stock</h2><div className="grid sm:grid-cols-2 gap-4">
          <label className="block text-sm space-y-1"><span>Selling price (₹)</span><input aria-label="Selling price (₹)" className={field} inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)}/>{errors.pricePaise&&<span className="text-xs text-red-800">{errors.pricePaise}</span>}</label>
          <label className="block text-sm space-y-1"><span>Original price (₹, optional)</span><input aria-label="Original price (₹, optional)" className={field} inputMode="decimal" value={original} onChange={event=>setOriginal(event.target.value)}/>{errors.originalPricePaise&&<span className="text-xs text-red-800">{errors.originalPricePaise}</span>}</label>
          {text('lowStockThreshold','Low-stock threshold',false,'number')}
          <label className="block text-sm space-y-1"><span>Inventory mode</span><select aria-label="Inventory mode" className={field} value={draft.inventory.mode} onChange={event=>{if(window.confirm('Switch inventory mode? Current quantities will be reset.'))set('inventory',event.target.value==='simple'?{mode:'simple',quantity:0,variants:[]}:{mode:'variants',quantity:0,variants:[{id:newOperation(),sku:'',name:'',hex:'#780D24',quantity:0}]});}}><option value="simple">Simple stock</option><option value="variants">Colour variants</option></select></label>
        </div><p className="text-sm">Price preview: {new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(preview.pricePaise/100)}{discount(preview)>0?` · ${discount(preview)}% off`:''}</p>
        {draft.inventory.mode==='simple'?<label className="block text-sm space-y-1"><span>Stock quantity</span><input className={field} type="number" min={0} step={1} value={draft.inventory.quantity} onChange={event=>set('inventory',{...draft.inventory,quantity:Number(event.target.value)})}/></label>:<div className="space-y-3">{draft.inventory.variants.map((variant,index)=><div key={index} className="border rounded-lg p-3 grid sm:grid-cols-2 gap-3">{(['id','sku','name','hex','quantity'] as const).map(key=><label key={key} className="text-sm block">Variant {index+1} {key}<input className={field} type={key==='quantity'?'number':key==='hex'?'color':'text'} value={variant[key]} onChange={event=>set('inventory',{...draft.inventory,variants:draft.inventory.variants.map((old,i)=>i===index?{...old,[key]:key==='quantity'?Number(event.target.value):event.target.value}:old)})}/></label>)}<button type="button" className={button} onClick={()=>set('inventory',{...draft.inventory,variants:draft.inventory.variants.filter((_,i)=>i!==index)})}>Remove variant {index+1}</button></div>)}<button type="button" className={button} disabled={draft.inventory.variants.length>=20} onClick={()=>set('inventory',{...draft.inventory,variants:[...draft.inventory.variants,{id:newOperation(),sku:'',name:'',hex:'#780D24',quantity:0}]})}>Add colour variant</button></div>}
        {errors.inventory&&<p className="text-xs text-red-800">{errors.inventory}</p>}<p className="text-sm">Total stock: {quantity(draft)} · Changes are checked against the saved revision.</p></section>
        <ProductImages productId={id.current} images={images} cover={draft.coverMediaId} disabled={saving} onBusy={setUploading} onChange={(next,cover)=>{setImages(next);setDraft(old=>({...old,images:next.map(({mediaId,alt})=>({mediaId,alt})),coverMediaId:cover}));}}/>
        {errors.images&&<p className="text-sm text-red-800">{errors.images}</p>}
        <section className={card}><h2 className="font-serif text-lg">Publication</h2><label className="block text-sm space-y-1"><span>Status</span><select aria-label="Status" className={field} value={draft.status} onChange={event=>set('status',event.target.value as ProductInput['status'])}><option>Draft</option><option>Published</option><option>Archived</option></select></label><div className="flex flex-wrap gap-5">{(['featured','newArrival'] as const).map(key=><label key={key} className="min-h-11 flex items-center gap-2 text-sm"><input type="checkbox" checked={draft[key]} onChange={event=>set(key,event.target.checked)}/>{key==='featured'?'Featured':'New Arrival'}</label>)}</div><p className="text-xs text-[#5F5552]">Drafts and archived products are private. Disabling the category also hides its published products.</p><button type="button" disabled className={button} title="Historical product references cannot yet be verified">Delete unavailable</button><p className="text-xs text-[#5F5552]">Archive instead of deleting to preserve identity and media.</p></section>
      </fieldset>
      <div className="flex flex-wrap gap-3 pb-5"><button className={button+' bg-[#780D24] text-white'} type="submit" disabled={saving||uploading}>{saving?'Saving…':uploading?'Finish uploads before saving':'Save product'}</button><button type="button" className={button} disabled={saving||uploading} onClick={goBack}>Cancel</button>{dirty&&<span className="text-xs self-center text-[#5F5552]">Unsaved changes</span>}</div>
    </form>
  </div>;
}

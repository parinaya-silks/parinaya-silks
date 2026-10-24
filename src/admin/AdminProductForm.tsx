import React,{useEffect,useRef,useState} from 'react';
import {doc,collection} from 'firebase/firestore';
import {getDatabaseClient} from '../services/firebase/database.ts';
import {categorySlug} from '../categories/model.ts';
import {useCategories} from '../categories/useCategories.ts';
import {emptyProduct,productInput,productFields,quantity,discount,rupeesToPaise,validateProduct,ProductError,type ProductInput,type ProductRecord,type ProductImage,type Variant,type ProductStatus} from '../products/model.ts';
import {catalogAction,newOperation,saveProduct} from '../products/client.ts';
import {ProductImages,productButton as button} from './ProductImages.tsx';
import {AdminCategories} from './AdminCategories.tsx';
import {CategoryEditor} from './AdminCategories.tsx';
import {ArrowLeft,Plus,Package,Image as ImageIcon,Tag,Palette,SlidersHorizontal,Store,Eye,Save,Upload,ChevronDown} from 'lucide-react';
import {productMoney} from './AdminProducts.tsx';
import {useAdminWritePermission} from './permission.tsx';
const field='product-field';
const card='product-editor-panel';
const labels:Record<string,string>={name:'Product name',categoryId:'Category',description:'Description',images:'Photos',pricePaise:'Selling price',originalPricePaise:'Original price',inventory:'Stock',sku:'Product code',slug:'Product link',status:'Status',fabric:'Fabric',weaveType:'Weave',sareeLength:'Saree length',careInstructions:'Care instructions',colorHex:'Colour swatch',colorName:'Colour name',blouseDetails:'Blouse details',weightGrams:'Weight',zariType:'Zari details',lowStockThreshold:'Low-stock reminder'};

function CategoryDrawer({onClose}:{onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.showModal();return()=>previous?.focus();},[]);
  return <dialog ref={dialog} aria-label="Manage product categories" onCancel={event=>{event.preventDefault();onClose();}} className="m-auto w-[calc(100%-1rem)] max-w-3xl max-h-[90dvh] overflow-y-auto rounded-xl border border-[#E8DDD6] bg-[#FBF7F0] p-4 sm:p-6 backdrop:bg-black/50"><button autoFocus type="button" className={button+' mb-4'} onClick={onClose}>Back to product</button><AdminCategories onNavigate={onClose}/></dialog>;
}
export function AdminProductForm({product,onNavigate,initialSuccess=''}:{product?:ProductRecord;initialSuccess?:string;onNavigate:(path:string)=>void}) {
  const writable=useAdminWritePermission();
  const {state:categories,retry:retryCategories}=useCategories(true);
  const id=useRef(product?.id||doc(collection(getDatabaseClient(),'products')).id);
  const initial=useRef<ProductInput>(product?productInput(product):{...emptyProduct(),slug:'saree-'+id.current.toLowerCase(),sku:'PS-'+id.current});
  const [saved,setSaved]=useState(product),[draft,setDraft]=useState<ProductInput>(initial.current);
  const [images,setImages]=useState<ProductImage[]>(product?.images||[]),[price,setPrice]=useState(product?String(product.pricePaise/100):''),[original,setOriginal]=useState(product?.originalPricePaise?String(product.originalPricePaise/100):'');
  const [errors,setErrors]=useState<Record<string,string>>({}),[message,setMessage]=useState(''),[success,setSuccess]=useState(initialSuccess),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[manageCategories,setManageCategories]=useState(false);
  const [newCategory,setNewCategory]=useState(false),[blockedPhotos,setBlockedPhotos]=useState(false);
  const [conflict,setConflict]=useState(false);
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
    setErrors({});setMessage('');setSuccess('');setConflict(false);
    const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
    const status=(submitter?.value||draft.status) as ProductStatus;
    if(status==='Archived'&&draft.status!=='Archived'&&!window.confirm('Archive this saree? It will leave the storefront; its product, photos and historical orders will be kept.'))return;
    if(status==='Published'&&blockedPhotos){setMessage('Resolve or dismiss failed photo uploads before publishing. Your changes are kept.');return;}
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
      if(!saved){dirtyRef.current=false;window.history.replaceState({...window.history.state,productSaved:true},'','/admin/products/edit/'+result.id);window.dispatchEvent(new PopStateEvent('popstate',{state:{skipUnsaved:true}}));}
    }catch(error){if(error instanceof ProductError){invalid(error);setConflict(error.code==='conflict');}else setMessage('Save could not be confirmed. Your changes are kept; retry.');}
    finally{lock.current=false;setSaving(false);}
  }
  async function latestStock(){
    if(!saved||lock.current)return;lock.current=true;setSaving(true);
    try{const latest=await catalogAction<ProductRecord>({action:'get',id:id.current});
      if(JSON.stringify(draft.inventory)!==JSON.stringify(saved.inventory)&&!window.confirm('Use the latest saved stock? Your stock edits will be replaced. Other entered details and photos will be kept.'))return;
      const before=productInput(saved),fresh=productInput(latest),current={...draft,pricePaise:price===''?0:rupeesToPaise(price),originalPricePaise:original===''?null:rupeesToPaise(original)},same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
      const collided=productFields.filter(key=>key!=='inventory'&&!same(current[key],before[key])&&!same(fresh[key],before[key])&&!same(current[key],fresh[key]));
      if(collided.length){setMessage('These details also changed in another session: '+collided.map(key=>labels[key]||key).join(', ')+'. Your work is kept; compare the latest product in another tab before reloading.');return;}
      const merged=Object.fromEntries(productFields.map(key=>[key,key==='inventory'||same(current[key],before[key])?fresh[key]:current[key]])) as unknown as ProductInput;
      if(same(current.images,before.images))setImages(latest.images);
      setSaved(latest);setDraft(merged);if(price===String(saved.pricePaise/100))setPrice(String(merged.pricePaise/100));if(original===(saved.originalPricePaise===null?'':String(saved.originalPricePaise/100)))setOriginal(merged.originalPricePaise===null?'':String(merged.originalPricePaise/100));setConflict(false);setMessage('Latest stock and revision loaded. Your other edits are kept. Review them before saving.');
    }catch{setMessage('Unable to load the latest stock. Your edits are kept. Please retry.');}finally{lock.current=false;setSaving(false);}
  }
  function text(key:keyof ProductInput,label:string,multiline=false,type='text') {
    const change=(value:string)=>{
      if(key==='name')setDraft(old=>({...old,name:value,...(!saved?{slug:(categorySlug(value).slice(0,70)||'saree')+'-'+id.current.toLowerCase()}:{})}));
      else set(key,(type==='number'?(value===''?null:Number(value)):value) as never);
      setSuccess('');
    };
    return <label className={'product-label '+(multiline?'product-full':'')}><span>{label}{['name','description'].includes(key)&&<b className="product-required"> * to publish</b>}</span>{multiline?<textarea aria-label={label} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key]?'error-'+key:undefined} className={field} value={String(draft[key])} onChange={event=>change(event.target.value)}/>:<input aria-label={label} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key]?'error-'+key:undefined} className={field} readOnly={key==='sku'} type={type} value={draft[key]===null?'':String(draft[key])} onChange={event=>change(event.target.value)}/>}{errors[key]&&<span id={'error-'+key} className="product-field-error">{errors[key]}</span>}</label>;
  }
  function newColour():Variant {const colourId=newOperation();return {id:colourId,sku:'C-'+colourId,name:'',hex:'#780D24',quantity:0};}
  function mode(value:'simple'|'variants') {
    if(value===draft.inventory.mode)return;
    if((quantity(draft)>0||draft.inventory.mode==='variants')&&!window.confirm('Change stock mode? The other stock structure is kept in this editor until you leave. Only the selected mode is saved; quantities are not copied into colours.'))return;
    if(draft.inventory.mode==='simple')stockMemory.current.simple=draft.inventory.quantity||0;else stockMemory.current.variants=draft.inventory.variants||[];
    if(value==='simple')set('inventory',{mode:'simple',quantity:stockMemory.current.simple});
    else set('inventory',{mode:'variants',variants:stockMemory.current.variants.length?stockMemory.current.variants:[newColour()]});
  }
  function variantField(variant:Variant,index:number,key:'name'|'hex'|'quantity'){
    const change=(value:string)=>set('inventory',{mode:'variants',variants:(draft.inventory.variants||[]).map(old=>old.id===variant.id?{...old,[key]:key==='quantity'?(value===''?NaN:Number(value)):value}:old)});
    const input=<input aria-label={`Colour ${index+1} ${key==='hex'?'swatch':key==='quantity'?'stock':'name'}`} className={field} type={key==='quantity'?'number':key==='hex'?'color':'text'} min={key==='quantity'?0:undefined} max={key==='quantity'?1000000:undefined} step={key==='quantity'?1:undefined} value={typeof variant[key]==='number'&&Number.isNaN(variant[key])?'':variant[key]} onChange={e=>change(e.target.value)}/>;
    return <label key={key} className="product-label"><span>{key==='hex'?'Swatch':key==='name'?'Colour '+(index+1):'Quantity'}</span>{key==='quantity'?<span className="product-qty-stepper"><button type="button" aria-label={`Decrease colour ${index+1} stock`} disabled={!Number.isSafeInteger(variant.quantity)||variant.quantity<=0} onClick={()=>change(String(variant.quantity-1))}>−</button>{input}<button type="button" aria-label={`Increase colour ${index+1} stock`} disabled={!Number.isSafeInteger(variant.quantity)||variant.quantity>=1000000} onClick={()=>change(String(variant.quantity+1))}>+</button></span>:input}</label>;
  }
  const selectedCategory=categories.status==='ready'?categories.items.find(category=>category.id===draft.categoryId):undefined;
  const disabledCategory=categories.status==='ready'&&draft.categoryId&&(!selectedCategory||!selectedCategory.enabled);
  const preview={pricePaise:rupeesToPaise(price)||0,originalPricePaise:original?rupeesToPaise(original):null};
  const coverImage=images.find(image=>image.mediaId===draft.coverMediaId)||images[0];
  const readiness=[!draft.name.trim()&&'product name',!draft.categoryId&&'category',!draft.description.trim()&&'description',!(preview.pricePaise>0)&&'selling price',(!images.length||!draft.coverMediaId||images.some(i=>!i.alt.trim()))&&'verified photos with descriptions',blockedPhotos&&'resolved photo uploads',disabledCategory&&'enabled category'].filter(Boolean);
  const actions=<><button className={saved?.status==='Published'?'product-primary':'product-secondary'} form="product-editor" type="submit" disabled={saving||uploading||!writable}>{saved?'Save Changes':'Save Draft'}</button>{saved?.status==='Published'?<button form="product-editor" type="submit" value="Draft" className="product-secondary" disabled={saving||uploading||!writable}>Unpublish</button>:<button form="product-editor" type="submit" value="Published" className="product-primary" disabled={saving||uploading||!writable}><Upload size={14}/>Publish Product</button>}</>;
  const placement=<section className={card}><header><Store size={17}/><h2>Storefront Placement</h2></header><div className="product-panel-body">{(['featured','newArrival'] as const).map(key=><label key={key} className="product-toggle"><span><strong>{key==='featured'?'Feature on Homepage':'Mark as New Arrival'}</strong><small>{key==='featured'?'Eligible for the existing featured product sections.':'Shows the existing New Arrival badge; no automatic expiry.'}</small></span><input aria-label={key==='featured'?'Featured':'New Arrival'} type="checkbox" checked={draft[key]} onChange={e=>set(key,e.target.checked)}/></label>)}<p className="product-placement-note">Published products appear in the shop when their category is enabled. Stock availability is separate.</p>{disabledCategory&&<p className="product-warning">Category hidden on storefront. Choose an enabled category before publishing.</p>}</div></section>;
  return <section className="product-editor" aria-label="Product editor">
    <button type="button" className="product-back" onClick={goBack}><ArrowLeft size={15}/>Back to Products</button>
    <header className="product-editor-heading"><div><div className="products-title"><h1>{saved?'Edit Product':'Add Product'}</h1><span className="product-status" data-status={saved?.status||'Draft'}>{saved?.status||'Draft'}{saved?.status!=='Published'?' — Unpublished':''}</span></div><p>{saved?'Update your saree listing. Its code and storefront link stay fixed.':'Create a new saree listing for your online boutique.'}</p></div><div className="product-editor-desktop-actions"><button type="button" className="product-text-button" disabled={saving||uploading} onClick={goBack}>Cancel</button>{actions}</div></header>
    {message&&<div role="alert" className="product-error"><p>{message}</p>{conflict&&<button type="button" className="product-secondary" disabled={saving} onClick={()=>void latestStock()}>Load latest stock and keep edits</button>}{Object.keys(errors).length>0&&<ul>{Object.entries(errors).map(([key,value])=><li key={key}>{labels[key]||'Product details'}: {value}</li>)}</ul>}</div>}
    {success&&<p role="status" className="product-success">{success}</p>}
    <form id="product-editor" ref={form} onSubmit={save} noValidate><fieldset disabled={saving||!writable} className="product-editor-grid">
      <div className="product-editor-main">
        <section className={card}><header><Package size={17}/><h2>1. Basic Details</h2><small>Core catalogue information</small></header><div className="product-panel-body product-fields">
          <div className="product-full">{text('name','Product name')}<p className="product-hint">Use a clear name describing the colour, weave and saree.</p></div>
          <div><div className="product-category-label"><span>Category <b className="product-required">* to publish</b></span><button type="button" onClick={()=>setNewCategory(true)}><Plus size={13}/>Create Category</button></div><select aria-label="Category" aria-invalid={Boolean(errors.categoryId)} className={field} value={draft.categoryId} onChange={e=>set('categoryId',e.target.value)}><option value="">Choose a category</option>{categories.status==='ready'&&categories.items.filter(c=>c.enabled||c.id===draft.categoryId).map(c=><option key={c.id} value={c.id}>{c.name}{c.enabled?'':' (hidden)'}</option>)}{draft.categoryId&&categories.status==='ready'&&!selectedCategory&&<option value={draft.categoryId}>Saved category (loading or unavailable)</option>}</select>{errors.categoryId&&<p className="product-field-error">{errors.categoryId}</p>}</div>
          <div>{text('sku','Product code')}<p className="product-hint">Generated once. This product code stays fixed.</p></div>
          {categories.status==='loading'&&<p role="status">Loading categories...</p>}{categories.status==='error'&&<p role="alert">{categories.message}<button type="button" onClick={retryCategories}>Retry categories</button></p>}
          {disabledCategory&&<p className="product-warning product-full">The saved category is hidden or missing. Its relationship is kept; select an enabled category before publishing.</p>}
          {text('description','Description',true)}<p className="product-hint product-full">Plain text. Describe the weave, border, pallu and what makes this saree special.</p>

        </div></section>
        <div tabIndex={-1} aria-label="Product photos" aria-invalid={Boolean(errors.images)}><ProductImages productId={id.current} productName={draft.name} images={images} cover={draft.coverMediaId} disabled={saving||!writable} onBusy={setUploading} onBlocked={setBlockedPhotos} onChange={(next,cover)=>{setImages(next);setDraft(old=>({...old,images:next.map(({mediaId,alt})=>({mediaId,alt})),coverMediaId:cover}));setSuccess('');}}/>{errors.images&&<p className="product-field-error">{errors.images}</p>}</div>
        <section className={card}><header><Tag size={17}/><h2>3. Price &amp; Value</h2></header><div className="product-panel-body"><div className="product-fields">
          <label className="product-label"><span>Selling price (₹) <b className="product-required">* to publish</b></span><input aria-label="Selling price (₹)" aria-invalid={Boolean(errors.pricePaise)} className={field} inputMode="decimal" value={price} onChange={e=>{setPrice(e.target.value);setSuccess('');}}/>{errors.pricePaise&&<small className="product-field-error">{errors.pricePaise}</small>}</label>
          <label className="product-label"><span>Original price / MRP (₹, optional)</span><input aria-label="Original price (₹, optional)" aria-invalid={Boolean(errors.originalPricePaise)} className={field} inputMode="decimal" value={original} onChange={e=>{setOriginal(e.target.value);setSuccess('');}}/>{errors.originalPricePaise&&<small className="product-field-error">{errors.originalPricePaise}</small>}</label>
          </div>{discount(preview)>0&&<p className="product-discount"><Tag size={14}/>{discount(preview)}% off · Save {productMoney(preview.originalPricePaise!-preview.pricePaise)}<small>Calculated from your prices</small></p>}<p className="product-hint">Selling price is independent of MRP. Clear MRP to remove it.</p></div></section>
        <section className={card}><header><Palette size={17}/><h2>4. Stock &amp; Variants</h2><small>Total: {Number.isFinite(quantity(draft))?quantity(draft):'Check quantities'} sarees</small></header><div className="product-panel-body">
          <div role="group" aria-label="Inventory mode" className="product-stock-modes"><button type="button" aria-pressed={draft.inventory.mode==='simple'} onClick={()=>mode('simple')}>One stock count</button><button type="button" aria-pressed={draft.inventory.mode==='variants'} onClick={()=>mode('variants')}>Stock by colour</button></div>
          <div aria-invalid={Boolean(errors.inventory)} tabIndex={-1} aria-label="Stock quantities">{draft.inventory.mode==='simple'?<div className="product-fields"><label className="product-label">Available quantity<input aria-label="Stock quantity" className={field} type="number" min={0} max={1000000} step={1} value={Number.isNaN(draft.inventory.quantity)?'':draft.inventory.quantity??0} onChange={e=>set('inventory',{mode:'simple',quantity:e.target.value===''?NaN:Number(e.target.value)})}/></label>{text('colorName','Main colour (optional)')}{text('colorHex','Main colour swatch',false,'color')}</div>:<div className="product-variants">{(draft.inventory.variants||[]).map((variant,index)=><div key={variant.id} className="product-variant"><div className="product-variant-fields">{(['hex','name','quantity'] as const).map(key=>variantField(variant,index,key))}</div><small>Code: {variant.sku}</small><div className="product-variant-actions"><button type="button" disabled={!index} onClick={()=>{const next=[...(draft.inventory.variants||[])];[next[index-1],next[index]]=[next[index],next[index-1]];set('inventory',{mode:'variants',variants:next});}}>Move colour {index+1} earlier</button><button type="button" className="product-text-button" onClick={()=>{if(variant.quantity>0&&!window.confirm('Remove this colour and its quantity from this product? Historical order snapshots are kept.'))return;set('inventory',{mode:'variants',variants:(draft.inventory.variants||[]).filter(old=>old.id!==variant.id)});}}>Remove colour {index+1}</button></div></div>)}<button type="button" className="product-add-colour" disabled={(draft.inventory.variants?.length||0)>=20} onClick={()=>set('inventory',{mode:'variants',variants:[...(draft.inventory.variants||[]),newColour()]})}><Plus size={14}/>Add colour</button><p className="product-hint">The total is calculated from colour quantities. Swatches are display hints; use the colour name for accuracy.</p></div>}{errors.inventory&&<p className="product-field-error">{errors.inventory}</p>}</div>{text('lowStockThreshold','Low-stock threshold',false,'number')}
          {saved&&<p className="product-hint">Stock changes are audited. If an order or another administrator changes stock, your save will be rejected and your inputs kept for review.</p>}
        </div></section>
        <details className={card+' product-optional'}><summary><SlidersHorizontal size={17}/><h2>More Saree Details (Optional)</h2><ChevronDown size={15}/></summary><div className="product-panel-body product-fields">{text('fabric','Fabric (optional)')}{text('weaveType','Weave (optional)')}{text('zariType','Zari details (optional)')}{text('sareeLength','Saree length (include unit, optional)')}{text('weightGrams','Weight in grams (optional)',false,'number')}<label className="product-label">Blouse piece included<select aria-label="Blouse piece included" className={field} value={draft.blouseIncluded?'yes':'no'} onChange={e=>set('blouseIncluded',e.target.value==='yes')}><option value="yes">Yes</option><option value="no">No</option></select></label>{text('blouseDetails','Blouse details (optional)')}{text('careInstructions','Care instructions (optional)',true)}<p className="product-hint product-full">Permanent storefront link: /product/{draft.slug}</p><button type="button" className="product-text-button" onClick={()=>setManageCategories(true)}>Manage Categories</button></div></details>

      </div>
      <aside className="product-editor-aside">{placement}<section className={card+' product-local-preview'}><header><Eye size={17}/><h2>Storefront Card Preview</h2></header><div className="product-panel-body"><p className="product-hint">Private preview · Unsaved changes are not live.</p>{coverImage?<img src={coverImage.url} alt={coverImage.alt||'Selected saree preview'}/>:<div className="product-preview-placeholder"><ImageIcon size={30}/><span>Add a cover photograph</span></div>}<span className="product-category">{selectedCategory?.name||'Category'}</span>{draft.newArrival&&<span className="product-status">New Arrival</span>}<h3>{draft.name||'Your saree name'}</h3><div className="product-price"><strong>{productMoney(preview.pricePaise)}</strong>{preview.originalPricePaise!==null&&preview.originalPricePaise>preview.pricePaise&&<del>{productMoney(preview.originalPricePaise)}</del>}</div><p>{quantity(draft)} sarees available</p></div></section><section className={card}><header><h2>Publication readiness</h2></header><div className="product-panel-body">{readiness.length?<p>Before publishing, add or check: {readiness.join(', ')}.</p>:<p>Required details are present. Publishing also checks that the category and photographs are ready.</p>}{saved&&saved.status!=='Archived'&&<button form="product-editor" className="product-text-button" type="submit" value="Archived" disabled={saving||uploading||!writable}>Archive product</button>}<button type="button" disabled className="product-secondary">Delete unavailable</button></div></section></aside>
    </fieldset></form>
    <div className="product-save-status" role="status">{saving?'Saving...':uploading?'Photos are uploading. Please wait before saving.':dirty?'Unsaved changes':''}</div>
    <footer className="product-editor-mobile-actions">{actions}</footer>
    {newCategory&&<CategoryEditor onClose={()=>setNewCategory(false)} onSaved={categoryId=>{set('categoryId',categoryId);setNewCategory(false);retryCategories();}}/>}{manageCategories&&<CategoryDrawer onClose={()=>setManageCategories(false)}/>}
  </section>;
}

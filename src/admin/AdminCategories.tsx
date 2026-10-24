import React, { useEffect, useRef, useState } from 'react';
import { categorySlug, validateCategory, type Category, type CategoryInput } from '../categories/model.ts';
import { allocateCategoryId, categoryError, createCategory, editCategory } from '../categories/repository.ts';
import { useCategories } from '../categories/useCategories.ts';

const button = 'min-h-11 px-4 rounded-lg border border-[#B88A44] text-[#780D24] disabled:opacity-50';
const field = 'w-full min-h-12 rounded-lg border border-[#E8DDD6] bg-[#FBF7F0] px-3 text-sm';

export function AdminCategories({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { state, retry } = useCategories(true);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [success, setSuccess] = useState('');
  return <section className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8DDD6] pb-4">
      <div><h1 className="font-serif text-2xl sm:text-[28px] font-semibold">Manage Categories</h1><p className="text-sm text-[#5F5552] mt-1">Names, visibility and display order for the storefront.</p></div>
      <div className="flex flex-wrap gap-2"><button className={button} onClick={() => onNavigate('/admin/products')}>Products &amp; Inventory</button><button className={button + ' bg-[#780D24] text-white'} disabled={state.status !== 'ready'} onClick={() => { setSuccess(''); setEditing('new'); }}>Add category</button></div>
    </header>
    {success && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">{success}</p>}
    {state.status === 'loading' && <p role="status" className="py-6 text-sm">Loading categories…</p>}
    {state.status === 'error' && <div role="alert" className="space-y-3 rounded-lg border border-red-200 p-4 text-sm"><p>{state.message}</p><button className={button} onClick={retry}>Retry categories</button></div>}
    {state.status === 'ready' && (state.items.length === 0 ? <div className="rounded-xl border border-[#E8DDD6] bg-white p-6 text-center space-y-3"><p>No categories yet.</p><p className="text-sm text-[#5F5552]">Add a category when its name and URL are ready.</p></div> : <ul className="space-y-3">
      {state.items.map(category => <li key={category.id} className="flex flex-wrap gap-3 justify-between items-center rounded-xl border border-[#E8DDD6] bg-white p-4">
        <div className="min-w-0 flex-1 basis-52"><h2 className="font-serif text-lg break-words">{category.name}</h2><p className="text-xs text-[#5F5552] break-all">/collections/{category.slug}</p>{category.description && <p className="text-sm mt-2 break-words">{category.description}</p>}<p className="text-xs mt-2 text-[#5F5552]">{category.enabled ? 'Enabled' : 'Disabled'} · Display order {category.displayOrder}</p></div>
        <button className={button} aria-label={`Edit ${category.name}`} onClick={() => { setSuccess(''); setEditing(category); }}>Edit</button>
      </li>)}
    </ul>)}
    <p className="text-sm text-[#5F5552]">Deletion is unavailable until product references can be verified. Disable a category to remove it from public listings.</p>
    {editing && <CategoryEditor category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSuccess('Category saved.'); }} />}
  </section>;
}

export function CategoryEditor({ category, onClose, onSaved }: { category?: Category; onClose: () => void; onSaved: (id:string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saveLock = useRef(false);
  const id = useRef(category?.id || '');
  const slugChanged = useRef(false);
  const [draft, setDraft] = useState<CategoryInput>(category || { name: '', slug: '', description: '', enabled: false, displayOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { previous?.focus(); };
  }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saveLock.current) return;
    let valid: CategoryInput;
    try { valid = validateCategory(draft); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Check the category fields.'); return; }
    saveLock.current = true; setSaving(true); setError('');
    try {
      if (category) await editCategory(category, valid);
      else { id.current ||= allocateCategoryId(); await createCategory(id.current, valid); }
      onSaved(id.current);
    } catch (failure) { setError(categoryError(failure)); }
    finally { saveLock.current = false; setSaving(false); }
  };
  return <dialog ref={dialog} aria-labelledby="category-editor-title" onCancel={event => { event.preventDefault(); if (!saveLock.current) onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-xl border border-[#E8DDD6] bg-white p-5 text-[#231919] shadow-xl backdrop:bg-black/50">
    <h2 id="category-editor-title" className="font-serif text-2xl">{category ? 'Edit category' : 'Add category'}</h2>
    <form onSubmit={save} className="space-y-4 mt-4">
      <fieldset disabled={saving} className="space-y-4 min-w-0">
        <label className="block text-sm space-y-1"><span>Name</span><input autoFocus required minLength={2} maxLength={80} className={field} value={draft.name} onChange={event => { const name = event.target.value; setDraft(old => ({ ...old, name, ...(!category && !slugChanged.current ? { slug: categorySlug(name) } : {}) })); }} /></label>
        <label className="block text-sm space-y-1"><span>URL slug</span><input required maxLength={80} readOnly={Boolean(category)} className={field} value={draft.slug} onChange={event => { slugChanged.current = true; setDraft(old => ({ ...old, slug: event.target.value })); }} /></label>
        <p className="text-xs text-[#5F5552]">{category ? 'The URL stays fixed when you rename this category.' : 'The URL slug is permanent. Review it before saving.'}</p>
        <label className="block text-sm space-y-1"><span>Description (optional)</span><input maxLength={240} className={field} value={draft.description || ''} onChange={event => setDraft(old => ({ ...old, description: event.target.value }))} /></label>
        <label className="block text-sm space-y-1"><span>Display order</span><input required type="number" min={0} max={9999} step={1} className={field} value={Number.isNaN(draft.displayOrder) ? '' : draft.displayOrder} onChange={event => setDraft(old => ({ ...old, displayOrder: event.target.value === '' ? NaN : Number(event.target.value) }))} /></label>
        <label className="flex items-center gap-3 min-h-11 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#780D24]" checked={draft.enabled} onChange={event => setDraft(old => ({ ...old, enabled: event.target.checked }))} />Enabled on storefront</label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={saving} className={button + ' bg-[#780D24] text-white'}>{saving ? 'Saving…' : 'Save category'}</button><button type="button" disabled={saving} className={button} onClick={onClose}>Cancel</button>{category && <button type="button" disabled title="Disable this category instead; product references cannot yet be verified." className={button}>Delete unavailable</button>}</div>
    </form>
  </dialog>;
}

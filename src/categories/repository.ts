import { collection, doc, onSnapshot, query, where, runTransaction, serverTimestamp, Timestamp, type Firestore } from 'firebase/firestore';
import { getDatabaseClient } from '../services/firebase/database.ts';
import { orderCategories, validateCategory, type Category, type CategoryInput } from './model.ts';

export type CategoryState = { status: 'loading' } | { status: 'ready'; items: Category[] } | { status: 'error'; message: string };
export function categoryError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : '';
  if (code === 'permission-denied') return 'Permission denied. Refresh your permissions or contact the store owner.';
  if (code === 'category/duplicate-slug') return 'That URL slug is already in use. Choose another slug.';
  if (code === 'category/conflict') return 'This category changed while you were editing. Close this editor and reopen the latest category before saving again.';
  if (code === 'category/missing') return 'This category is no longer available. Reload the list.';
  return 'Categories could not be saved or loaded. Check your connection and try again.';
}
function problem(code: string): never { throw Object.assign(new Error(code), { code }); }
function decode(id: string, data: Record<string, unknown>): Category {
  if (!(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp)) throw new Error('Invalid category timestamps');
  const raw = data as unknown as CategoryInput;
  if (typeof raw.name !== 'string' || typeof raw.slug !== 'string' || (raw.description !== undefined && typeof raw.description !== 'string')) throw new Error('Invalid category fields');
  const valid = validateCategory(raw);
  return { ...valid, id, createdAt: data.createdAt.toMillis(), updatedAt: data.updatedAt.toMillis() };
}
export function watchCategories(admin: boolean, publish: (state: CategoryState) => void) {
  publish({ status: 'loading' });
  let active = true;
  let unsubscribe = () => {};
  let timeout: ReturnType<typeof setTimeout>;
  const fail = (error: unknown) => {
    if (!active) return;
    clearTimeout(timeout); unsubscribe(); publish({ status: 'error', message: categoryError(error) });
  };
  const waitForServer = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fail(new Error('Server check timed out')), 10000);
  };
  try {
    const ref = collection(getDatabaseClient(), 'categories');
    waitForServer();
    unsubscribe = onSnapshot(admin ? ref : query(ref, where('enabled', '==', true)), { includeMetadataChanges: true }, snapshot => {
      if (!active) return;
      if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) { publish({ status: 'loading' }); waitForServer(); return; }
      clearTimeout(timeout);
      try { publish({ status: 'ready', items: orderCategories(snapshot.docs.map(item => decode(item.id, item.data()))) }); }
      catch (error) { fail(error); }
    }, fail);
  } catch (error) { fail(error); }
  return () => { active = false; clearTimeout(timeout); unsubscribe(); };
}

export function allocateCategoryId(database = getDatabaseClient()) { return doc(collection(database, 'categories')).id; }

// Transactions plus deployed rules form the persistence boundary. Callers keep
// one allocated ID per create dialog, making an uncertain successful retry safe.
export async function createCategory(id: string, input: CategoryInput, database: Firestore = getDatabaseClient()) {
  const valid = validateCategory(input);
  const reference = doc(database, 'categories', id);
  const slugReference = doc(database, 'categorySlugs', valid.slug);
  await runTransaction(database, async transaction => {
    const [existing, slug] = await Promise.all([transaction.get(reference), transaction.get(slugReference)]);
    if (existing.exists()) {
      const previous = existing.data();
      if (previous.slug === valid.slug && previous.name === valid.name && (previous.description || '') === valid.description && previous.enabled === valid.enabled && previous.displayOrder === valid.displayOrder && slug.data()?.categoryId === id) return;
      problem('category/conflict');
    }
    if (slug.exists()) problem('category/duplicate-slug');
    transaction.set(reference, { ...valid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    transaction.set(slugReference, { categoryId: id, createdAt: serverTimestamp() });
  });
}
export async function editCategory(category: Category, input: CategoryInput, database: Firestore = getDatabaseClient()) {
  const valid = validateCategory(input);
  if (valid.slug !== category.slug) throw new Error('The category URL slug cannot change.');
  const reference = doc(database, 'categories', category.id);
  await runTransaction(database, async transaction => {
    const existing = await transaction.get(reference);
    if (!existing.exists()) problem('category/missing');
    if (existing.data().updatedAt.toMillis() !== category.updatedAt) problem('category/conflict');
    transaction.update(reference, { ...valid, updatedAt: serverTimestamp() });
  });
}

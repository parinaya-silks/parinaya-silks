export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  enabled: boolean;
  displayOrder: number;
}
export interface Category extends CategoryInput {
  id: string;
  createdAt: number;
  updatedAt: number;
}
export function categorySlug(name: string) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/g, '');
}
export function validateCategory(input: CategoryInput): CategoryInput {
  const name = input.name.trim();
  const description = input.description?.trim() || '';
  if (name.length < 2 || name.length > 80 || /[\x00-\x1f\x7f]/.test(name)) throw new Error('Name must be 2–80 characters without control characters.');
  if (input.slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) throw new Error('Use a slug of up to 80 lowercase letters, numbers and single hyphens.');
  if (description.length > 240 || /[\x00-\x1f\x7f]/.test(description)) throw new Error('Description must be at most 240 characters on one line.');
  if (typeof input.enabled !== 'boolean' || !Number.isInteger(input.displayOrder) || input.displayOrder < 0 || input.displayOrder > 9999) throw new Error('Display order must be a whole number from 0 to 9999.');
  return { name, slug: input.slug, description, enabled: input.enabled, displayOrder: input.displayOrder };
}
export function orderCategories(items: Category[]) {
  return [...items].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

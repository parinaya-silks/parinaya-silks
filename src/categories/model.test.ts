import test from 'node:test';
import assert from 'node:assert/strict';
import { categorySlug, orderCategories, validateCategory, type Category, type CategoryInput } from './model.ts';
const input: CategoryInput = { name: 'Silk Sarees', slug: 'silk-sarees', description: '', enabled: false, displayOrder: 0 };
test('category input normalization, safe slugs and strict constraints', () => {
  assert.equal(categorySlug('  Festive & Silk — Édit  '), 'festive-silk-edit');
  assert.equal(validateCategory({ ...input, name: ' Silk Sarees ', description: ' Details ' }).description, 'Details');
  for (const change of [{ name: 'x' }, { name: 'a\nb' }, { slug: 'MixedCase' }, { slug: '../other' }, { slug: 'a--b' }, { slug: '' }, { slug: 'x'.repeat(81) }, { enabled: 'true' }, { displayOrder: -1 }, { displayOrder: 1.2 }, { displayOrder: NaN }, { description: 'x'.repeat(241) }]) {
    assert.throws(() => validateCategory({ ...input, ...change } as CategoryInput));
  }
});
test('category order is deterministic with name and stable ID tie breaks', () => {
  const category = (id: string, name: string, displayOrder: number): Category => ({ ...input, id, name, displayOrder, createdAt: 1, updatedAt: 1 });
  assert.deepEqual(orderCategories([category('z','Z',0),category('b','A',0),category('a','A',0),category('c','C',2)]).map(item => item.id), ['a','b','z','c']);
});

# Admin catalog and inventory guide

For authorized catalog operators. Baseline: local application, 11 November 2026. Actual production catalog, account access and upload acceptance: **Pending confirmation**. Admin requires a Firebase admin claim and an enabled permission record; a customer account alone is insufficient.

## Categories

Open **Categories** to create/edit a collection name, description, display order and visibility. Review the generated link before creation: a saved slug is permanent. Lower saved display orders appear first in Admin and the storefront. Saved ranks are shown exactly. Legacy zeros/duplicates can be explicitly normalized with Save sequential order after reviewing the full-list sequence; reads never renumber them. Positive rank changes must be unique. New categories suggest the saved maximum + 1; editing uses precise timestamp concurrency checks. Visibility controls public availability without deleting referenced history.

Use the category image workflow when supplying a homepage collection image. Upload and verify the image, review its focal/alternative-text fields where offered, and save the category. An upload alone does not publish a category image. Disabling a category can hide its products publicly even if those products remain Published.

## Products

Open **Products** or **Add Product**. Maintain:

- Identity: name, SKU, category, link and description.
- Pricing: selling price and optional original price; discount badges derive from valid price differences.
- Textile details: fabric, weave/zari type, colour, dimensions, weight where used, care instructions and blouse inclusion/details.
- Discovery: featured/new-arrival settings and Draft/Published/Archived status.
- Media: up to eight supported product images, selected cover, alternative text and optional supported reel/video URL.
- Inventory: simple quantity or individual variant SKUs, names, hex colours and quantities; low-stock threshold.

Keep Draft while preparing a listing. Verify category visibility, media, price and stock before publishing. Archived/hidden states are preferable to inventing deletion workflows or rewriting existing order records. Product snapshots in accepted orders retain their original commercial details.

### Image workflow

The application requests a signed Cloudinary upload, uploads the image, then verifies the resulting asset server-side before allowing it to be saved as product media. Supported formats and size/count limits come from the editor/model; the current product model allows JPG/PNG/WebP and a 10 MB maximum per image.

If verification fails, use the offered verification retry rather than repeatedly uploading. A local preview is not proof that the asset is verified or published. Do not paste credentials into image fields or share signed upload payloads.

### Stock modes

**Simple:** one stock count and the product's colour name/hex value. **Variants:** separate stock counts and identity/colour fields for each variant. Verify all SKUs and hex values before saving. Do not switch a live product's stock structure casually while unresolved orders exist; review the actual editor restrictions and existing records first.

## Inventory operations

Use **Inventory** for search/filtering, stock state, quantity summaries and available exports. Open a product/variant's adjustment action, review the resulting quantity and supply the required reason. Confirm only the intended adjustment. Stock history provides an audit trail; it is not a substitute for payment/order evidence.

Orders deduct/reserve stock through the trusted backend. Online failure/dismissal is not an instruction to manually replenish it: safe expiry/reconciliation may still own the hold. Before adjusting apparent missing stock, inspect the order/payment reservation state. Do not restore stock both manually and through an order restock action.

Dashboard low-stock cards show a bounded scan, not necessarily the entire catalog. Use Inventory for further review. Product/inventory filtering, pagination and export availability should be described using the actual control labels, not a separate unmounted reports component.

## Saving and conflicts

Changes are accepted only after a successful server response. If another session edited the same record, review/reload the latest version; do not overwrite unseen changes. If a response is uncertain, use the existing recovery/retry behaviour instead of assuming success or repeating a stock movement with a new identity.

## Permanent deletion

Delete permanently requires a named confirmation and typing DELETE. The server checks dependencies and the current revision. Disable a category first; referenced categories cannot be deleted. Products can be deleted only as untouched initial Drafts with no references; otherwise Archive preserves publication and history. Retired identities/links and a minimal deletion audit remain reserved. See [deletion limits](../OWNER_IMPROVEMENTS.md).

## Routine publishing checklist

- Correct category, permanent link, SKU and visibility.
- Correct selling/original prices and derived discount.
- Valid simple/variant stock and colour values.
- Verified cover/gallery images; useful alternative text; correct blouse/reel details.
- Public product acceptance after authorized publishing, without changing historical orders.

Client-approved product copy, image rights, SKU conventions and responsibility for physical-stock reconciliation are **Pending confirmation**.

Sources: `src/admin/ProductManager.tsx`, `src/admin/ProductImages.tsx`, `src/admin/categories/`, `src/admin/inventory/`, `src/products/model.ts`, `server/categories.ts`, `server/catalog.ts`, `server/cloudinary.ts`, `server/business.ts`. Reuse detailed [product guide](../PRODUCTS_STITCH.md), [category guide](../CATEGORIES.md), [workflow history](../PRODUCT_WORKFLOW.md) and [inventory notes](../INVENTORY.md); historical verification is not fresh Production evidence.

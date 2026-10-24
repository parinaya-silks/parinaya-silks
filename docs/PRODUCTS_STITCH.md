# Products List and Add/Edit Product - Stitch implementation

This change is local only. Production products, media, accounts, rules and indexes were not changed. No commit, push or deployment was performed.

## Reference mapping

The owner-approved files under Downloads are design references, not application instructions:

| Folder | Screen |
| --- | --- |
| `1/code.html`, `1/DESIGN.md`, `1/screen.png` | Desktop Products list, actions and archive confirmation |
| `2/code.html`, `2/DESIGN.md`, `2/screen.png` | Mobile product cards and filter sheet |
| `3/code.html`, `3/DESIGN.md`, `3/screen.png` | Desktop Add/Edit Product, two-column layout, photos and preview |
| `4/code.html`, `4/DESIGN.md`, `4/screen.png` | Mobile editor sections, colour stock and save actions |

The existing local Lora font, maroon/ivory/gold palette, 192px sidebar, approximately 58px header and logo are retained. Product-only CSS controls the new view. Dashboard, Orders, Customers and storefront styles are unchanged.

## Catalogue and navigation

The authenticated existing `list` API returns 50-record pages. The new view reads every page before displaying counts, filtering, sorting or exporting. Any failed/duplicate/looping page produces an explicit error with Retry; it never becomes a successful partial catalogue. A documented safety limit of 10,000 records / 201 API pages fails explicitly rather than silently truncating. No new read model, migration or composite index is introduced. This is a complete loaded catalogue, not a globally frozen Firestore transaction; refresh to see subsequent outside edits.

Search covers name, code, slug, weave and main colour across that catalogue. Category, publication and availability filters combine; the mobile sheet applies staged selections only on Apply. Low stock means positive quantity at or below that product's configured threshold. Zero is always Out of stock, including drafts and published products. Disabled/missing categories have a separate warning. Sorting supports newest, oldest, name and both price directions with stable ID ties. Ten rows/cards form one page at every viewport. Filter/sort/page/scroll history is UID-scoped and survives editor navigation and browser history. Superseded loading requests are aborted/ignored; locally changing filters cannot be overwritten by an older filter request.

CSV exports current matching records, or explicitly selected current-page records, with integer-paise-derived prices and spreadsheet formula protection. Public viewing is enabled only for published products with an enabled category. Publication does not imply availability. Archive is confirmed; deletion remains blocked.

## Editor and persistence

The existing `/admin/products/new` and `/admin/products/edit/{id}` routes remain direct-linkable and reloadable. Product IDs, generated codes, existing variant IDs/SKUs and permanent slugs are preserved. The code is read-only. Optional specifications stay collapsed; plain descriptions, photo management, independent selling price/MRP, active inventory source and placement flags use the existing schema and APIs.

Quick Create Category uses the existing category editor, transaction, ID retry protection, unique slug reservation and security rules. It retains all entered product fields/photos, refreshes options and selects the successful new category. Its Enabled setting is explicit; a disabled new category cannot publish a product.

Equal MRP/selling prices produce no discount or crossed-out storefront price. Clearing MRP persists null. MRP below selling price is invalid. Decimal parsing and range checks continue to store integer paise. No editable discount percentage is added.

The mode tabs and per-colour quantity steppers follow the approved reference. Stock by colour derives its total and preserves stable identities on reordering. The other mode's values are kept in this editor's memory until leaving; mode changes involving existing stock/variants require confirmation. It never copies a simple total into every colour. Existing revisions, transactional inventory audits, checkout deduction and cancellation restoration remain authoritative. A stale save is rejected without discarding inputs. The explicit Load latest stock action adopts current stock/revision and merges untouched fields; it refuses simultaneous conflicting edits to other fields instead of silently overwriting them. Replacing local stock edits requires confirmation.

Photos retain signed Cloudinary tickets, fixed unique non-overwriting public IDs and trusted ownership/metadata verification. Supported input is JPEG/PNG/WebP, maximum 10 MiB each, eight photos. Drag/drop, mobile selection, progress, per-file retry, replacement, cover selection, ordering and alt descriptions are functional. Failed uploads must be retried or dismissed before saving a published product. Removing a photo only detaches it; no Cloudinary deletion occurs. Upload requests are aborted and late state updates ignored on editor unmount/account loss. Validation and uncertain saves retain entered fields and operation IDs. Draft creation retries use the same allocated product ID. Editor state is never replaced by focus/visibility refreshes. Unsaved warnings run on actual navigation/discard only.

The server reads absent optional legacy fields with neutral schema defaults and still validates essential fields. Its existing field-scoped `update` preserves unrelated stored fields; hidden optional fields remain included in the editor's save input. This does not migrate production records.

## Necessary adjustments from the prototype

- The approved compact shell and Lora override prototype shell widths, extra branding, EB Garamond/Hanken fonts and simulated phone chrome.
- Existing generated `PS-...` codes replace illustrative `PS-KNC-043` numbering; no new code allocator or ID migration is introduced.
- Actual 10 MiB upload limits replace the prototype's 15 MB claim. Photo descriptions remain required for publication by the existing API, with editable generated defaults.
- Descriptions remain plain text; unsupported Markdown/AI formatting controls are omitted.
- Existing publication requirements are labelled '* to publish'; drafts can remain incomplete. Category creation retains real Enabled/display-order controls.
- New Arrival has the existing boolean behavior. No invented 14/30-day expiry, margin, Silk Mark certification, Royal Reserve tier, artisan module or tax-inclusion claim is shown.
- No autosave or live-unsaved-preview claim is made. The card is explicitly a private preview. Existing business validation remains authoritative.

## Local acceptance

Use the existing loopback Auth/Firestore test harness. `scripts/products-fixture-control.ts` refuses non-loopback environments and prepares 63 synthetic products/categories; Cloudinary requests are fixtures, never real uploads. Do not run it against production.

1. Open Products and verify complete counts, late-page code search, combined filters, all sorts, pagination and CSV scope.
2. Edit and return; refresh direct routes and use Back/Forward. Confirm list context survives.
3. Save a minimal draft, retry safely, create/assign a category without losing fields and complete publication requirements.
4. Check decimal pricing, equal/cleared MRP, both stock modes and stable colour IDs after reordering.
5. Upload/retry/replace/order/choose a cover. Reject invalid files and unresolved failures. Verify optional specifications survive saves.
6. Simulate an isolated concurrent stock change: stale save must fail. Load latest stock explicitly and confirm local description/price/photos remain.
7. Check publish/unpublish/archive, category-hidden warnings, zero stock and permanent-deletion denial.
8. Review list, filter sheet and editor at 100% zoom from 320px through 1920px; footer must not cover the last form controls.

Release is application code only, performed separately by the owner. No new Firebase rules/index publication or production preparation is required. Hosted behavior and real Cloudinary uploads are not established by local fixtures.

## Changed files

- `src/admin/AdminProducts.tsx`, `ProductManager.tsx`, `products/model.ts`, `products/model.test.ts`, `products/products.css`: full-catalogue view, filter sheet, CSV, lifecycle actions, account-scoped context and product-only styling.
- `src/admin/AdminProductForm.tsx`, `ProductImages.tsx`: routable editor, conflict recovery, quick category creation, verified media controls and private preview.
- `src/admin/AdminCategories.tsx`, `AdminPanel.tsx`: reuse the category editor with its saved ID callback and carry product context through existing navigation.
- `src/products/client.ts`, `model.ts`, `model.test.ts`, `adapter.ts`, `server/catalog.ts`: cancellable uploads, equal-MRP handling, optional legacy reads and preservation/concurrency tests.
- `scripts/product-browser.test.py`, `products-fixture-control.ts`, `catalog-emulator.test.ts`: isolated functional/visual and API regressions. The existing administrator/category/recovery browser tests use the new Products heading/navigation.
- `package.json`: register the new product-view unit tests. No dependency or lockfile changes.

## Validation results

- Typecheck, 96 unit tests and production Vite build passed.
- Six focused emulator suites passed, seven tests total: administrator rules, category rules, product CRUD/media, order/stock, Bag/Wishlist and delivery/checkout review. Product API cases include source-field preservation, absent optional legacy fields and stale non-stock saves retaining concurrent stock.
- The Products browser workflow passed full-catalogue search past the first 50-record API page, combined filters, sorting, pagination/context, filtered CSV and failed-read retry; uncertain draft creation with identical ID/operation retry; category duplicates/create/assign; immutable identifiers; equal/cleared MRP; verified photo failure/retry/replacement/removal/order/cover; optional-field retention; stock conflicts and explicit recovery; mode-change confirmation and stable reordered colour IDs; publish/unpublish/confirmed archive; dirty-navigation refusal and focus/visibility preservation; and the affected public product page.
- Screenshots and horizontal-overflow assertions cover 320, 390, 768, 1024, 1440 and 1920px at normal browser zoom. The desktop list/editor, mobile cards/filter sheet/editor, tablet layout and mobile viewport/save bar were inspected. Both mobile save actions are asserted to stay within the viewport. Screenshots are ignored local artifacts under `.cache/products-design/`.
- Prototype differences are limited to the documented real-data/business constraints and retained compact shell. The screenshots use isolated fixture records and the existing local portrait as test media, not real product uploads.
- The pinned Vercel Node builder/runtime regression passed: builder 24.0.3 produced a `nodejs24.x` artifact; invocation under local Node 22.22.2 without tsx passed both ESM probes. This is packaging evidence, not a hosted deployment check.

The existing large-chunk build advisory remains. Hosted acceptance and actual Cloudinary uploads remain owner release checks. No production readiness or live upload success is claimed from these local tests.

Final integrated browser run: category management, the complete Products workflow and the customer purchase journey all passed together. The category browser height assertion now matches the existing approved compact controls (40px mobile, at least 38px desktop); category UI sizing was not enlarged. Native Back/Forward and retained list filters were verified. The equal-MRP adapter regression keeps the storefront and private preview consistent. Final rupee labels, separator characters and decrement glyphs were checked after correcting a Windows pipe encoding issue during implementation. Final typecheck, all 96 unit tests, build and diff checks passed.

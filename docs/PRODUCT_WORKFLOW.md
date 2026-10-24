# Latest Products interface

The owner-approved Products List and Add/Edit implementation is documented in [PRODUCTS_STITCH.md](PRODUCTS_STITCH.md). It supersedes the older form layout and loaded-page-only list behavior below.

# Product workflow repair — 20 October 2026

Local preparation only. No live product/category, media, permissions, rules or indexes were changed; no commit, push or deployment was made. The owner's product named **Test** is retained.

## Confirmed causes and Production evidence

1. **Missing public-list index.** The deployed `GET /api/catalog` returned HTTP 503 JSON `index-required`, request ID `b4479d8f-badd-4d26-baaa-2a9824a491b6`. A trusted read-only query against `parinaya-silks` / `(default)` reproduced Firestore error 9 and supplied the exact required index. Listing the product collection's composite indexes returned none. `firestore.indexes.json` already declares the required status/creation-time index; it has not been deployed. This is distinct from the earlier module-loading failure.
2. **The existing product is eligible.** Read-only inspection found product `4uHf6KMAGq091NArs1L5`, slug `test`, schema 1, status `Published`, simple stock 35, category `vemNxToIMaVDOfIiqssl` (`festival-offers`). The category exists and `enabled` is literally true. Production `GET /api/catalog?slug=test` returned 200 for that same product, request ID `4f9060d9-bd37-4052-a837-a2d6a51618dc`. Direct slug lookup does not use the missing list index. Neither product nor category needs recreating or changing.
3. **Background access checks hid the editor.** Focus/visibility/interval refreshes forced token refresh, removed and recreated the permission-record listener, and published the blocking `checking` state. `AdminAccess` retained the component but set its ancestor hidden/inert/aria-hidden, producing interruptions and a focused-hidden-input warning. This was hiding/revalidation, not an intentional page reload. Overlapping token observers also repeated the same inspection.
4. **Stock serialization was unnecessarily contradictory.** Both inventory fields were required even in the inactive mode, and switching modes reset quantities/colours. Legacy colour records required a separate zero total. The editor exposed stable internal colour IDs/codes as mandatory entry fields. The validator rejected actual contradictions, but the wire/storage shape and destructive switching made the workflow difficult.
5. **Publication required optional saree details.** Fabric, weave, length and care were mandatory; code, slug and technical stock settings dominated the form. Public responses also reused the administrator record shape. These have been simplified without opening draft visibility or weakening trusted writes.

## Exact owner action for public loading

In Firebase Console → **parinaya-silks → Firestore Database → (default) → Indexes**, create this single composite index and wait until its state is **Enabled/READY**:

| Setting | Value |
| --- | --- |
| Collection ID | `products` |
| Query scope | Collection |
| Field | `status` — Ascending |
| Field | `createdAt` — Descending |
| Final document-name order | `__name__` — Descending (implicit from the last descending sort) |

The existing `firestore.indexes.json` contains the matching definition. Publishing that reviewed index configuration is an alternative; reconcile any other deployed index definitions rather than removing unrelated ones. No Firestore rule or environment change is indicated by this observed error. Keep the previously required runtime/credential settings intact. Live rules were not changed or audited by this task; existing client permission checks and server-side verification remain in force.

## Behavior after the local changes

- **Public data:** Shop, category pages, homepage and search share public GET listing; direct product pages use public slug lookup. Both server paths require Published plus a currently enabled category. The explicit public projection omits revision/update/operation metadata, Cloudinary registry identifiers and internal colour codes. It retains shopping fields, images and stock information. Privileged POST actions continue checking token revocation, approved project, literal `admin: true` and `adminAccess/{uid}.enabled === true`; mutations recheck the access record in their transaction.
- **Refresh behavior:** Public requests remain no-store. Visibility/focus/30-second refreshes re-evaluate current category eligibility. Background refreshes keep existing content mounted while checking; errors remain errors, never empty successes. Requests are deduplicated; stale responses cannot update a different slug or an unmounted view. Existing homepage featured/new-arrival ordering/eligibility is unchanged.
- **Administrator revalidation:** Initial/new-user sessions still block. Same-user checks retain the same visible DOM and the live access-record subscription, deduplicate overlapping token work, and coalesce rapid focus events. Confirmed sign-out, removed claim or disabled record removes protected access. Transient failures/timeouts retain work but disable controls and show Retry permissions. Cached records cannot initially authorize; cache-only verification is bounded by ten seconds, and expired tokens pause actions. Retrying a timed-out request ignores its late result. Backend enforcement is unchanged.
- **Entry:** Three main sections: Product details, Photos, Price & stock. Saree details are optional and expandable. Product link and default product code derive from the allocated document identity; saved links remain permanent. Existing atomic slug reservations and per-product colour-ID/code uniqueness remain enforced. Custom product codes retain their existing semantics; this change introduces no new global SKU registry or migration.
- **Categories:** Only enabled choices are available for new selection/publication. Existing disabled/missing relationships stay visible and unchanged. An existing missing relationship may be retained when saving a draft, while new invalid references/publication are rejected. Manage Categories opens a modal drawer without routing away or discarding the product form; closing restores focus.
- **Photos:** Signed upload and trusted verification are retained. Add, preview, description, cover, order, replacement and removal are supported. Replacement keeps the old photo until the new asset verifies and preserves its description/cover position. Default descriptions use the entered product name and remain editable. No old asset is deleted.
- **Stock:** Default One stock quantity sends/stores only `{mode:'simple', quantity}`. Stock by colour sends/stores only `{mode:'variants', variants}`; total is derived. Existing neutral legacy fields are accepted on read and normalized on save. Contradictory nonzero totals/nonempty inactive colours still fail. Temporary values survive mode switching in the mounted form; only the chosen mode is persisted. Stable colour IDs and default codes are generated.
- **Save:** Save Draft, Publish Product and Save Changes use explicit persistence, field errors, an accessible summary and focus/scroll to the first invalid area. Failed requests keep input; saves/uploads prevent duplicate submission. Draft/Published/Archived status, revisions, paise pricing, permanent slug checks, media ownership and history-preserving deletion denial remain enforced. Actions flow below the form rather than covering mobile fields. Unsaved-change checks apply to navigation/reload/closure, not blur.

## Changed files

| Files | Purpose |
| --- | --- |
| `src/admin/sessionWatcher.ts`, `.test.ts`, `src/services/firebase/adminAuth.ts`, `src/admin/AdminAccess.tsx`, `permission.tsx` | Session/controller tests, persistent listener, background verification and recoverable paused actions. |
| `src/admin/AdminProductForm.tsx`, `ProductImages.tsx`, `ProductManager.tsx` | Simplified form, category drawer, generated identity, stock switching, photo replacement and retained inputs. |
| `src/products/model.ts`, `model.test.ts` | Canonical active-mode inventory, legacy compatibility, optional publication details and public types. |
| `server/catalog.ts`, `server/publicProduct.ts` | Trusted draft-category handling and explicit public projection. |
| `src/products/client.ts`, `adapter.ts`, `hooks.ts`, `src/types/index.ts` | Public types/mapping and request refresh lifecycles. |
| `scripts/catalog-emulator.test.ts`, `scripts/product-browser.test.py`, `package.json` | Visibility/stock/API/browser regressions and unit-test registration. |
| This guide, `docs/PRODUCTS.md`, `docs/ADMIN_ACCESS.md` | Current behavior, evidence and owner acceptance. |

## Acceptance

Local checks: run `npm run lint`, `npm test`, `npm run build`, `npm run test:admin`; optional packaged function check: `npm run test:catalog-runtime` using the previously documented cached builder setup. Cloudinary in the emulator/browser workflow is a fixture, not a live upload.

Completed on the final local revision: root and API TypeScript checks; **49 passing unit tests**; production Vite build; full admin/category/product emulator and browser suite; and the official Vercel function builder/runtime regression. The latter emits a Node 24 artifact and exercises its JavaScript imports on local Node 22.22.2, without tsx; it does not prove execution inside Vercel's hosted wrapper. Editor screenshots at 390px and 1440px were visually reviewed; browser layout checks cover 360, 390, 430, 768, 1024 and 1440px. The build retains the existing large-chunk warning. One intermediate browser run caught a skipped cooldown-time claim refresh; a trailing coalesced check, a dedicated regression and the final passing browser run address it.

Local acceptance uses synthetic emulator data: save a minimal draft, attempt invalid publication and inspect focus/errors, complete required fields/photos, publish, switch stock modes, edit/save/reload, open category management and return, repeatedly switch tabs/focus, test transient permission failure/retry, then verify actual revocation/sign-out still removes access. Check 360–1440px layouts and keyboard access.

Vercel acceptance after the owner creates the index and releases the code:

1. Confirm anonymous `/api/catalog` is 200, not 503 or a substituted empty result.
2. Verify the **same existing Test product** on `/shop`, `/collections/festival-offers`, homepage, search and `/product/test`; reload each. Homepage promotions retain their own eligibility rules.
3. Open the existing product in the editor, enter unsaved text, repeatedly switch tabs/windows and press the Windows key. Confirm input, photos, focus and scroll persist with no hidden-focused-input warning. Discard the temporary text deliberately rather than making an unintended live save.
4. Confirm production loading/error/empty/no-results states and retry. Do not disable categories, change publication, upload test media or change account permissions solely for acceptance without separate authorization; those mutation paths are covered by emulators.

Hosted successful listing after index creation, production use of the revised editor and live Cloudinary upload/verification remain owner checks. No successful hosted repair is claimed from local tests.

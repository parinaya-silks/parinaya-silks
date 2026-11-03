# Category navigation, overlays, bulk delivery and category artwork

Local changes prepared on 3 November 2026. No application deployment, index publication, rule publication or production business-record write was performed.

## Confirmed production category failure

Credential-free requests to `https://www.parinayasarees.com/api/catalog?browse=1&category=chanderi-sarees&sort=featured` and the equivalent `cotton-sarees` URL returned HTTP 503 with safe code `index-required`. Unfiltered featured browsing returned HTTP 200 with 15 items. The Chanderi request ID was `21b2460f-b739-47db-806e-f53082e12774`; Cotton was `51439deb-de30-4218-ad4f-fe6e97cbc7fc`.

Trusted read-only checks explicitly targeted `parinaya-silks` / `(default)`. Chanderi's enabled slug resolved to exactly one category. Running the actual product queries returned Firestore code 9 and generated missing-index links for all four category sorts. Read-only index metadata showed only two READY product composites: `CICAgOjXh4EK` (status / newest) and `CICAgJiUpoMK` (status / featured / newest). Neither covers a category filter. This establishes an index dependency, rather than a slug mismatch or an inference from HTTP 503. Hosted Vercel runtime-console access was not used; HTTP responses, direct matching queries and index metadata provide the evidence.

`server/browse.ts` already resolves slug to ID and filters published products server-side with stable pagination. That query was preserved. Existing empty/error/disabled/missing-category, combined-filter, Retry and stale-response protections remain in place. No whole-catalog browser filtering was introduced.

## Exact index publication dependency

The following definitions already exist in `firestore.indexes.json`. The minimal review file `docs/required-category-and-bulk-indexes.json` contains only these five definitions. It is preparation, not a deployment command. Compare live definitions first, preserve all existing indexes and publish only missing exact definitions after separate authorization; wait for READY and repeat the matching queries. Do not publish the whole repository manifest blindly.

All use query scope **COLLECTION**, database **(default)**, project **parinaya-silks**. Field order below is exact:

| Collection | Ordered fields |
| --- | --- |
| products | categoryId ASC, status ASC, featured DESC, createdAt DESC, __name__ DESC |
| products | categoryId ASC, status ASC, createdAt DESC, __name__ DESC |
| products | categoryId ASC, status ASC, pricePaise ASC, createdAt DESC, __name__ DESC |
| products | categoryId ASC, status ASC, pricePaise DESC, createdAt DESC, __name__ DESC |
| orders | status ASC, createdAt DESC, __name__ DESC |

The fifth query is the explicit single-source status filter used by the order list (`Shipped`, newest first). Its read-only production probe also returned code 9 with this exact generated definition. It is separate from the four category indexes. Readiness of that orders index was not established by an emulator. Additional combined order filters retain their existing manifest requirements; no additional production index deficiency is asserted here.

Following the existing manifest convention, the review JSON omits the implicit final `__name__ DESC` field. The saved live generated links include it explicitly. Evidence and definition-matching regressions are in `scripts/fixtures/category-navigation-index-evidence.json` and `scripts/catalog-indexes.test.ts`.

## Local implementation

- **Shared overlay manager:** `src/components/modalLayer.ts` now owns the modal stack, fixed-body page lock, scrollbar space, top-layer scroll boundary handling, touch gestures, Tab/focus confinement, Escape, focus restoration and removal cleanup. Opening a child freezes its parent's scroll container and restores its exact position on close. Existing native dialogs and custom navigation/filter drawers use this manager. Ordinary dropdowns stay non-modal. This required small lifecycle changes across Admin and customer dialog components; their layouts and business actions remain intact.
- **Bulk forward statuses:** `OrdersList.tsx`, `BulkActions.tsx`, dashboard `RecentOrders.tsx` and the shared dashboard model provide source-scoped current-page selection and canonical forward targets, including Shipped to Delivered. The Orders list bounds processing to its current page of at most 10, with confirmation, per-order outcomes, skipped reporting and exact operation-ID retries after uncertain responses. Source changes clear selection. Dashboard processing remains bounded to its recent-order page. Backend `server/orders.ts` rechecks source, revision, permission and transition in each transaction. Shipped and Delivered require each order's own courier and AWB; legacy orders missing those details need individual repair in the delivery panel. No shared AWB is assigned, COD collection is untouched and eligible delivery loyalty remains atomic and unique.
- **Optional category artwork:** `CategoryEditor.tsx` reuses `LoginImageEditor.tsx` and existing signed Cloudinary verification with category-bound tickets in `categoryMedia/{mediaId}`. Upload, verification retry, preview, square crop guidance, focal points, alt text, replacement, removal and Cancel are supported. Image action buttons never implicitly submit the category form. A file selection or upload does not publish a setting. `server/categories.ts` accepts canonical category saves through `/api/catalog`, validates verified purpose/category-bound media, preserves unrelated fields and permanent links, and checks edit conflicts. Exact retries do not rewrite timestamps. Public homepage rendering uses saved artwork, then an eligible product cover, then the neutral placeholder, including on image-load failure. Disabled categories and draft products stay private; stored media is never deleted by replacement/removal.

Public settings project only the image rendering metadata. Secrets remain server-side. Both the admin custom claim and enabled access record are required before the new actions, with the record rechecked inside writes. Product-upload validation was preserved. No environment-variable change, source-data migration or Firestore rule change is required. Existing category client rules deny the new image write shape; the trusted API handles writes. Deploy the frontend and API changes together after review. Category subscriptions and normal public-content reloads expose saved changes without a further code release; no new long-lived cache was added.

## Verification and artifacts

Local checks use loopback Firestore/Auth emulators, synthetic accounts/orders and mocked Cloudinary. They are not hosted acceptance evidence.

- 168 unit/index tests passed, TypeScript passed and the production Vite build completed with its existing chunk-size warning. The packaged Vercel Node 24 function artifact passed invocation checks under local Node 22.22.2, with require(ESM) enabled and disabled; this is not a hosted Node 24 invocation.
- Emulator groups: admin rules, customer rules, category rules, catalog, campaigns, loyalty, delivery loyalty, contact, discovery, order listing and the new four-fix suite. These cover both admin checks, customer isolation, purpose-bound media, unsaved publication, retry/conflict safety, per-order fulfillment, mixed results, duplicate loyalty prevention and COD remaining due.
- Eight focused browser suites passed (discovery, social drawer, categories, four fixes, order list, dashboard, checkout design and shopping design). They cover category create/edit/duplicates/concurrent edits, upload failure/retry/save/remove/Cancel, saved image refresh and image-load failure, disabled categories, empty versus failure, category navigation/filter/pagination/stale-response regressions, modal scroll/focus/Escape/unmount, explicit source eligibility, partial bulk failure and a lost-success response retried once safely.
- Responsive captures: 320, 390, 768, 1024 and 1440 px. Existing suites also cover 430/1920 px and short viewports where applicable. Screenshots are local fixture data under `.cache/four-fixes/category-editor-{width}.png`, `bulk-orders-{width}.png` and `bulk-confirm-1440.png`.

Remaining acceptance: publish only the separately authorized missing indexes, verify READY, deploy this reviewed application change, then test live category URLs and authorized bulk/category workflows. Actual mobile Safari hardware and real Cloudinary transfers were not tested. No live orders, customers, media settings or inventory were modified to test these changes. Existing large-client-chunk warnings remain.

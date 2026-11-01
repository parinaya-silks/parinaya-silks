# Storefront discovery and homepage banner correction

## Confirmed production failure (read-only audit)

`GET /api/catalog?browse=1&category=cotton-sarees&sort=featured` returned HTTP 503 with `code: index-required`, request ID `e0640e12-5989-4bab-881a-42af211d5271`. The same category with `sort=newest` returned the same error, request ID `c7e4d887-2fc1-4bde-a245-855f72afb596`. Unfiltered Featured returned HTTP 200 and 15 public products.

Trusted Admin SDK reads explicitly targeted `parinaya-silks`, database `(default)`. The enabled `cotton-sarees` slug resolves to its stored category ID; queries use that ID in `products.categoryId`. Direct matching product queries confirmed Firestore code 9 and the literal missing-index diagnostic, including generated links for all six missing shapes below. This is an index preparation failure, not an authentication or slug-mapping failure. No Vercel runtime logs were obtained in this task; direct Firestore diagnostics and the actual hosted HTTP responses establish the failure.

Read-only metadata found two existing READY product indexes. They were neither changed nor recreated. The missing indexes apply across all enabled category values, not just Cotton Sarees. The exact metadata and generated links are recorded in `scripts/fixtures/discovery-index-evidence.json`. Live evidence is a point-in-time observation; later publication may change readiness.

## Exact release dependencies

Target: `parinaya-silks` / `(default)` / `products`; query scope **COLLECTION** for all rows. Fields below are ordered. `ASC` means ASCENDING; `DESC` means DESCENDING.

| Query | Ordered index fields |
| --- | --- |
| All catalog price-asc | `status` ASC, `pricePaise` ASC, `createdAt` DESC, `__name__` DESC |
| All catalog price-desc | `status` ASC, `pricePaise` DESC, `createdAt` DESC, `__name__` DESC |
| Category newest | `categoryId` ASC, `status` ASC, `createdAt` DESC, `__name__` DESC |
| Category featured | `categoryId` ASC, `status` ASC, `featured` DESC, `createdAt` DESC, `__name__` DESC |
| Category price-asc | `categoryId` ASC, `status` ASC, `pricePaise` ASC, `createdAt` DESC, `__name__` DESC |
| Category price-desc | `categoryId` ASC, `status` ASC, `pricePaise` DESC, `createdAt` DESC, `__name__` DESC |

The six definitions are prepared in `firestore.indexes.json`. The four category definitions now use the exact equality-field order supplied by Firestore. The repository convention omits the implicit final `__name__ DESC`, inherited from the last ordered `createdAt DESC`; the audit fixture retains the fully decoded definitions. Two global price definitions were already present locally. No new query-specific data fields, indexes outside these six, migrations or category records are necessary.

A future authorized operator must compare current metadata, create only absent exact definitions, skip existing exact matches, and wait for READY. Do not blindly deploy the whole manifest or delete existing indexes. Then repeat the matching hosted reads. The frontend and `/api/catalog` code also need the owner's normal application release. **No deployment, index/rule publication or production writes occurred during this task.** Local emulator success does not prove production readiness. No new environment variables, dependencies or security rules are required.

## Discovery contract and local changes

- The homepage rail keeps its horizontal overflow, mobile swipe, anchor links, keyboard focus and scroll snapping. Only `.home-category-rail` hides its native scrollbar. Desktop Previous/Next controls appear on overflow, are disabled at their ends, and use reduced-motion-aware scrolling. Desktop guidance says More collections; mobile retains Swipe for more. No global/body clipping is used to hide page overflow.
- Category links remain `/collections/{slug}`. The existing public category subscription returns enabled categories only. The server resolves the slug to exactly one enabled stored ID, then queries Published products with that `categoryId`. Missing, disabled or ambiguous categories return not-found; API failure is not an empty catalog. Draft, Archived and disabled-category products stay out of public results. Out-of-stock visibility is unchanged unless the customer opts into In-stock items.
- The shared header submits product search from every customer route to `/shop?search=...`. Enter and the Search button work. Blank header searches open `/shop`. The results page keeps editable search text, URL search/filters/sort, refresh and Back/Forward. Navigation to Product Details and back restores those parameters. The existing request-generation guard ignores stale responses. Changing any query resets pagination.
- Search is literal case-insensitive substring matching over name, description, SKU, category name, fabric, weave type, main colour and variant names. Maximum query length is 100 characters. It is not full-text, fuzzy/typo matching or a paid external search service. A phrase is matched literally, not split into independently matched words.
- Independent groups combine with AND: search, one category, inclusive minimum/maximum price, availability and sale eligibility. Selected colours combine with OR using exact case-insensitive colour names. Money bounds are validated integers in paise (0 to 100,000,000) on the server; the UI accepts rupee inputs with at most two decimals and converts using integer arithmetic. Invalid ranges or unsupported parameters receive an invalid-request response.
- Colour options and price metadata come from actual publicly eligible records in the base scope and search. They are not derived from only the loaded browser page. No fabric selector was added; fabric remains searchable through the existing product data.
- The mobile sheet stages changes until Apply Filters. Reset clears its optional inputs, Cancel/Escape/backdrop discard unsaved sheet edits, and focus is contained/restored. Filters remain accessible when the current result set is empty. Active chips, filter counts and results use the same applied URL parameters.
- Clear Filters retains the collection or campaign route and current search, while clearing optional category (outside a fixed collection), colour, price and stock filters and resetting sort. All Sarees explicitly leaves a category collection. Within a campaign it removes only its optional category filter; it does not leave the campaign. A conflicting category parameter on a fixed collection is rejected rather than silently ignored.
- Featured, Newest, Price Low to High and Price High to Low remain supported. Ordinary catalog ordering is featured DESC if selected, or price in the requested direction, followed by createdAt DESC and document ID DESC. Newest uses createdAt DESC and ID DESC. Campaign Featured retains configured membership order; other campaign sorts use the same price/date/ID tie-breakers.

## Counts, pagination and material search limitation

The previous implementation scanned only 200 records per request, could return an empty page before matching records later in the catalog, and displayed the loaded-page length as if it were the total. Its colour and price controls were also derived from loaded browser items. These were independent local correctness defects, separate from the production missing indexes.

The corrected service performs a bounded **server-only** scan in 200-record batches, pinned by a read-only transaction with public category eligibility. All search/filter matching and exact counts/facets are computed before the 50-item public page. Only that page is projected into public product data and sent to the browser. The complete catalog is never downloaded for browser-side filtering. No persistent search cache or derived production records are introduced.

Ordinary catalog discovery supports up to **5,000 Published source products in the queried scope**, including disabled-category records encountered by that scan. Larger scopes fail explicitly; they are not truncated into a successful partial result. This is appropriate for the current small catalog but costs more Firestore reads than an indexed search engine: each page rescans its scope, so read cost/latency grows with catalog size. A larger catalog needs a separately reviewed indexed search model, not an increased silent scan limit. Campaign membership retains its existing limits (100 explicit products or at most 1,000 category-source records).

Pagination cursors bind to the filters, base scope and relevant source version. Stable ordering and 50-item pages prevent static-result duplicates/missing rows. A changed source/query invalidates the cursor with a conflict and requires a fresh result, rather than reusing an incompatible cursor. Exact totals are separate from loaded length; older API responses without total use the quiet label "N sarees shown" rather than inventing a total or showing COUNT UNAVAILABLE.

## Banner settings and timers

Location: **Admin > Store Settings > Homepage Banner Settings > Time per banner**. Unit: seconds; default 3; permitted range 2-15 whole seconds. Helper: "How long each homepage banner stays visible before the next slide."

Storage: private `siteSettings/homepageBanners`, fields `seconds`, `revision`, `schemaVersion: 1`, and the existing update/operation metadata. The established `settings:get` / `settings:save` service handles this optional changed section with `expectedBannerRevision`. Both the admin custom claim and enabled `adminAccess/{uid}` checks remain required, including the transaction check. Idempotent retry, conflicts, Save/Cancel and dirty-state handling are retained. Merge writes preserve unrelated fields and no shipping, loyalty, appearance, contact, About, banner artwork or business records are rewritten when only timing changes.

The existing public content response exposes only normalized `bannerSeconds`. Missing, invalid or out-of-range values fall back to 3 without writing a default document. The existing public refresh interval (up to 15 seconds, or earlier focus/reload) applies after a successful save; refreshing the homepage immediately fetches the saved value. No code deployment is needed for later timing edits once this feature is released.

Desktop/mobile share the same single timeout. Each automatic or manual slide gets a full display interval; changes in timing or banner content cancel the old timer. Paused, hovered, focused, hidden-tab, reduced-motion and fewer-than-two-slide states do not autoplay. Unmount removes the timer/listeners. Display duration stays independent of artwork proportions and transition styling. No image upload or live settings change was performed.

## Verification

Commands: `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:discovery`, and `npm.cmd run test:catalog-runtime`. The focused emulator runner refuses non-loopback Auth/Firestore targets; its writes are isolated synthetic fixtures. No support applications or production media are opened.

Final local results (2026-11-01):

- `npm.cmd run lint`: passed (`tsc --noEmit`).
- `npm.cmd test`: 156 passed, zero failed, including catalog handler/index, customer/admin, category and shared discovery regressions.
- `npm.cmd run build`: passed. Vite still reports its existing large-chunk advisory; no build error.
- `npm.cmd run test:discovery`: passed all six emulator groups (category rules, catalog CRUD/security, Store Settings, campaigns, banners and exported HTTP discovery), plus the existing Store Settings browser regression and both new browser suites. The HTTP fixture covers all 21 enabled category links, 235 eligible products across five pages, tied sorts, late matches beyond record 200, compound filters, private-product exclusions and secure banner-setting persistence.
- Browser checks passed at 320, 390, 768, 1440 and 1920px, with page-overflow and Lora checks, direct category refresh, header search from six routes, URL navigation/restoration, campaign scope, sale URL/clear, Retry versus empty results and held stale responses. Screenshot review caught and corrected price/label crowding at 320px using wrapping inside the existing card.
- The virtual-clock carousel checks passed default 2999/3000ms, saved 5999/6000ms and manual full intervals, hover/focus/pause, hidden tab, reduced motion, banner-list changes, unmount, one slide and zero slides. Its accelerated clock can produce a Firebase transport timeout warning in the isolated fixture; it is not production connectivity evidence. Expected permission-denied logs belong to negative rules tests. No failing assertion remained.
- `npm.cmd run test:catalog-runtime`: packaged function passed safe initialization and JSON status probes with require(ESM) disabled and enabled. Vercel builder 24.0.3 produced the nodejs24.x artifact; execution used local Node 22.22.2 without a tsx loader. This validates packaging/imports locally, not the hosted Node 24 runtime or production authenticated requests.
- `git diff --check`: passed. Test servers/emulators were shut down. No commit, push, application deployment, rules/index publication or production record write occurred.

Local log artifacts: `.cache/discovery-unit.log`, `.cache/discovery-final-typecheck.log`, `.cache/discovery-final-build.log`, `.cache/discovery-full-final.log` and `.cache/discovery-runtime-final.log`.

Windows PowerShell's redirected native stderr marked the outer logging shell unsuccessful despite Firebase reporting `Script exited successfully (code 0)` and every suite passing. This was reproduced independently with a warning-only Node process (`NativeExit=0`, `ShellSuccess=False`). When capturing these commands through PowerShell, explicitly forward `$LASTEXITCODE`; do not treat a NativeCommandError warning wrapper as a failed assertion or suppress genuine nonzero native exits.

Screenshots are isolated-fixture captures, not production catalog/brand artwork. For each width 320, 390, 768, 1440 and 1920, see `.cache/discovery-design/shop-{width}.png`, `filters-{width}.png` and `collections-{width}.png`. Representative review files: `shop-320.png`, `filters-390.png`, `collections-1440.png`.

Hosted acceptance remains outstanding after the six exact missing indexes reach READY and the owner releases the local code: category and all four sort reads, compound search/count/pagination, authenticated settings save/conflict and homepage timing refresh. No new environment variables, security-rule publication, production-data rebuild or media upload is required.

## Changed files

- Discovery: `server/browse.ts`, `server/campaigns.ts`, new `server/discovery.ts`, `src/products/client.ts`, `src/products/hooks.ts`, new `src/products/discovery.ts`, `src/views/ShopView.tsx`, new `src/views/discovery.css`, `src/components/Header.tsx`.
- Collection rail: `src/home/Collections.tsx`, `src/home/home.css`.
- Banner timing/settings: `server/content.ts`, `server/storeSettings.ts`, `src/content/public.tsx`, `src/content/BannerSlide.tsx`, new `src/content/bannerTiming.ts`, `src/admin/settings/model.ts`, `src/admin/settings/StoreSettingsPage.tsx`.
- Index evidence: `firestore.indexes.json`, new `scripts/fixtures/discovery-index-evidence.json`.
- Validation: `package.json`, `scripts/catalog-handler.test.ts`, `scripts/catalog-indexes.test.ts`, `scripts/settings-emulator.test.ts`, new `src/products/discovery.test.ts`, `scripts/discovery-fixtures.ts`, `scripts/discovery-emulator.test.ts`, `scripts/discovery-browser.test.py`, `scripts/banner-timing-browser.test.py`, `scripts/discovery-suite.ts`, `scripts/test-discovery.mjs`.
- Handoff: this document, `docs/STOREFRONT_DISCOVERY.md`.

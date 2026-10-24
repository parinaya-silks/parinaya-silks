# Customers List and Customer Details

The original implementation and acceptance notes below describe the local release. The authorized production preparation completed on 24 October 2026 is recorded at the end of this document. It did not deploy application code, publish rules or alter source business records.

## Pages and identity

- `/admin/customers`: searchable directory, combined filters, sorting, ten-row server pages, current-page selection and a distinct All Matching scope.
- `/admin/customers/{encodedFirebaseUid}`: current profile/contact information, registration date, all-time activity, five-order history pages, current saved addresses and individual export.
- View Order opens the existing `/admin/orders/{id}`. Order Details' View Customer now opens the stable customer route.

Firebase UID is the only identity key. Names, phones and email addresses never merge accounts. Filter/page/scroll context is kept in UID-scoped browser history state and restored after a details refresh or Back/Forward navigation. It carries navigation preferences, not permissions or downloaded customer records. Another administrator's UID cannot restore that context.

The existing 192px sidebar, approximately 58px header, local Lora font, logo and ivory/maroon/gold theme are preserved. Customers stays active in shared navigation. Tables become mobile cards; filters use an accessible sheet. Export uses an accessible dialog. Prototype sample records, loyalty tiers, verified seals, simulated phone chrome, unsupported bottom navigation, preview buttons and CDN dependencies are omitted. Page sizes stay consistent during resizing: ten directory customers and five history orders on every viewport.

## Authoritative sources and coverage

The former directory read `customerProfiles` ordered by displayName. It did not enumerate Firebase Authentication accounts, and an orderBy could exclude incomplete legacy profiles missing that field. The new directory explicitly covers all saved `customerProfiles/{uid}` documents, including incomplete/legacy profiles with truthful fallback labels. Auth-only accounts whose profile save/recovery has not completed remain outside the directory until their profile exists. No duplicate customer collection is created as an independent source of identity.

The private `customerDirectory/{uid}` collection is a disposable server-maintained read model, derived from:

- Name/mobile: current `customerProfiles/{uid}`. Mobile is customer-provided, never labelled verified.
- Email/Joined: Firebase Authentication email and `metadata.creationTime`. Profile recovery timestamps and first order dates are never substituted for registration. A missing Auth account yields Not provided / Not recorded.
- Activity: actual `orders` belonging to this UID. Historical items, quantities, totals and addresses are never replaced with today's catalogue or saved-address data.
- Current addresses: `customerShopping/{uid}/addresses` and the `preferences/delivery.defaultAddressId` pointer. A missing/deleted default pointer produces a warning; no replacement is guessed.

List reads verify returned profiles against the indexed contact fingerprint. Directory operations compare saved-profile and prepared-row counts; incomplete preparation produces an explicit unavailable state rather than a partial directory. Details profile, statistics, history and addresses have independent requests/retries. Missing statistics are unavailable, never assumed zero. Invalid legacy quantities produce unavailable item totals.

Out-of-band Auth/profile/order imports or console edits require a fresh controlled rebuild; the application does not provide email/account deletion or order deletion features. The tool does not automatically prune orphan read-model records after an external profile deletion. Such inconsistencies require owner review. The read model is not an authorization source.

## Search, filters and statistics

Search is case-insensitive, Unicode-NFKC normalized **prefix matching** on the complete name or an individual name word, email, or normalized mobile digits. It is not arbitrary substring/fuzzy matching. Spaces, brackets, hyphens and a leading + in pasted phone formatting are removed for digit matching; Indian numbers also have national-number prefixes. Search is directory-wide through indexed server queries, not filtering one downloaded page.

Joined-date ranges use Asia/Kolkata inclusive calendar boundaries. Joined unknown values have an internal sort key of zero, render Not recorded and are excluded from dated ranges. Sorting supports newest joined, oldest joined and normalized Name A–Z, with stable document-ID tie-breaking. Filters combine with AND: date range, with/without orders, missing mobile and missing email. Removable chips and Clear filters reset pagination.

- Orders placed: count of all stored order documents for this UID, including cancelled/rejected orders and orders later returned.
- Items ordered: sum of the purchased quantities in those historical snapshots, including the same statuses. This is not a count of line items or current retained inventory.
- Latest order: greatest createdAt, then descending document ID for ties, including all statuses.
- These are all-time figures, independent of the visible history page. No financial aggregate is presented as collected revenue. Delivered and COD Collected remain distinct; partial recorded collection is labelled separately.

## Trusted synchronization and schema

`profile:syncDirectory` is an authenticated self-maintenance operation: the UID comes only from the verified token; it reads that profile and trusted Auth metadata and returns only synchronization status. It cannot read the directory or another UID. Successful registration/profile recovery requests this synchronization without turning an indexing failure into a failed registration or undoing a saved profile.

The existing `profile:update` transaction updates an existing indexed contact atomically. Before accepting an order, a missing directory record for an existing profile is initialized. Accepted order transactions atomically maintain order count, quantities and latest-order pointers alongside the order/receipt. Exact order retries cannot increment the statistics twice. A new server-owned order field, `itemQuantity`, records the actual sum of snapshot quantities; old orders need no mutation/backfill.

Read-model fields include schemaVersion, normalized sortName/searchPrefixes, joinedAt, missing-contact/hasOrders flags, contact fingerprint, counts/quantities, latest-order identity/date and a synchronization timestamp. Browser rules already deny direct access because this collection is not in the client allowlist. Customer self-profile/address rules are unchanged. No rule publication is required by this change under the checked-in rules.

Every administrator list, details, statistics, history, address and export request passes the existing verified `admin: true` custom claim and enabled `adminAccess/{uid}` record checks. History responses project only the needed fields. Profile and Auth passwords/tokens/claims, internal order notes and unrelated metadata are not returned or exported. No customer deletion, password change, profile edit or address edit is added to the administrator pages.

## CSV scopes and reliability

The dialog supports Selected, All Matching, All Customers and This Customer. Individual selection applies to the current page. Select All Matching is a separate server-filter scope; clearing selection returns to individual selection. Selection resets when page/filters/account change. All Customers explicitly ignores active search/date/contact/order filters.

Default columns: name, email, mobile, joined date, orders placed. Optional columns: latest order date and current default delivery address. Addresses never include every saved address or historical order shipping snapshots. Export requests carry UID selections/filter definitions and allowed field names, never authoritative contact values supplied by the browser.

Preparation freezes filters/fields/scope. Authenticated chunks contain at most 50 rows, with a scope-bound cursor. Every request rechecks administrator access. The browser deduplicates identities and verifies final completeness against the expected count before making a CSV. If the directory count changes, preparation fails and can be restarted. A network failure can retry the current cursor while retaining earlier chunks. Cancel aborts and close/sign-out/account change discards the in-memory work. There are no public export URLs or persisted CSV files on the server.

Exports are limited explicitly to **100,000 customers per file**; larger scopes fail before a completed download, rather than truncating. The selected-UID API accepts at most 1,000 distinct identities; this UI's individual selection is confined to its ten-row page. CSV uses UTF-8 BOM, correct quoting/newlines and the existing spreadsheet formula-injection protection, including safe phone text. A failed/partial export never downloads as completed. Records are read during preparation, not promised as a global point-in-time snapshot.

## Local indexes and release dependency

Six **new** COLLECTION-scope `customerDirectory` definitions are appended to `firestore.indexes.json`; existing definitions are preserved. Each includes ascending equality fields in this order:

`hasOrders`, `missingEmail`, `missingMobile`, `schemaVersion`.

| Search | Ordered suffix | Implicit document ID |
| --- | --- | --- |
| No | joinedAt DESCENDING | DESCENDING |
| No | joinedAt ASCENDING | ASCENDING |
| No | sortName ASCENDING, joinedAt ASCENDING | ASCENDING |
| Yes: searchPrefixes CONTAINS before equality fields | joinedAt DESCENDING | DESCENDING |
| Yes: searchPrefixes CONTAINS before equality fields | joinedAt ASCENDING | ASCENDING |
| Yes: searchPrefixes CONTAINS before equality fields | sortName ASCENDING, joinedAt ASCENDING | ASCENDING |

All three flag groups participate in each query, keeping the index set fixed across filter combinations. Name sorting includes a sortName range along with the joinedAt range. This follows Firebase's [multiple-range-field query guidance](https://firebase.google.com/docs/firestore/query-data/multiple-range-fields). Existing UID/createdAt order-history indexes are reused; no reporting indexes are changed.

Production readiness was not checked during the original UI implementation. The subsequent authorized recovery below compared existing definitions, created only missing exact matches and verified readiness and live queries. Do not blindly replace the deployed index set or delete existing indexes.

Existing profiles require one controlled read-model rebuild, prepared by `scripts/customer-directory-rebuild.ts`. It reads profiles in 50-record pages and only needed order snapshot fields in 200-record chunks, and writes only `customerDirectory`. Each customer's current profile, existing directory row and order pages are read within one transaction. Conflicting application synchronization causes a recomputation, with at most five transaction attempts. A per-customer limit of 10,000 orders fails explicitly instead of truncating. Fields owned by this read model are merged; unrelated directory fields are preserved. Invalid/overflowing historical quantities remain unavailable. It does not modify profiles, Auth users, addresses or orders. A failure can leave completed derived rows; rerunning from the beginning safely recomputes them without incrementing counters. The readiness check remains in place throughout. Logs contain counts/error codes, not customer information or credential values.

Preview with `--dry-run` before `--apply`. The preview executes the same bounded source reads without writing, including when directory rows already exist. The exported maintenance function also supports `{verify:true}` to compare every derived field with current sources without writing; `mismatches` must be zero. This count means differences observed before an apply when running in apply mode, not failed writes. Separately reconcile source/directory UID membership and schema versions; do not declare completeness from equal counts alone, prune orphaned rows automatically, or manually set a readiness flag.

Local emulator use (only while the existing loopback Auth/Firestore environment variables are set):

```powershell
node --import tsx scripts/customer-directory-rebuild.ts --emulator --apply
```

Owner-authorized production preparation uses the same tool with `--apply --credentials <secure-service-account-path>` outside Git. The tool validates project `parinaya-silks`, explicitly targets `(default)`, rejects emulator mixing and requires explicit apply. Do not paste keys into chat. Production preparation was not run during the original UI implementation; the later authorized run is recorded below. Existing open browser versions can finish profile creation before synchronizing; any resulting preparation warning must be resolved, not ignored.

For subsequent explicitly authorized preparation, run `--dry-run --credentials <secure-service-account-path>` first, then `--apply` with the same trusted credential path. Do not put credential files in the repository. Recheck source membership, schema and derived-field consistency after the apply; concurrent new profiles can require another pass. Auth metadata is read per profile, not part of the Firestore transaction, so out-of-band Auth changes also require a fresh verification/rebuild.

## Local acceptance and files

Use the established emulator harness, `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, and focused tests listed below. Open Customers with a dual-authorized local administrator. Check searches, combined filters, all sorts/pages, selection scopes and exports. Open a customer, refresh/Back, inspect totals beyond one history page, saved/default addresses and View Order. Test failed-section Retry, export cancellation/recovery and sign-out. Use only synthetic fixtures for mutation/preparation checks.

Changed implementation files:

- `src/admin/customers/{model.ts,model.test.ts,CustomersList.tsx,CustomerDetails.tsx,Filters.tsx,ExportDialog.tsx,customers.css}`.
- `server/customerDirectory.ts`, `server/catalog.ts`, `server/handler.ts`, `server/business.ts`, `server/orders.ts`.
- `src/admin/AdminPanel.tsx`, `AdminLayout.tsx`, `accessPolicy.ts`; removed obsolete embedded directory from `src/orders/AdminBusiness.tsx`.
- Profile synchronization callers in `src/customer/service.ts` and `CustomerAccount.tsx`.
- `scripts/customer-directory-rebuild.ts`, `customers-emulator.test.ts`, `customers-browser.test.py`, `customers-fixture-control.ts`; updated order-counter regressions, Order Details navigation regression and the existing emulator-suite registration.
- `firestore.indexes.json`, test script registration in `package.json`, and this document.

Fixtures and screenshots live only in isolated emulators/ignored `.cache/customers-browser/`. The owner's production customers, orders and Test product are never test fixtures.

## Validation completed

- `npm.cmd run lint`: passed. `npm.cmd test`: 91 tests passed. `npm.cmd run build`: passed.
- Four focused emulator suites passed (five tests): customer rules, existing orders/COD with new atomic directory-counter assertions, business/admin security, and the new exported-handler customer-directory suite. The customer-directory suite was rerun after final legacy/export refinements and passed.
- The new API suite checks all dual-admin denials and signed-out rejection, profile/UID coverage, unknown Auth registration, directory-wide name/email/phone search, joined-date/contact/order combinations, all sorts and cursors, 27-order/135-quantity totals, current/deleted default pointers, narrow order-history responses, selected/matching/all/individual exports, multiple chunks, deduplicated identities, invalid fields, profile-index synchronization and direct client denial. Contact-only individual export remains usable independently of unrelated directory preparation; legacy quantity totals remain unavailable until rebuilt.
- Seven browser suites passed across focused runs: Customers, customer account/authentication, purchase journey, Delivery Update, Order Details, Orders List and dashboard. The complete all-feature `test:admin` command was not run as one uninterrupted invocation.
- Customer browser acceptance passed directory filtering/sorting/page context, no-results versus failure/Retry, current-page and distinct All Matching selection, scope-specific CSV, a failed second export chunk followed by cursor-preserving recovery, formula-safe Unicode/phone output, independent statistics failure, all-time totals beyond visible history, copy/call, default-pointer inconsistencies, direct routes/reload/Back/order links and sign-out cleanup. Final explicit keyboard containment/restoration, Escape and mobile filter/export checks also passed.
- Normal-zoom screenshots covered list/details at 320, 390, 768, 1024, 1440 and 1920px. Representative mobile, tablet and desktop screenshots plus mobile filter/export dialogs were visually inspected. The tablet card-direction overflow found during development was corrected; final assertions found no horizontal overflow.
- `test:catalog-runtime`: passed using the pinned local Vercel Node builder. The traced `nodejs24.x` artifact was invoked under local Node 22.22.2, without a tsx loader, with enabled/disabled ESM probes. This is local packaging evidence, not hosted runtime verification.
- `git diff --check`: passed. Earlier accessible-label and five-row-pagination test mismatches were corrected and the final focused customer run passed.

Those original validation results did not establish production readiness. The later authorized production recovery below establishes index and directory preparation separately; signed-in hosted acceptance remains separate from SDK and emulator checks.

## Authorized production recovery - 24 October 2026

Target: `parinaya-silks`, Firestore `(default)`. The `customers:list` schema failure at `ready()` was caused by missing initialization: 3 saved source profiles, 0 directory rows, no incompatible or orphaned rows. This was not a schema-version migration failure. All six exact manifest indexes were also absent.

The create-only procedure compared existing definitions, created the following six COLLECTION-scope indexes, waited for every index to become READY and verified that all 14 previously returned definitions were preserved. No index was deleted or replaced. The implicit `__name__` directions match the manifest convention above.

| Definition from table above | Index ID | State |
| --- | --- | --- |
| No search, newest | `CICAgLjy8IAK` | READY |
| No search, oldest | `CICAgOi3kJAK` | READY |
| No search, name | `CICAgJjFqZMK` | READY |
| Search, newest | `CICAgNjp5ZMK` | READY |
| Search, oldest | `CICAgLjRyYIK` | READY |
| Search, name | `CICAgLiT6IEK` | READY |

The hardened maintenance tool was reviewed and exercised locally before the live run. Production preview processed 3 profiles with zero writes. Apply created exactly 3 derived `customerDirectory/{uid}` documents. Source-profile/order update fingerprints were unchanged across the apply. No source, Auth, address, product, inventory, administrator or rules writes were performed; no readiness flag or preparation metadata document was invented.

Read-only post-verification found 3 source profiles and exactly the same 3 directory UIDs, all at schema version 1, with zero derived-field mismatches and no orphaned or missing rows. One saved profile has no matching Auth account and remains included with unavailable Auth metadata. The 2 existing Auth accounts both have saved profiles; there are currently zero Auth-only accounts excluded. The coverage policy continues to exclude future Auth-only accounts awaiting profile recovery.

Trusted Admin SDK checks against live Firestore passed 72 list/search/order/contact-filter combinations, six actual name/email/mobile searches, all three sorts, a joined-date range, complete directory traversal, all 3 customers' profile/statistics/address reads and three actual order-service history pages with ownership/link checks, and all four export scopes with all allowed fields and completeness reconciliation. The existing approved administrator still has both the custom claim and enabled access record. Production has only 3 rows, so a second directory page or multi-chunk export was not available to exercise live. Local synthetic tests cover 58 rows, cursor pagination and chunked exports.

The hosted `/api/catalog` rejected a signed-out `customers:list` request with HTTP 401. A signed-in hosted browser session was not accessible to this tooling; refresh `/admin/customers` in the existing authorized administrator session to complete hosted UI acceptance. Live SDK checks are not represented as signed-in Vercel invocation checks. No application or rules deployment is required for this initialization fix; the local changes are maintenance safeguards and their tests/documentation.

Recovery validation: typecheck, all 91 unit tests, production build and `git diff --check` passed. Five focused emulator tests passed across administrator rules, customer rules, Customers handler/preparation and existing orders/COD suites. The Customers browser regression passed filters/sorting/pagination/context, retry versus empty states, export completeness/recovery, details/order links, sign-out cleanup and six responsive widths. Preparation regressions cover zero-write preview, schema repair, merging unrelated fields, fresh profile reads, unchanged historical orders and read-only derived-field verification. Approved UI files were unchanged. No commit, push or application/rules deployment was performed.

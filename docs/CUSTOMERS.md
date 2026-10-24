# Customers List and Customer Details

Local implementation only. No commit, push, deployment, rule/index publication, production migration or production record/user modification is part of this task.

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

**Production readiness of these six indexes was not checked or changed.** Before releasing, the owner must compare existing definitions, create only missing exact matches, wait for READY, then verify actual queries. Do not blindly replace the deployed index set or delete existing indexes.

Existing profiles require one controlled read-model rebuild, prepared by `scripts/customer-directory-rebuild.ts`. It reads profiles in 50-record pages and only needed order snapshot fields in 200-record chunks, checks concurrent source changes and writes only `customerDirectory`. It does not modify profiles, Auth users, addresses or orders. It is safe to rerun. It logs counts/error codes, not customer information or credential values.

Local emulator use (only while the existing loopback Auth/Firestore environment variables are set):

```powershell
node --import tsx scripts/customer-directory-rebuild.ts --emulator --apply
```

A future owner-authorized production preparation can run the same tool with `--apply --credentials <secure-service-account-path>` outside Git. The tool validates project `parinaya-silks`, explicitly targets `(default)`, rejects emulator mixing and requires explicit apply. Do not paste keys into chat. That production command was **not run** in this task. Existing open browser versions can finish profile creation before synchronizing; any resulting preparation warning must be resolved, not ignored.

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

Release remains separate: compare/create the six exact private-directory indexes, wait for READY, authorize and run the bounded rebuild for existing profiles, deploy the application, then perform signed-in hosted acceptance. No production metadata/index-readiness verification, preparation, publication, application deployment, commit or push was performed here.

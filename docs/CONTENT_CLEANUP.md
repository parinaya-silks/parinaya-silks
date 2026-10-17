# Empty content milestone — 17 October 2026

Subsequent category milestone: [CATEGORIES.md](CATEGORIES.md) connects real enabled Firestore categories to the existing shop controls. Products and other business records remain empty/unconnected. No sample categories or products are seeded.

The public website stays visible. No product CRUD, customer login, business repositories or payment integrations were added. This document supersedes the sample-catalogue behavior described in `STOREFRONT_REVIEW.md`.

## Sources removed from displayed content

- The normal repository no longer imports the mock products, stock/variants, customers, addresses, paid orders, shipment events, coupons, loyalty or settings dataset. All business list methods are explicitly empty while those integrations remain unavailable. There is no automatic browser seeding or record fallback after an empty result/error.
- The old dataset was moved from `src/data/mockData.ts` to `tests/fixtures/commerce.ts`. Only automated tests import it. Pricing and fulfilment test coverage remains; application modes cannot enable the old simulator.
- Homepage sample collections, categories, product grids, sale campaigns, unverified certification/delivery claims and promotional copy were removed. The existing editorial brand photo, hero layout, maroon/ivory theme, typography, header, footer and five mobile tabs remain.
- Shop categories and color choices now derive from actual supplied records; no sample categories/variants are inserted. The shop shows “No products available yet.” Search/filter misses show “No products found.”
- Bag and wishlist show their existing empty layouts with Continue Shopping. Legacy browser records are not treated as verified catalogue content. Badges remain empty with no available records.
- The customer account uses only the existing signed-out layout, without sample identities, addresses, balances or order histories. Sample login credentials/state switchers were removed. Customer forms and checkout/order routes stay unavailable; simulated success is not reachable.
- Dashboard synthetic revenue/charts were deleted. Unconnected orders/products/customer modules retain their layouts but show unavailable counts rather than verified zero metrics. No loyalty tier/region counts or redeemable balance is implied. Other admin editors remain unavailable.
- Unsupported contact FAQ delivery/exchange promises and the policy draft's invented terms/placeholders were removed. Policy titles/navigation remain with concise pending-approval content and real contact links. No replacement legal terms were generated.
- Metadata no longer claims unverified product categories/materials. The pre-existing page-title edit was preserved.

Confirmed information retained: **PARINAYA SILKS**, WhatsApp **+91 8367383073**, **parinayasilks.in@gmail.com**, Instagram **@parinaya_3999**, **Hyderabad, India**. Existing brand/decorative photography is retained; imagery that existed only for the removed fictional catalogue/campaigns is no longer displayed.

## Narrow browser cleanup

`src/services/legacyDemoCleanup.ts` runs once at startup, using marker `parinaya_legacy_content_cleanup_v1=done`. It removes rows only when their `productId` or nested `product.id` matches one of the **12 exact retired catalogue IDs** in its small manifest, and only from:

```
parinaya_cart_preview_v1
parinaya_wishlist_preview_v1
parinaya_cart_demo_v2
parinaya_wishlist_demo_v2
parinaya_cart_v1
parinaya_wishlist_v1
```

Unknown rows, other storage keys, profiles, order history, preferences and Firebase authentication storage are left intact. Malformed/unknown storage is preserved. No `localStorage.clear()` is used. Storage failures do not restore content: normal repositories never read legacy records or seed defaults. Rerunning the migration is safe.

Legacy profile/order keys are retained but never read by the normal app. Unknown saved rows are not published as genuine products while catalogue integration is unavailable. A future integration must reconcile them against its authoritative catalogue before displaying them.

## Security and live data

Real Firebase administrator sign-in, the `admin: true` claim, enabled `adminAccess/{uid}` requirement, guarded routes and authorization policy remain unchanged. No rule deployment, live account privilege change, Firestore record deletion or uploaded-media deletion was performed. Live business collections were not scanned for suspected demo records; their contents are unverified and are outside this cleanup.

## Verification and review

Run:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:admin
```

With normal Vite development at port 3000 and production preview at port 4173:

```powershell
python scripts/storefront-browser.test.py
python scripts/browser-audit.py
python scripts/firebase-browser.test.py
```

The historical `browser-flows.py` now delegates to the empty-content browser checks; it cannot run a public payment/auth simulator. The build scripts and Vercel environment settings need no changes. `demoEnabled` is permanently false; business fixtures are test imports only.

Browser checks cover legacy cleanup while retaining unknown/auth/preference records, no displayed fixture names, no obsolete badges, route refresh, removed product/order links, unavailable customer actions and six mobile/desktop widths. Admin tests use synthetic Auth/Firestore emulator accounts only. Local tests do not establish hosted Vercel state.

Local validation: TypeScript, production build, all 31 unit tests, Auth/Firestore emulator suite, development/production browser checks, 192 route/viewport checks and intercepted Firebase browser fixtures passed. Visual review retained the original brand image/fonts with network access. The admin bundle still produces a size warning above 500 kB before gzip; it is not a build failure.

After your commit/push, review `/`, `/shop`, a search, `/bag`, `/wishlist`, `/account`, About/Contact and policy tabs. Refresh each; a retired product link must show Product not found and order links must remain unavailable. Sign in privately at `/admin`, inspect all eight areas for Not connected/unavailable data, and confirm View Public Store and sign-out still work.

## Remaining real content

Approved product/media records, categories/collections, verified material/stock/price information and final policy terms are still needed. Orders, inventory, customers, loyalty/coupons, reporting and payments need their own reviewed integrations before their actions can be enabled. No substitute fictional records were created in this milestone.

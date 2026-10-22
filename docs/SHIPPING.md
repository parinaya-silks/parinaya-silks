# Configurable shipping — local implementation

This phase remains local. It does not commit, push, deploy, publish rules/indexes, seed production or change live business settings. Existing customer/address/shopping and dual-check administrator security remain intact. No extra serverless function is added.

## Business policy

- Delivery country: India; store coverage: all Indian States and Union Territories.
- Flat shipping per order, without weight/distance calculation.
- Initial **draft/local-seed** fee: ₹99 (9,900 paise).
- Free shipping enabled initially, with a ₹10,000 (1,000,000 paise) threshold.
- Qualification is **strictly above** the merchandise subtotal threshold. Equality pays the flat fee.

**Administrator guidance:** ₹99 is provisional and pending client approval. The customer screen does not show this internal disclaimer. Confirm the business approval before a future production initialization.

| Merchandise subtotal | Shipping | Total including shipping |
| --- | --- | --- |
| ₹9,999 | ₹99 | ₹10,098 |
| ₹10,000 | ₹99 | ₹10,099 |
| ₹10,000.01 | Free | ₹10,000.01 |

## Settings and writes

The active `/admin/settings` page contains **Shipping Settings** beside Login Page Appearance. The form has All India coverage, flat fee, free-shipping switch, threshold, draft examples, Save/Cancel, loading/error/retry and saved feedback. It warns about the strictly-above threshold rule. A draft never updates checkout. Cancel reloads the persisted configuration; a failed save retains fields and operation ID for retry. A revision conflict requires Cancel/reload before saving again.

Amounts are integer paise internally. Rupee inputs allow only nonnegative decimal amounts with at most two fractional digits, with no empty values, exponent syntax or nonnumeric input. Flat fee is bounded to ₹0–₹1,00,000; the threshold to ₹0–₹1,00,00,000. Zero flat fee is supported and shown as the configured ₹0.00; **Free** denotes qualification for the enabled free-shipping rule.

`siteSettings/shipping` is private and contains:

- `country: 'India'`, `coverage: 'all-india'`, `method: 'flat'`.
- `flatFeePaise`, `freeShippingEnabled`, `freeThresholdPaise`.
- `schemaVersion: 1`, monotonically increasing `revision`.
- Server `updatedAt`, verified administrator `updatedBy`.
- `lastOperationId`/`lastOperationHash` for safe retry of the current save.

The existing catalog function exposes administrator-only `shipping:get` and `shipping:save`. Both pass the custom `admin: true` claim and enabled `adminAccess/{uid}` checks. Saves also reread the enabled record inside the transaction. Browser writes to settings are denied. Inputs cannot set revisions/metadata or introduce another country, coverage or method.

The same save transaction writes `siteSettings/shippingRevision` containing **only** `{revision}`. A narrow local rule permits signed-in users to get/listen to this exact signal, with no list/write access. It exposes no updater UID, address or private settings. Full settings remain unreadable directly to browsers. No new indexes are required.

## Trusted checkout and fallback

The existing authenticated `checkout:review` operation reads the saved configuration in the same read transaction as the current owned Bag/address/catalog. It uses current selling prices and integer-paise arithmetic. With a complete, nonempty, valid review, shipping is either zero for strict qualification or the flat fee; total is subtotal plus shipping. Address ownership and India/state validation remain mandatory. Invalid quantities/variants, hidden products or insufficient stock block shipping totals; items are not removed or changed.

The response includes the applied configuration revision, exact shipping/total decimal paise strings and safe threshold information. No browser prices, stock, rates or totals are accepted. Customer configuration-revision listeners trigger recalculation, abort superseded requests and ignore stale responses. The UI labels recalculated amounts, uses the saved threshold in explanatory copy and shows store All India coverage without claiming courier-confirmed PIN serviceability or delivery dates.

Missing, invalid or unavailable shipping configuration yields **To be confirmed**, with no fallback to ₹99, free shipping or a final total. Administrators see missing/invalid-state guidance. Customer reads never create a settings document. An invalid stored revision needs trusted owner repair; it is not silently replaced.

Bag keeps its informational merchandise subtotal and directs shipping calculation to checkout after address selection; it does not invent a pre-address estimate. Checkout shows merchandise subtotal, the charge or Free, and total including shipping when valid. Payment stays disabled. There are no new taxes, coupons, discounts, orders, inventory reservations/deductions or Bag clearing. Future payment/order operations must independently revalidate the entire review and current configuration.

## Explicit local initialization

Start the existing loopback Auth and Firestore emulators, set these variables in that local shell, then run:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
npm.cmd run shipping:seed-local
```

The script explicitly targets `parinaya-silks`, refuses non-loopback/production/Vercel environments, uses server timestamps and creates the document only when absent. It does not replace existing settings. Alternatively, the emulator's approved administrator can explicitly save the displayed initial draft from Store Settings.

For a future **separately authorized** release: obtain approval of the provisional fee; review then-deployed rules and merge the exact revision-signal read addition while preserving other rules; deploy the tested app/API; sign in as the approved administrator, review the initial draft and click Save once; read back the saved revision/metadata and validate the three threshold examples. Do not run the local seed script against production or rely on checkout to initialize settings.

## Tests and acceptance

`npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run test:admin` and optional `npm.cmd run test:catalog-runtime` cover validation, exact thresholds, disabled/zero/edited fees, admin authorization, private rules, revisions/idempotence, customer isolation and review side effects. Shipping browser fixtures exercise real loopback APIs with administrator/customer sessions, draft/cancel/save/retry, live revision updates, fallback, blocked items, payment-disabled behavior and the six existing responsive widths. Fixtures never touch production business configuration.

Local acceptance: sign in as an emulator administrator, open Store Settings -> Shipping Settings, edit/preview/cancel, then save. In another emulator customer session, add a product and select an owned checkout address; verify the saved rate/threshold and automatic recalculation after an administrator save. Check below/equal/above threshold, disable free shipping, set zero flat fee and verify missing/invalid settings return to To be confirmed.

Changed files include `src/shipping/*`, `server/shipping.ts`, catalog dispatch/diagnostics, delivery review model/hook/service, active admin settings composition, checkout/Bag copy, local rules, the local seed command, shipping fixtures/tests and this document. Payment provider integration, trusted order/payment creation, final legal/tax decisions and courier integration remain future work.

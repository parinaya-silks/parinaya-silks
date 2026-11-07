# Checkout coupon selector and legacy browser audit

The 13 initially failing browser files were also run against an isolated checkout
of unchanged release `df7e2a9`. All 13 failed there as well. This comparison
establishes their pre-existing status; it does not excuse a failing release.

| Browser regression | Finding and repair |
| --- | --- |
| Customer authentication | Approved profile layout replaced the old account heading/actions. Assert the current details and management region; wait for the saved profile before inspecting recovery results. Registration, isolation, persistence, reset and administrator denial checks remain. |
| Homepage | A previous test left the synthetic customer's Bag/Wishlist populated. Reset only that fixture's shopping collections before testing duplicate-safe additions. |
| Loyalty | Balance and history moved to the profile card and history dialog. Exercise both, keeping checkout Apply/Remove, delivery earnings and refund assertions. |
| Store settings | Online payments now correctly say configuration is required. Assert that capability rather than the obsolete integration label. |
| Administrator access | Saved-state text is part of the settings heading; branding is now Sarees. Restore 44px sign-in controls overridden by compact Admin CSS. Keep claim/access-record revocation and denial coverage. |
| Website content | Saved campaign-section copy had no public consumer after homepage campaign cards were consolidated. Render that existing record on `/sale`, and identify its destination accurately in Admin. Preserve its stored ID and the deduplicated homepage. |
| Shopping | Update actual toast labels, separate item counts and confirmation/colour dialogs. Assert registration's durable saved state rather than a transient pre-navigation toast. Fix Strict Mode mounted-state restoration in dialog callbacks; retain failed-write retry and operation-identity assertions. |
| Delivery | Isolate missing-shipping fixtures from previous tests. Contain checkout image placeholders/fallbacks inside their thumbnail so failed media cannot intercept address controls. Retained reviews remain visible but cannot advance while refresh fails. Open the mobile summary before inspecting its stock warning and assert progression is disabled. |
| Shipping | Current checkout retains its last review during refresh failure. Assert the visible recovery and disabled progression, then successful retry; keep exact threshold, fee, conflict and revision checks. |
| Business content | Compare banner uploads/saves with the pre-existing public snapshot and explicitly select the new carousel slide. Verify other banners/policies are preserved rather than assuming an empty store. |
| Catalog recovery | Use the current native sort select, error copy, omitted unknown counts and headings with saved counts/status. Explicit focus/visibility events each refresh once; assert there is no retry loop. |
| Purchase journey | Use the existing mobile navigation drawer to reach Shop instead of requiring a desktop-only link. All stages, quantity/variant restrictions, Back/reload and single COD acceptance remain covered. |
| COD | Use current My Orders/profile-editor controls. Keep lost-response retry, one order/stock deduction, fulfilment, separate collection and ownership checks. |

The checkout-design response observer now collects completed requests, avoiding
reading a response body which navigation has already cancelled. Financial totals
are still compared with the returned server review.

No tests are skipped or disabled. No Firestore rule, payment configuration,
production customer, order, stock or coupon record is changed by this repair.
Browser/service fixtures are restricted to the local emulators; they do not prove
real Razorpay processing or authenticated Production checkout acceptance.

The release gate remains the complete documented npm regression commands,
typecheck, production build and packaged Vercel function checks. Detailed execution
logs and visual artifacts are kept in ignored `.cache` storage.

The complete browser inventory also contained nine acceptance files missing from
normal npm runners. They now run with `test:client-changes`; four used obsolete
branding, toast or shared recovery text. Their responsive, retry, isolation,
profile/address, image and financial checks remain intact. The standalone SDK and
empty-store checks now have `npm run test:foundation`: the SDK probe isolates
initialization from the storefront's legitimate category reads, while the empty
store check exercises current search chips, Contact form and Sarees branding.

The packaged payment acceptance regression now retries the exact same signed
webhook bytes and event ID after a bounded 503 pending response on cold local
gRPC initialization. It observes the original durable record before replay/teardown, requires
202 acceptance on the identical replay and verifies the durable record/body hash; tampered reconstructed JSON must still fail HMAC verification.
The production four-second acceptance budget is unchanged.

The product upload test now waits for its file input to become enabled after
administrator permission restoration, because Playwright file injection does not
perform the enabled-control waiting of a real click. It explicitly asserts that
the synthetic first-upload failure fired before exercising Retry.
The policy refresh regression follows the current coalesced loader contract:
focus while busy queues a second read, instead of overlapping requests; it checks
both the queued read and the final current-policy snapshot.
The Admin runner collects independent browser failures and fails at the end,
so one failed file cannot hide later failures. Service setup remains fail-fast.

The loading regression now measures the painted frame after resizing and retains
its strict viewport-width assertion, saving element geometry on overflow. Its
read-only POST allowlist includes `coupons:available`; mutation replay remains
forbidden. The carousel timing test isolates campaign promotions from its three
synthetic banners, retaining every exact interval, pause and cleanup assertion.

## Release-gate verification (8 November 2026)

All required commands completed successfully on the final application changes:

- `npm run test:admin` (all service and browser files, including payment emulator checks).
- `npm run test:client-changes` (including the new checkout selector and previously unregistered browser regressions).
- `npm run test:discovery`, `npm run test:loading`, `npm run test:analytics` and `npm run test:foundation`.
- `npm run test:catalog-runtime` and `npm run test:payments-runtime` (packaged server entry points).
- `npm run lint` (TypeScript), `npm test` (185 passed), `npm run build` and `npm run firebase:verify-build`.
- Diff whitespace and changed-file secret screening.

All 54 browser acceptance files are registered in these runners. Failed runs were
investigated and rerun after repairs; no failing test was skipped or disabled.
The final loading rerun includes the corrected isolated carousel fixture.
Checkout screenshots cover 320, 390, 768 and 1440px in both saved themes.

These are local/emulator and packaged-runtime results. They do not establish
authenticated hosted coupon redemption or real Razorpay settlement. No live
payment activation, new environment variable, security-rule publication or index
publication is required by this feature. Production release and hosted checks
must be reported separately against the released commit.

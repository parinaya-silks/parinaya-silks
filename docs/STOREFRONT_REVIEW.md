> Superseded for content/data behavior by [CONTENT_CLEANUP.md](CONTENT_CLEANUP.md). The storefront remains visible, now with empty data rather than a sample catalogue.

# Storefront browsing release — 16 October 2026

The original storefront is visible by default in development and production builds. This supersedes the previous blanket preparation-page requirement. This milestone releases browsing for review, not live commerce.

## Cause and release controls

`App.tsx` previously returned the preparation page whenever `demoEnabled` was false. That value was false in an ordinary production build, so no public screen could render. The blanket return has been removed; the existing storefront and its components render normally.

There is **no storefront visibility environment variable** to configure. `VITE_FIREBASE_*` still configures real administrator access; missing customer integrations do not hide the public website.

The one existing simulation switch, `demoEnabled` in `src/config/runtime.ts`, is now true only when BOTH Vite `DEV === true` and Vite `MODE === 'demo'`. Normal `npm.cmd run dev` and every build have simulations disabled. An explicitly started `npm.cmd run dev -- --mode demo --port 3002` remains a local fixture tool. Even `build:demo` has `DEV === false` and cannot enable simulated account or transaction actions.

## Page and data status

| Screens/features | Data and behavior |
| --- | --- |
| Home, shop, collections, search, sale, product details | Existing sample catalogue, artwork, specifications and prices. The preview notice identifies unverified stock/offers/reviews/delivery. No public Firestore catalog adapter is enabled. Sale is a sample-discount filter. |
| Product gallery, filters, sorting, search, drawers, accordion details | Working frontend interactions. Postal PIN checking validates format only; it does not promise serviceability or delivery. |
| Wishlist and bag | Working on this device only. Start empty and persist under `parinaya_wishlist_preview_v1` and `parinaya_cart_preview_v1`. Do not import old demo carts, identities or orders. Sample stock limits remain illustrative. Shipping/final payment are not calculated. |
| Customer account, login, register, password reset, verification | Existing signed-out/form layouts with notices. Forms/actions are disabled; no simulated session, email or profile save is reported. No sample customer identity/order history appears. |
| Checkout, order confirmation/result and tracking | Feature-specific unavailable page inside the storefront shell. No payment form, order submission or simulated success is available. Repository methods also reject simulated checkout and customer profile/address changes in ordinary modes. |
| Coupons and loyalty | Not connected; earning, redemption and coupon application are unavailable in the public preview. |
| About and Contact | Existing static content and contact links; no new submission backend. |
| Policies | Existing draft screens and explicit business-approval notice. Draft shipping/exchange terms are not released operating commitments. |
| Admin | Existing real Firebase Auth and claim/access-record guard. Live identity and permission records remain unchanged. All business modules remain unconnected. |

All catalogue content remains preview content, including the existing sale badges. Restock notifications do not claim a subscription was created. No live payment/refund/fulfilment integration was added.

## Changed files

- `src/App.tsx`: removes the blanket gate, reuses the storefront, shows the preview notice, guards checkout/order views and supports public clean URLs alongside legacy hash links.
- `src/config/runtime.ts`: limits simulations to explicit local demo mode.
- `src/services/storeService.ts`: separates preview browser storage, hides demo identities/orders/coupons and rejects unconnected account/checkout mutations.
- `src/views/AccountView.tsx`, `LoginView.tsx`, `RegisterView.tsx`, `ForgotPasswordView.tsx`, `VerifyEmailView.tsx`: preserve layouts with unavailable customer actions and no public simulator controls.
- `src/views/BagView.tsx`, `ProductDetailView.tsx`, `ShopView.tsx`, `HomeView.tsx`: retain layouts/interactions while identifying sample details, blocking checkout and removing unsupported dispatch/rewards/certification promises.
- `src/components/FeatureUnavailable.tsx`: shared nonblocking notices and feature-specific unavailable content.
- `vercel.json`: retains admin rewrites and adds a public application fallback excluding `/api`, `/assets` and file paths. Unknown application routes render the existing not-found view. This follows [Vercel's captured negative-lookahead syntax](https://vercel.com/docs/project-configuration/vercel-json#negative-lookahead).
- Tests, `package.json`, README and setup notes: update preparation-page expectations and verify transaction/admin boundaries.

No administrator claim/UID/access record, Firestore rules, provisioning script, backend authorization or payment service was changed by this milestone.

## Local checks

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run test:admin
```

For manual browsing, use `npm.cmd run dev` and visit `http://localhost:3000/`. To inspect the actual production build, use `npm.cmd run preview -- --host 127.0.0.1 --port 4173` after building and visit `http://127.0.0.1:4173/`.

With those two servers running:

```powershell
python scripts/storefront-browser.test.py
python scripts/browser-audit.py
python scripts/firebase-browser.test.py
```

The historical simulator regression `python scripts/browser-flows.py` additionally requires the explicit local demo server on port 3002. It verifies that simulation still operates only in that local fixture mode and remains unavailable in production.

Validation performed: TypeScript and production build passed; all 29 unit tests passed; actual-browser tests passed on development and production preview for direct routes/refresh, navigation history, local bag/wishlist, disabled customer forms, forged demo identity/order rejection, checkout blocking and six widths. The existing audit passed all 192 route/viewport checks. Auth/Firestore emulator tests passed approved-admin login/restoration, wrong credentials, customer/claim-only/record-only denial, revocation, sign-out/Back and protected data rules. The Vercel fallback pattern was compiled with path-to-regexp 6.3.0 and checked to exclude API/assets/file paths; local Vite preview does not execute hosted Vercel rewrites.

The build reports chunks above 500 kB; this is a warning, not a build failure. Images and fonts are still the original external Google-hosted assets. The restricted browser environment initially blocked those resources; the browser suite was rerun with network access and passed, and the production mobile screenshot was visually reviewed with the images/fonts loaded. This milestone does not replace those approved assets.

## Vercel owner release and acceptance

No new environment variables or Firebase permission changes are required. Keep the existing reviewed `VITE_FIREBASE_*` values, build command `npm run build` and output directory `dist`. Keep private Admin SDK credentials outside the repository and Vercel browser configuration.

1. Commit/push the reviewed changes yourself and wait for the connected Vercel build to complete.
2. Open `https://parinayasilks.vercel.app/` in a private window. Confirm the original homepage, preview notice, images/fonts, header, footer and five mobile tabs.
3. Visit and refresh `/shop`, `/collections`, `/sale`, `/product/prod-mayuri-wine`, `/wishlist`, `/bag`, `/account`, `/about`, `/contact` and policy routes directly. Try search/filtering, gallery, add/remove items and Back/Forward. Refresh should preserve this device's bag/wishlist.
4. Confirm `/checkout` and `/order-confirmed?orderId=anything` show unavailable content and cannot collect payment or show success. Customer registration/reset forms must not report successful actions.
5. Visit `/does-not-exist`: application not-found content. Check static assets load, a missing `/assets/missing.js` does not return the app, and `/api/*` is not rewritten into the storefront. There are no existing commerce API handlers to invoke for a live transaction.
6. In a signed-out private window, `/admin` and nested routes must require real login. Using your existing approved account privately, confirm the dashboard and View Public Store link. Confirm customer accounts remain restricted and sign-out/Back cannot bypass the guard.
7. Review mobile at 360/390/430 px and desktop, including product/bag fixed bars above the five tabs, drawers, filters and modal close controls.

These are post-deployment acceptance steps. No commit, push, deployment or hosted storefront verification was performed by this task.

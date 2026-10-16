# PARINAYA SILKS

React 19 + TypeScript + Vite 8 + Tailwind CSS 4 application. Public browsing uses clean URLs with legacy hash support and isolated local preview bag/wishlist data. Administrator routes use clean URLs, real Firebase Authentication and server-managed permissions. Business repositories and trusted checkout remain unconnected.

## Administrator access

See [administrator setup and release instructions](docs/ADMIN_ACCESS.md). Production /admin remains separate from public browsing and always requires real authorization. Both a server-assigned admin claim and an enabled adminAccess record are required. No customer admin shortcut or demo admin bypass remains.

The owner-supplied rules allow public reads/writes until 14 November 2026. The restrictive local firestore.rules replacement requires owner review/deployment. Local code does not change deployed permissions.

Run npm.cmd run test:admin for isolated emulator tests. Provisioning is a separate trusted owner action: npm.cmd run admin:provision is read-only until explicit UID/email confirmation and --apply. The approved existing administrator was provisioned separately through the trusted procedure; provisioning is not part of storefront builds.

## Firebase connection — Step 1

Confirmed target: project `parinaya-silks`, Cloud Firestore database `(default)`. [Firebase setup and verification](docs/FIREBASE_SETUP.md) lists the exact local/Vercel variables and development-only read checks. The supplied browser configuration is in ignored `.env.local`; `.env.example` contains placeholders. Customer page loading does not read Firestore. Signed-in administrator access checks its own permission record. No mock data is migrated or seeded.

```powershell
npm.cmd run firebase:check
npm.cmd run firebase:verify-build
```

App/client initialization is verified locally. The owner has supplied the existing permissive rules; the restrictive replacement and administrator access mechanism are documented in ADMIN_ACCESS.md. A signed-out document probe remains disabled. With the optional check path empty, `firebase:check` deliberately returns `check-path-missing` and a nonzero exit code. This is not a successful database read.

## Local development

Node 22.22.2 and npm 10.9.7 were used for validation on Windows.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

`lint` currently means TypeScript checking, not ESLint. Use test data only. Customer login, registration, recovery, verification, checkout and order actions are unavailable in ordinary development and all builds. Administrator authentication is real.

The **original storefront is visible by default** for browsing and review, with a restrained sample-catalogue notice. There is no visibility environment flag. Shop, product gallery, local wishlist/bag, information and draft policy pages are available; unconnected features display relevant unavailable states. See [storefront release details and production acceptance](docs/STOREFRONT_REVIEW.md).

Simulations require an explicit local server: `npm.cmd run dev -- --mode demo --port 3002`. `demoEnabled` requires both Vite `DEV=true` and `MODE=demo`; all production builds disable simulations, including `build:demo`.

Public bag/wishlist use `parinaya_*_preview_v1` keys and start empty. Isolated demo state uses `parinaya_*_demo_v2` localStorage keys. Earlier `*_v1` state is left untouched and is not migrated into this demo. The existing Reset Demo action clears only the current demo namespace. No Git repository was present at takeover; the original `src` tree was copied to ignored `.cache/baseline-src` before source changes.

## Browser checks

With development running on `127.0.0.1:3000` and a default production preview on `127.0.0.1:4173`:

```powershell
python scripts/browser-audit.py
python scripts/storefront-browser.test.py
python scripts/firebase-browser.test.py
```

The optional historical `browser-flows.py` additionally requires the explicit demo server on port 3002. These scripts use the host's Python Playwright package and Chromium installation. They are not installed by npm. Route/viewport results and screenshots go to `.cache/browser`. Browser tests use isolated synthetic fixture records, not real customer information.

## Project layout

- `src/App.tsx`: hash routing, shared shell and reactive state.
- `src/components`: storefront header, footer and mobile navigation.
- `src/views`: customer screens.
- `src/admin`: admin screens and separate layout.
- `src/services/storeService.ts`: local demo repository, not an authorization or payment boundary.
- `src/types/index.ts`: shared data model.
- `src/utils`: shared totals, route normalization, fulfilment validation and tests.
- `src/config/runtime.ts`: demo/production mode boundary.
- `src/data/mockData.ts`: fictional catalog, customers, orders, coupons and settings.

See [the takeover audit and Phase 3 plan](docs/TAKEOVER_AUDIT.md) for the historical baseline, screen coverage, known gaps and proposed future ownership model. Step 1 connection changes are described in [Firebase setup](docs/FIREBASE_SETUP.md). No live services, deployed rules or Vercel settings were changed.

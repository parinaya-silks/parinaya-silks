# PARINAYA SILKS

React 19 + TypeScript + Vite 8 + Tailwind CSS 4 application. Customer demo navigation uses URL hashes and isolated localStorage data. Administrator routes use clean URLs, real Firebase Authentication and server-managed permissions. Business repositories and trusted checkout remain unconnected.

## Administrator access

See [administrator setup and release instructions](docs/ADMIN_ACCESS.md). Production /admin is separate from the customer preparation gate. Both a server-assigned admin claim and an enabled adminAccess record are required. No customer admin shortcut or demo admin bypass remains.

The owner-supplied rules allow public reads/writes until 14 November 2026. The restrictive local firestore.rules replacement requires owner review/deployment. Local code does not change deployed permissions.

Run npm.cmd run test:admin for isolated emulator tests. Provisioning is a separate trusted owner action: npm.cmd run admin:provision is read-only until explicit UID/email confirmation and --apply. No real administrator was provisioned by this implementation task.

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

`lint` currently means TypeScript checking, not ESLint. Use test data only. Customer prototype login, registration, recovery, verification and payments remain simulations. Administrator authentication is real in normal modes.

The **default production storefront shows a preparation page**, while /admin requires real Firebase authentication and administrator permission. Simulated customer sessions and checkout remain unavailable. This is an intentional release boundary until real services and permissions are implemented. An explicitly requested demo build is available through `npm.cmd run build:demo`; never treat that output as a live shop.

Demo state uses `parinaya_*_demo_v2` localStorage keys. Earlier `*_v1` state is left untouched and is not migrated into this demo. The existing Reset Demo action clears only the current demo namespace. No Git repository was present at takeover; the original `src` tree was copied to ignored `.cache/baseline-src` before source changes.

## Browser checks

With development running on `127.0.0.1:3000` and a default production preview on `127.0.0.1:4173`:

```powershell
python scripts/browser-audit.py
python scripts/browser-flows.py
```

These optional scripts use the host's Python Playwright package and Chromium installation. They are not installed by npm. Route/viewport results and screenshots go to `.cache/browser`. Browser tests use isolated synthetic fixture records, not real customer information.

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

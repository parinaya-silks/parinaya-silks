> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Local setup and environment reference

For developers and configuration owners. Baseline: inspected source, 11 November 2026. This reference contains variable names and procedures only. No configuration was created, read from secret stores or changed during documentation.

## Prerequisites and local processes

Use the locked dependencies. Existing setup evidence used Windows/PowerShell, Node 22.22.2 and npm 10.9.7; current Vercel Node selection is **Pending confirmation**. `package.json` is the command reference. Python Playwright/Chromium and a compatible Java runtime are additionally needed for the existing browser/emulator harnesses; npm does not install the host Python environment.

For a separately authorized local development setup:

```powershell
npm.cmd ci
npm.cmd run dev:api
# In a second terminal:
npm.cmd run dev
```

Vite uses port 3000 and proxies `/api` to the local API on 3200. `dev:api` uses `scripts/catalog-dev.ts`; follow existing [product setup](../PRODUCTS.md) for server-file loading. The example template is not automatically a populated environment. Ignore files containing credentials. Normal development may connect to real Firebase: it is not automatically a safe fixture environment.

Use the established emulator harness for synthetic accounts/orders. Auth is `127.0.0.1:9099`, Firestore `127.0.0.1:8080`. Never point fixture/seed/repair scripts at Production. Review harness port allocation before running concurrent suites.

## Variable matrix

Values and exact current account scopes are **Pending confirmation**. `VITE_` variables are browser build inputs, not secret storage. Server credentials must never use that prefix.

| Variable | Purpose/value source | Intended scope |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Browser app configuration from the approved Firebase project; validated together | Build-time Production; separately approved local/Preview setup |
| `VITE_FIREBASE_DATABASE_ID` | Existing browser database selector; use `(default)` for this project | Same approved browser environments |
| `VITE_FIREBASE_CHECK_DOCUMENT_PATH` | Optional development read diagnostic, not commerce configuration | Development-only diagnostic use |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Existing supported split server service-account mechanism; project fixed to `parinaya-silks` | Trusted server; retain the chosen existing mechanism |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Alternative server credential JSON | Trusted server, only if this is the chosen mechanism |
| `GOOGLE_APPLICATION_CREDENTIALS` | Alternative local credential-file path, not the JSON contents | Trusted local/server environment supporting that file |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_UPLOAD_PRESET` | Signed upload/asset verification settings from Cloudinary | Trusted server; least-privilege account/preset |
| `RAZORPAY_MODE` | Exactly `test` or `live` | Approved Production server; separate local TEST setup |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Matching mode/account API pair | Production server; never copy LIVE pair into fixtures/Preview |
| `RAZORPAY_WEBHOOK_SECRET` | Independent secret matching the configured mode's webhook | Production server; separate local synthetic/TEST values |
| `RAZORPAY_TEST_UIDS` | Comma-separated explicitly approved Firebase test UIDs | Production TEST allowlist where needed |
| `RAZORPAY_TEST_ENVIRONMENT` | Local TEST permission switch; not a Production bypass | Local-only intentional TEST setup; false on hosted deployments |
| `RAZORPAY_LIVE_ACTIVATED` | Explicit LIVE initiation gate; only approved cutover sets true | Production server; keep false for TEST/local |
| `PAYMENT_WORKER_SECRET` | Separate random secret, at least 32 characters; scheduler bearer authorization | Production server and scheduler's protected header |
| `GOOGLE_MAPS_API_KEY` | Restricted Routes API key, server-side only; unused while distance is disabled | Future approved distance release only |
| `DISTANCE_DELIVERY_ENABLED` | Server-only opt-in; default and required current state `false`; only exact `true` enables the retained distance branch | Keep false; no Production variable was changed |
| `VITE_GA_MEASUREMENT_ID` | Public GA4 web-stream ID; approved ID `G-R785L2F0K0` | Production build only |
| `VERCEL_ENV`, `NODE_ENV`, `VERCEL` | Platform/runtime identity | Platform-managed; do not falsify to bypass checks |
| `VITE_DEPLOYMENT_ENV` | Derived by `vite.config.ts` from build `VERCEL_ENV` | Generated build definition; do not manually use it as an activation bypass |
| `PARINAYA_SERVER_EMULATORS`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` | Guarded harness isolation | Exact loopback test environments only; not hosted deployments |

`server/credentials.ts` supports split credentials first, then the JSON/file alternatives, then application default credentials where available. Do not add competing mechanisms to fix an unrelated issue. `.env.example` lists the main template but omits some supported alternatives and GA4; this documentation does not modify it.

## Security and configuration hygiene

- Use service owners' protected environment stores; never put secret values in Git, screenshots, URLs, support chats or docs.
- Keep production payment credentials scoped to Production. Preview payment operations explicitly reject; copying keys into Preview is neither necessary nor supported.
- Browser Firebase configuration is public, but authorization still depends on Auth, rules and server checks. Never substitute Admin credentials for browser config.
- Keep Google Routes and Razorpay secrets server-side. Return only the intended public checkout key/contract from payment APIs, never secret material.
- Use value-free diagnostics: variable presence/scope, project/mode match and safe error code. Do not dump environment variables or service-account files.
- Vite/browser environment changes require a new build; server environment changes require a new deployed function version. Neither change is performed by this guide.

## Troubleshooting setup

Missing browser Firebase variables show configuration failure; unsupported project IDs fail validation. Missing server credentials affect trusted API operations. Missing Cloudinary settings affect upload/verification. Missing Google setup has no effect on flat checkout while distance delivery is disabled. Missing payment readiness can hide online initiation while COD still depends on its own delivery/settings validity.

Existing detailed sources: [Firebase](../FIREBASE_SETUP.md), [Admin access](../ADMIN_ACCESS.md), [Razorpay setup](../RAZORPAY_TEST_SETUP.md), [GA4](../ANALYTICS.md), [distance setup](../DISTANCE_DELIVERY.md). Older setup documents contain dated hosted inventories; do not interpret them as current variable audits.

Implementation sources: `package.json`, `.env.example`, `vite.config.ts`, `src/services/firebase/config.ts`, `server/credentials.ts`, `server/firebase.ts`, `server/cloudinary.ts`, `server/payments/config.ts`, `src/analytics/browser.ts`, `scripts/test-client-changes.mjs`.

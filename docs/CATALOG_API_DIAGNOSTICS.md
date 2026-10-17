# Catalog function startup failure (17 October 2026)

## Confirmed cause

The Production POST returned HTTP 500, plain text `FUNCTION_INVOCATION_FAILED`, even without an Authorization header. The handler should reject that request with JSON HTTP 401 before initializing Firebase or running a product query. The owner's matching runtime log identifies `ERR_REQUIRE_ESM`: CommonJS `jwks-rsa/src/utils.js` requires ESM-only `jose/dist/webapi/index.js` and the function process exits.

The installed, locked chain is `firebase-admin@14.5.0 → jwks-rsa@4.1.0 → jose@6.2.12`. The same crash was reproduced using the traced Vercel function artifact with `node --no-experimental-require-module`. It loads with `--experimental-require-module`. This is a runtime module-loading incompatibility, before credential parsing, token verification, Firestore rules or list queries.

Vercel disables `require(ESM)` by default and documents the opt-in at [Advanced Node.js Usage](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration#experimental-nodejs-require-of-es-module). The dependency's [upstream changelog](https://github.com/auth0/node-jwks-rsa/blob/master/CHANGELOG.md) documents its reliance on native `require(esm)`.

## Required owner release step

In this Vercel project's **Production** environment variables, enable:

```text
NODE_OPTIONS=--experimental-require-module
```

If `NODE_OPTIONS` already contains other necessary options, retain them and add this flag; remove any conflicting `--no-experimental-require-module`. Apply it to Preview as well if testing there. Then deploy the owner's committed changes. Environment changes require a new deployment. Use a supported Node 22 or 24 runtime; the installed Firebase Admin SDK requires Node >=22. The hosted Node/builder versions were not provided or independently verified.

No credentials need renaming or replacement to fix this confirmed failure. Server parsing still uses `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, with the existing complete JSON/file/ADC alternatives. Individual credentials take precedence; incomplete triples fail closed. Escaped `\n` and actual newlines remain supported. Values were not inspected or printed. Cloudinary configuration is checked only for media operations and is not a prerequisite for listing products.

## Local changes and verification

The exported API now loads server modules inside the handler error boundary, so a missing runtime opt-in returns HTTP 503 JSON `configuration` instead of crashing the process. This boundary does **not** make Firebase usable without the required runtime setting. It logs an allowlisted diagnostic with request ID, phase, reason, error codes and stack locations, never request bodies, tokens, credential values or exception messages.

Responses distinguish missing/invalid authentication (401), missing either administrator permission (403), invalid requests (400), unsupported methods (405), conflicts (409), missing server configuration/index (503), upstream availability (503), and unexpected internal errors (500). Server failures cannot become successful empty catalogues. Token verification still checks revocation, the literal `admin: true` claim, the approved project and `adminAccess/{uid}.enabled === true`.

Production error copy is `Unable to load products. Please try again.` The existing Reload products action issues a new request. Local API setup guidance remains development-only. `api/tsconfig.json` gives the function builder Node types independently of the browser's Vite types.

Run:

```text
npm run lint
npm test
npm run build
npm run test:admin
```

The emulator suite tests the **exported** API handler against real local Auth/Firestore, including no token, malformed token, customer, claim-only, record-only, disabled access, approved empty listing and approved listing with an emulator-only draft. Existing admin/category/rules/product/browser regressions remain included; the browser test also verifies recovery from a plain-text function failure via Reload products.

Optional repeatable function packaging regression (tooling stays in ignored `.cache`, without changing application dependencies):

```text
npm install --prefix .cache/vercel-runtime --no-save --ignore-scripts --no-audit --no-fund @vercel/node@24.0.3 @vercel/build-utils@14.21.3
npm run test:catalog-runtime
```

This invokes the official builder, materializes its traced dependency files, and executes the JavaScript function without a tsx loader. It verifies 401 before SDK initialization, safe 503 when `require(ESM)` is disabled, and successful SDK import with it enabled. An intentional project mismatch stops before credential use or any network/database operation. Local execution uses Node 22.22.2; the current builder emits a `nodejs24.x` artifact, so this does not emulate Vercel's hosted wrapper or establish hosted Node 24 execution.

## Indexes, rules and Production acceptance

Completed locally: root and API TypeScript checks; all 41 unit tests; production Vite build; official-builder packaging/runtime regression in both module modes; full administrator/category/product emulator and browser suite, including list failure/retry. The Vite build retains its existing large JavaScript chunk warning. No hosted success is inferred from these checks.

Administrator listing sorts by `createdAt DESC, __name__ DESC`; it uses Firestore's normal descending single-field index, not the public status composite index. If automatic indexing for `products.createdAt` was explicitly disabled, restore that descending index. Public listing additionally filters `status == Published`; its `status ASC, createdAt DESC` index is already declared in `firestore.indexes.json`. No index or rule change is supported by this startup error. Deployed rules/index state remains unverified; nothing was published or overwritten.

After the owner deploys, confirm:

1. A POST with JSON `{"action":"list"}` and no token returns JSON 401 rather than a function crash.
2. Sign in as the existing approved administrator and open `/admin/products`; listing returns 200 and the actual catalogue (possibly empty). Do not create test products in Production.
3. If a request still fails, locate its `X-Request-ID` / JSON `requestId` in Vercel logs. Share only the safe diagnostic's phase/reason/codes/stack locations. Check credentials, service-account IAM or an index only if that new diagnostic identifies it.

No live products, credentials, permissions, rules, settings or deployments were changed. Hosted successful authenticated listing remains an owner acceptance check.

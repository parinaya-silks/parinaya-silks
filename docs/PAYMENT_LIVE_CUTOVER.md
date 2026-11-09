# Payment queue cutover preparation

These changes prepare a cutover; they do not activate LIVE or demonstrate a real
LIVE transaction. Keep environment variables and Razorpay Dashboard settings
unchanged until the owner approves the release and cutover.

## Worker indexes and deployment dependency

The worker queries **both** mode and key ID before applying each 20-record limit.
The due-time ordering and existing time budget remain. Records belonging to TEST
or a rotated key are preserved and cannot consume the LIVE batch. Their original
credentials remain necessary for any unresolved reconciliation.

Target: `parinaya-silks`, database `(default)`, query scope `COLLECTION`.

| Collection | Ordered fields |
| --- | --- |
| `paymentEvents` | `mode ASCENDING`, `keyId ASCENDING`, `nextCheckAt ASCENDING` |
| `paymentAttempts` | `mode ASCENDING`, `keyId ASCENDING`, `nextCheckAt ASCENDING` |

The manifest omits the implicit final `__name__ ASCENDING`, matching repository
convention. Both missing definitions were subsequently created through the owner's
approved create-only procedure on 9 November 2026. Existing indexes were preserved;
there is exactly one matching definition per collection. Live metadata now confirms:

| Collection | Production index ID | State |
| --- | --- | --- |
| `paymentEvents` | `CICAgLiI_5oK` | READY |
| `paymentAttempts` | `CICAgPig2YMK` | READY |

Matching read-only queries using the current worker's TEST mode/key binding both
succeeded with zero due records. The initial query immediately after READY briefly
returned code 9; subsequent checks succeeded after index availability propagated.
Do not recreate these indexes or publish the entire manifest during app release.
For another environment, wait for matching READY indexes before deploying this
worker. Emulator success alone does not establish production index readiness.
The worker deliberately fails rather than falling back to an unfiltered queue if
an index is missing. No security rule change is required.

## Retiring terminal TEST scheduling

`scripts/retire-test-payment-schedules.ts` defaults to a read-only preview. It
targets only `parinaya-silks/(default)`, scans at most 1,000 TEST attempts in pages
of 100, and logs aggregate counts only. It uses the existing server credential
loader; point `GOOGLE_APPLICATION_CREDENTIALS` to the trusted local key file or
use the existing secure server credential variables. Never paste credentials.

```powershell
node --import tsx scripts/retire-test-payment-schedules.ts --project=parinaya-silks '--database=(default)'
# After reviewing the current candidate count N:
node --import tsx scripts/retire-test-payment-schedules.ts --project=parinaya-silks '--database=(default)' --apply --expected-count=N
```

Apply refuses a count mismatch before writing. Each candidate is then reread with
its source order inside an independently retryable transaction. Only
`paymentAttempts/{id}.nextCheckAt` is deleted, only for a known matching TEST
provider mapping with an exact captured amount, consumed reservation and no
refund/review evidence. Unknown, active, released, LIVE, refunded and review cases
remain scheduled. No documents are deleted. All attempt evidence, unrelated
fields, source orders, history and webhook events are preserved.

On interruption, rerun preview to obtain the remaining count and resume. Concurrent
changes to an order/attempt cause transaction retries or a reported skip. An
already retired attempt is a no-op. This is schedule retirement, not an archival
operation and not a way to clear an unresolved payment.

New settlement logic also removes periodic scheduling for clean TEST captures.
It keeps daily LIVE capture checks, active recovery, refund/review polling and
explicit status/admin/webhook reconciliation. A later refund observation restores
scheduling. The old deployed code can reschedule a TEST capture if it reconciles
it again; recheck after the approved application release. Do not disable the
existing recovery worker during preparation.

The first production preview on 9 November found **13** eligible scheduled TEST
captures, rather than the 12 in the earlier audit. The owner explicitly approved
all 13. Apply retired all 13 schedules with zero concurrent-change skips. Read-back
comparison confirmed that only `nextCheckAt` changed: all other attempt fields,
all 13 source orders and all webhook events were unchanged. A subsequent preview
found zero remaining eligible schedules. No payment provider calls were made.

## Preview protection and remaining acceptance

`VERCEL_ENV=preview` rejects payment HTTP and service operations, including
initiation/resume, verification, reconciliation, webhook acceptance and worker
processing. It cannot be bypassed by a production Origin, valid worker secret,
an allowlisted UID or a copied LIVE activation flag. Production/local behavior
and COD services are unchanged; credential scopes remain Production-only.

Before LIVE activation: resolve any old-mode pending events/active holds using
their original credentials, confirm the two READY indexes, approve/release the
local changes, install the approved LIVE credentials and matching seven-event
webhook, explicitly activate LIVE and obtain a fresh mode/key-bound worker
heartbeat. These are separate authorized operations. Then perform owner-approved
hosted checks for COD and a real low-value LIVE transaction. Neither local tests
nor historical TEST acceptance confirms LIVE settlement or production cutover.

## Initial implementation verification (9 November 2026)

- Current Production metadata reported READY commit `b8e13c5`, Node 24, rather
  than the supplied baseline `156c520`. Payment backend/entrypoint source is
  unchanged between those commits. These new application changes remain local.
- The initial read-only worker queries returned missing-index code 9. After the
  separately approved index creation, both indexes are READY and both exact
  queries succeed. No security rules were published.
- TypeScript and production frontend build passed; the existing chunk-size warning
  remains. All 192 unit tests passed, with zero skips.
- 30 focused emulator tests passed: existing payment lifecycle (17), new cutover
  coverage (6), and seven order/coupon/loyalty/security regressions. Mixed-mode and
  rotated-key queues retain full 20-event/20-attempt capacity in each mode;
  maintenance is dry-run/count-checked/idempotent, and Preview rejects before
  protected dependency access. The new suite is included in `test:admin`.
- Packaged Vercel payment Web exports passed Preview rejection, original-byte
  HMAC/durable acceptance/tamper rejection with loopback emulators, plus signed-out
  and configuration-failure checks. Vercel Node 24 artifact executed locally on
  Node 22; this does not claim a hosted invocation of the new code.
- No new real TEST/LIVE payment, commit, push, deployment, environment-variable
  change or Razorpay Dashboard change was performed. Production changes were
  limited to the explicitly approved scheduling-field cleanup and two indexes.

## Final review — 9 November 2026

- Reviewed all 13 changed/new paths, including application code, regression tests,
  maintenance tooling and documentation. No dependency, security-rule, environment,
  frontend business-flow or unrelated UI changes are included.
- Fresh production metadata confirmed both index IDs above remain READY with
  COLLECTION scope and implicit `__name__ ASCENDING`. Both exact mode/key-bound
  queries succeeded with zero due records.
- Read-only production reconciliation found 13 TEST attempts with 13 matching
  CAPTURED/consumed source orders, 43 processed TEST webhook events, zero missing
  source orders, zero active reservations and zero pending checkout locks. No TEST
  attempt has a due or future schedule. The TEST worker heartbeat was fresh
  (42 seconds old at the 11:57 IST observation).
- The earlier approved cleanup's before/after comparison recorded that only the
  13 scheduling fields changed, with orders and webhook events unchanged. This
  final review performed no production writes and did not rerun cleanup.
- Passed: 192 unit tests; 40 tests across 18 backend/rules regression files;
  payment UI, checkout coupons, checkout context, checkout design and Bag/Wishlist
  browser suites; TypeScript; production build; packaged catalog and payment
  runtime checks; and `git diff --check`. No assertions were removed or skipped.
  The first checkout-design browser run reported offline while expecting its
  loading skeleton; the suite passed unchanged on a fresh run, including its
  explicit offline/retry coverage. The existing build chunk-size warning remains.
- Production is still READY at `b8e13c5`; the new application behavior has only
  been verified locally. The packaged Node 24 Vercel artifact ran locally on Node
  22, not in a newly deployed function. Hosted acceptance of this code remains
  part of the proposed application release below.

## Proposed application release (requires owner confirmation)

Final review added a Preview guard at the start of direct internal `reconcile()`
as well as the HTTP/customer/configuration guards. The regression checks that a
direct Preview reconciliation rejects before Firestore or provider access.

Proposed commit: `fix(payments): isolate recovery queues and block Preview processing`

Stage only these 13 reviewed paths, preserving any other work:

```text
docs/PAYMENTS.md
docs/PAYMENT_LIVE_CUTOVER.md
firestore.indexes.json
server/payments/config.ts
server/payments/http.ts
server/payments/queue.ts
server/payments/service.ts
server/payments/settlement.ts
scripts/admin-emulator-suite.ts
scripts/payment-cutover-emulator.test.ts
scripts/payments-runtime.test.mjs
scripts/retire-test-payment-schedules.ts
src/payments/security.test.ts
```

After confirmation, recheck the final diff and remote `main` for concurrent work,
stage the allowlist, inspect the staged diff, commit with the existing authorized
project identity and push `main` through the established GitHub/Vercel workflow.
Do not stage `.cache`, `.env*`, credentials or generated runtime artifacts. Do not
rerun maintenance or publish any indexes/rules as part of this app release.

Keep the existing TEST payment configuration and LIVE activation setting unchanged.
Verify Vercel's Production deployment is READY for the exact new commit and that
the approved domains point to it. Observe the existing scheduler's fresh TEST
mode/key-bound heartbeat, successful filtered queries, no unexpected pending work
and no recreated terminal schedules. Check existing customer/Admin views read-only
and verify Preview payment endpoints return 403 without initiating a payment.
New TEST/LIVE transactions require separate authorization.

If hosted checks fail, restore the previous known Production deployment (`b8e13c5`
at review time) while retaining TEST configuration, all payment evidence and both
indexes; investigate before any LIVE configuration change. Application rollout
is separate from installing LIVE keys/webhook, changing mode/activation, obtaining
the first fresh LIVE heartbeat and approving the first real LIVE transaction.

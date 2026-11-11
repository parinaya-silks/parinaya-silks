> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Deployment and release guide

For the release owner and incoming maintainer. Baseline: 11 November 2026, local HEAD `405716c` plus existing uncommitted delivery work. This is a future operational procedure, not a release authorization. No commit, push, deployment, provider change or production mutation was performed for documentation.

## Release inventory and gates

Record the intended application commit, reviewed working-tree changes, GitHub repository/branch, Vercel project/team, deployment ID/URL, domain and configuration owner. Current Production values are **Pending confirmation**. A GitHub push alone does not prove a ready Vercel deployment or that the custom domain serves it.

Before release:

1. Review the intended diff and preserve unrelated work. Identify application, documentation, rules/index and external configuration changes separately.
2. Use the [verification guide](verification-acceptance.md) to select the established required checks once; attach dated output to the intended commit. Do not reuse historical results as proof of a different source tree.
3. Confirm server/browser environment scopes using the [environment matrix](local-setup-environments.md). Do not print values. Confirm the actual Vercel Node/build settings and protected production branch.
4. Review `vercel.json` rewrites, function limits and private-route robots headers. SPA rewrites do not prove API health.
5. Publish only separately approved Firestore rule/index changes, if any. Wait for required indexes to be READY. Existing queue indexes must match mode/key/due-time queries. Application deployment does not publish Firebase configuration automatically.
6. Complete provider-specific acceptance/configuration gates below.
7. Obtain the owner's explicit release approval, then follow the existing GitHub/Vercel workflow. Nothing in this document changes a previous no-release instruction.

## Future distance-delivery cutover (inactive; not a flat-shipping release gate)

The local implementation intentionally blocks new orders if active origin, road pricing or Google configuration is unavailable. It does not silently retain an old all-India flat fee. Existing pending online reconciliation and historical order display remain independent of new quote readiness.

Before approving that cutover, complete [Google Routes setup](google-routes-setup.md), approve origin/slabs/free threshold/COD preference, agree configuration-save sequencing and configure quote cleanup/retention. Do not assume new Admin settings can be saved through an older deployment. Plan a controlled cutover and owner acceptance rather than promising no downtime without evidence.

Never seed guessed coordinates or sample rates into Production. Legacy configuration remains readable for migration, not authoritative for new distance orders. Verify a real route separately from mock-based integration tests.

## Razorpay deployment and mode changes

Use the existing [payment cutover record](../PAYMENT_LIVE_CUTOVER.md) and [payment reference](../PAYMENTS.md). A mode change is a separate owner-approved production operation; documentation does not activate LIVE.

- Keep the selected API pair and webhook secret together under the intended mode/account. LIVE key prefix alone is not activation; new initiation also requires the explicit flag and fresh matching worker heartbeat.
- Production TEST initiation is UID-allowlisted. Preview payment initiation, verification, webhooks and worker processing reject.
- Match the actual mode's webhook to `https://www.parinayasarees.com/api/payments/webhook` and the seven supported events in the [API reference](../technical/api-reference.md). Confirm the current public domain and Dashboard UI before saving.
- Configure the scheduler to POST `{}` every minute to `https://www.parinayasarees.com/api/payments/worker`, with JSON content type and `Authorization: Bearer <PAYMENT_WORKER_SECRET>` in a protected header. Do not put the secret in the URL.
- Confirm mode/key-bound heartbeat freshness (under five minutes), query/index readiness and unresolved old-mode holds/events before switching. New-mode worker isolation intentionally does not process old-mode records.
- Retain history and original-account reconciliation capability. Do not delete attempts/events or replace historical provider evidence to make a queue look clear.
- An idle worker 200 result or intercepted local suite is not a real payment acceptance test.

## Domain, Auth, content and analytics

Confirm domain/DNS ownership, TLS and Firebase authorized domains/password-reset actions. Existing source SEO canonical/product-schema and sitemap origins still use `parinayasilks.vercel.app`; custom-domain SEO correction is a separate application issue and remains **Pending confirmation**. Do not mark SEO release acceptance complete merely because routing works on the custom domain.

Verify approved policy text and contact/social visibility. Store appearance selection does not prove a particular saved Production theme. Confirm GA4 stream/currency, explicit opt-in, Enhanced Measurement settings and actual incoming events using [ANALYTICS.md](../ANALYTICS.md). Only manual page views are implemented; ecommerce tracking is separate.

## Post-deployment evidence

Record, without sensitive values:

- READY Production deployment ID and exact Git commit; custom-domain response serving the intended release.
- Public catalog/content/image health and owned customer/Admin access.
- Deployed rule/index status and relevant environment presence/scope.
- Payment worker time/mode/key equality checks without publishing full keys; webhook acceptance/processing evidence where authorized.
- Approved route quote and checkout acceptance, optional shipment update, coupon and points checks appropriate to the release.
- Any failed check, rollback decision, owner acceptance and unresolved external prerequisite.

Mutating acceptance (orders, payments, stock, settings, refunds, accounts) needs explicit owner authorization and approved records. Read-only release checks must remain read-only.

## Rollback

Identify the last accepted deployment before release. An owner-approved Vercel rollback restores application artifacts, not Firestore settings/data, provider webhook configuration, environment values or historical reservations. Review compatibility with newly saved shipping schemas, pending payments and active mode/key before rollback. Do not roll back financial truth or delete accepted orders. If compatibility is uncertain, escalate and prevent unsafe new initiation using the authorized existing controls rather than improvising a data repair.

Sources: `vercel.json`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `server/payments/config.ts`, `server/payments/queue.ts`, `server/routes.ts`, packaged-runtime scripts, existing release/setup notes. Current service plan, automatic deployment branch and production health: **Pending confirmation**.

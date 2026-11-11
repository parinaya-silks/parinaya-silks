> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Ownership, handover and acceptance

For the client owner, release owner and incoming maintainer. Prepared 11 November 2026 from the inspected local implementation. This is an ownership checklist, not a completion certificate. Undocumented account ownership, billing, deployed configuration and support commitments are **Pending confirmation**.

## Service register

Do not place passwords, private keys, access tokens, recovery codes or secret values in this table or attachments. Transfer access through each service's approved invitation/recovery process.

| Service | Used for | Required ownership/access confirmation | Billing responsibility |
| --- | --- | --- | --- |
| GitHub | Source and approved release workflow | Repository owner, organization, maintainers, protected branch and recovery | Pending confirmation |
| Vercel | Frontend/API hosting, production deployment and environments | Team/project owner, deployment permissions, domain binding, runtime/plan | Pending confirmation |
| Domain/DNS provider | `parinayasarees.com`, DNS and renewal | Registrant, DNS administrator, renewal/recovery contacts | Pending confirmation |
| Firebase / Google Cloud | Auth, Firestore, rules/indexes and server IAM | Project `parinaya-silks`, database `(default)`, owner/IAM and credential custody | Pending confirmation |
| Cloudinary | Product/category/banner/login/founder media | Client account/cloud owner, asset ownership, upload preset and recovery | Pending confirmation |
| Razorpay | TEST/LIVE payments, provider webhooks/refunds | Merchant/legal owner, activation status, authorized operators and alert contact | Pending confirmation |
| External scheduler | Minute payment recovery worker | Current job owner, protected headers, schedule/timeout and failure alerts; cron-job.org was owner-reported | Pending confirmation |
| Google Routes project | Billable driving-distance quotations | Chosen Cloud project, billing owner, API administrator, key/quota/alerts | Pending confirmation |
| GA4 | Opted-in storefront page views | Property/web-stream owner, access, ID `G-R785L2F0K0`, INR/settings | Pending confirmation |
| OSM tile access | Optional browser map tiles | Traffic suitability, attribution and any future hosting decision; no unlimited/SLA claim | Pending confirmation |
| Business communication accounts | Published email, phone, WhatsApp and social links | Owner consent, correct links/numbers, response responsibility | Pending confirmation |

The visible brand is Parinaya Sarees. Repository/project identifiers retaining Silks must not be renamed casually during handover. Final legal entity/trading-name wording is **Pending confirmation**.

## Responsibilities

**Client/business owner:** approve product/campaign/coupon/loyalty/shipping policies and rates; provide accurate dispatch coordinates/contact details; own merchant activation and billing; approve legal content; reconcile physical stock and external COD/refunds; manage customer support; authorize production acceptance and releases.

**Developer/maintainer:** preserve server-authoritative payment/order contracts; review scoped changes; maintain safe setup/runbooks and evidence; protect secrets; test appropriate changes; separate application release from provider/Firebase configuration; report limitations and incidents without manufacturing success.

**Release/infrastructure owner:** maintain repository/deployment access, domain/TLS, production variable scopes, provider webhooks, scheduler, quotas/alerts, backups and approved rollout/rollback. These duties may belong to client or maintainer; named assignment and support hours are **Pending confirmation**.

No maintenance period, response SLA, emergency availability or recurring fee is implied by source delivery. Record the agreed commercial support terms separately with named contacts and escalation routes.

## Secure access transfer

1. Confirm each account belongs to the intended client/legal entity and grant named least-privilege access rather than sharing one password.
2. Verify owner-controlled recovery email/phone, MFA and billing access privately.
3. Inventory configuration variable names/scopes using the [environment reference](../operations/local-setup-environments.md); do not export their values into docs.
4. Agree rotation timing for developer-held credentials, considering pending payment attempts, original mode/key recovery, webhook/scheduler consistency and controlled redeployment.
5. Confirm media/domain/IP rights, backups and recoverability; remove obsolete access only after replacement ownership is verified.

## Outstanding acceptance register

| Item | Owner/action | Status |
| --- | --- | --- |
| Final baseline | Record accepted commit, READY deployment and custom-domain parity; distinguish uncommitted distance work | Pending confirmation |
| Optional future distance cutover | Inactive; only a separately approved re-enable requires origin/slabs/Google configuration and acceptance | Not required for current flat checkout |
| Current payment operations | Record active TEST/LIVE mode, activation approval, webhook/scheduler health and relevant actual acceptance evidence | Pending confirmation |
| Policies and claims | Approve shipping/returns/exchanges/cancellation/privacy/terms and contact/business claims | Pending confirmation |
| SEO domain | Separately review old Vercel origin in canonical/schema/sitemap source | Pending confirmation; not changed by documentation |
| GA4 | Confirm property/settings/consent acceptance and incoming page views; ecommerce tracking remains outside basic integration | Pending confirmation |
| Recovery and support | Name owners, backup/restore coverage, retention, incident contacts and support agreement | Pending confirmation |
| Documentation review | Client reviews user guides; maintainer reviews technical/operations details and evidence labels | Pending confirmation |

## Acceptance record to complete at handover

| Field | Value |
| --- | --- |
| Client approver / date | Pending confirmation |
| Maintainer / contact | Pending confirmation |
| Application commit / deployment ID | Pending confirmation |
| Documentation revision / reviewer | Prepared 11 November 2026; formal review Pending confirmation |
| Approved service/account register | Pending confirmation |
| Accepted known limitations | Pending confirmation |
| Open work, owner and target date | Pending confirmation |
| Backup/recovery acceptance | Pending confirmation |
| Support term and escalation | Pending confirmation |

Completion means the agreed scope and explicitly recorded exceptions are accepted, not that every future feature or external service is guaranteed. Retain order/payment history and dated implementation evidence. Do not convert a planning note or mocked test into a signed operational claim.

Sources: repository configuration and the [documentation index](../README.md), [deployment guide](../operations/deployment-release.md), [verification register](../operations/verification-acceptance.md), retained payment/delivery/analytics setup notes. No account ownership or Production audit was performed during this documentation run.

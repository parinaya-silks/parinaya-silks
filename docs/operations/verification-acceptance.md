> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](../FLAT_SHIPPING.md).

# Verification and acceptance register

For reviewers and release owners. Documentation date: **11 November 2026**. This documentation-only run did not execute application tests, TypeScript, builds, emulators, browser checks, provider requests or deployments. Existing evidence is retained, not relabelled as fresh execution.

## Evidence register

| Area | Evidence available | Current acceptance boundary |
| --- | --- | --- |
| Flat-shipping restoration, 11 November | 35 focused unit tests, 32 emulator TAP tests across 10 files, TypeScript and production build passed | Local only; no real provider calls or Production changes |
| Source baseline | Planning inspection: HEAD `405716c`, 31 tracked modifications and 12 untracked files before documentation | Local source only; deployed parity **Pending confirmation** |
| Distance delivery/local regressions | [DISTANCE_DELIVERY.md](../DISTANCE_DELIVERY.md), dated 9 November: 45 focused unit tests; 29 emulator TAP tests; focused browser flow; typecheck/build and packaged runtimes | Reported historical local execution; not rerun for documentation |
| Coupon/loyalty | [COUPON_LOYALTY_AUDIT.md](../COUPON_LOYALTY_AUDIT.md) and associated tests | Dated scope/results; current live terms/balances **Pending confirmation** |
| Payment cutover | [PAYMENT_LIVE_CUTOVER.md](../PAYMENT_LIVE_CUTOVER.md), payment security/emulator/runtime tests | Local/dated evidence; current mode, provider settings and Production health **Pending confirmation** |
| Real Razorpay TEST acceptance | Owner previously reported desktop/mobile success, failure, retry, verification, inventory and points acceptance | Owner-reported; independent new execution not performed here; LIVE acceptance separate |
| Real Google Routes | No new real route request made; prior implementation notes distinguish synthetic responses | Billing/key/real route and deployed checkout **Pending confirmation** |
| GA4 | [ANALYTICS.md](../ANALYTICS.md) describes intercepted tests and owner live checks | Actual property receipt/settings **Pending confirmation** |
| Policies/ownership/backups | UI and configuration contracts exist | Approved wording, service ownership and operational configuration **Pending confirmation** |

## Established commands for a separately authorized release

These commands are references, not steps performed in this documentation run:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:catalog-runtime
npm.cmd run test:payments-runtime
```

`lint` means `tsc --noEmit`, not an ESLint scan. Production build success is a local artifact check, not a deployment. Packaged-runtime scripts exercise Vercel-compatible function packaging locally; inspect their generated-artifact scope before running and preserve unrelated changes.

Use the existing `npm.cmd run test:client-changes` harness and its documented selectors for focused emulator/browser coverage. Detailed distance selectors and file names are retained in [DISTANCE_DELIVERY.md](../DISTANCE_DELIVERY.md). Other established harnesses include `test:admin`, `test:analytics`, `test:discovery`, `test:loading` and `test:foundation`; choose according to actual change scope rather than repeatedly running everything.

Emulator fixtures require the exact guarded loopback endpoints. Normal frontend/API development can reach real Firebase. Tests must not silently target Production, create real customers or use LIVE credentials. Do not skip/weaken failures to obtain a green release.

## Acceptance coverage by risk

- Customer: sign-in/reset/profile recovery; browse/filters/variants; shopping intent; Bag versus Buy Now; address ownership and map/manual entry; checkout stage stability and stale-review recovery.
- Offers/points: eligible/ineligible public discovery; private-code entry; disabled ineligible apply and backend rejection; exact Delivered-order rules; limits/concurrency; Apply/Remove; reservation, earning once, cancellation/restoration/refund/debt.
- Payments: callback signature plus provider evidence; signed raw webhook; duplicate/reordered events; TEST/LIVE and key isolation before batch limit; terminal TEST scheduling; Preview rejection; heartbeat; unknown outcomes/retries; refunds; COD separation.
- Delivery: active origin/road pricing; slab/free-threshold boundaries; disabled/out-of-range coverage; stale/tampered/foreign quotes; address/settings revisions; no production doubles; missing provider fails safely; accepted-payment recovery stays independent.
- Admin: dual authorization, revoked access, optional courier/name/URL/AWB/ETA through valid statuses, bulk partial results/conflicts, media verification, settings replay and save/discard.
- UI/privacy: responsive layout, keyboard/focus/overlay scroll, reduced motion, readable surfaces, safe links, no duplicate analytics or sensitive page payloads.

## Hosted verification is separate

Record deployment ID/commit/domain, rule/index metadata and safe configuration presence/scope. Read-only checks must not mutate records. Real route quotations can write temporary quotes/incur charges; payment/order/status/refund acceptance requires separately approved accounts/records and explicit authorization.

For GA4, follow Tag Assistant/DebugView/Realtime acceptance in [ANALYTICS.md](../ANALYTICS.md). For payment and delivery, use the existing provider/setup references. A rendered success screen, mocked assertion, worker HTTP 200 or Git push is insufficient evidence by itself.

## Optional screenshot plan

No screenshots were generated for documentation. Existing `.cache/distance-delivery/` images are local fixtures; intercepted map tiles do not establish public OSM availability. Do not publish them as Production proof or copy all cached assets blindly.

If approved later, capture only necessary, sanitized examples:

| Destination | Minimal subjects |
| --- | --- |
| `docs/assets/customer/` | Product/variant, Bag, address/map, coupon dropdown, points, delivery total, pending/confirmed order |
| `docs/assets/admin/` | Product/stock modes, optional delivery fields, bulk result, origin/slabs/COD, policy approval, customer export |
| `docs/assets/diagrams/` | Optional exported architecture/payment/delivery diagrams; Mermaid source already exists in overview |

Use representative 390px mobile and 1440px desktop captures; review affected UI at 320/390/768/1440 where a real release warrants it. Use synthetic or explicitly approved data, hide personal/account/payment identifiers and all secret-bearing views. Name captures by feature, width, commit/date and local/hosted context. Refer to a shared image from multiple guides instead of duplicating it.

## Documentation completeness checklist

- [ ] Record final accepted application commit/deployment and guide reviewer/date.
- [ ] Resolve source/Production differences and custom-domain SEO discrepancy separately.
- [ ] Confirm approved policies, commercial rates and support contacts.
- [ ] Confirm external provider configuration, billing, cleanup and actual acceptance.
- [ ] Confirm account ownership, backups/recovery and support responsibilities.
- [ ] Check relative links, branding, field labels and screenshots without exposing private data.
- [ ] Keep historical results dated; label mocks, owner reports and pending items honestly.
- [ ] Client approves operator guides; maintainer approves technical/operations references.

Implementation sources: `package.json`, module tests, `scripts/test-client-changes.mjs`, payment/delivery/coupon/loyalty emulator/browser scripts and packaged-runtime scripts. This checklist is not a claim that every future release gate has already passed.

> **Current shipping status (11 November 2026):** `DISTANCE_DELIVERY_ENABLED=false` by default. New checkout uses the existing saved flat shipping configuration, before coupons/points, with free shipping strictly above its saved threshold. Google Routes, dispatch coordinates, slabs and distance quotes are inactive. Historical order charges are unchanged. Distance-specific material below describes a retained, inactive implementation until a future explicitly approved re-enable. See [current flat shipping reference](FLAT_SHIPPING.md).

# Parinaya Sarees documentation

Documentation date: **11 November 2026**. Audience: client operators, developers and service owners.

This index and the linked guides describe the inspected local checkout at Git HEAD `405716c`, including the uncommitted distance-delivery implementation. They are not evidence that those changes are deployed. Current Production commit, provider settings and account ownership are **Pending confirmation**. Earlier owner-reported payment acceptance is useful context, but is not a new independent verification.

## Reading paths

| Reader | Start here | Continue with |
| --- | --- | --- |
| Business owner | [Overview](overview.md) | [Ownership and acceptance](handover/ownership-acceptance.md), [release guide](operations/deployment-release.md) |
| Customer/support | [Customer guide](client/customer-guide.md) | Approved public policies on the website |
| Catalog operator | [Catalog and inventory](client/admin-catalog-inventory.md) | [Content and settings](client/admin-content-settings.md) |
| Fulfilment/support operator | [Orders and customers](client/admin-orders-customers.md) | [Troubleshooting](operations/maintenance-troubleshooting.md) |
| Developer | [Architecture](technical/architecture.md) | [Data/security](technical/firestore-security.md), [API reference](technical/api-reference.md), [commerce transactions](technical/commerce-transactions.md), [delivery](technical/delivery-architecture.md) |
| Release/operations owner | [Local setup and environments](operations/local-setup-environments.md) | [Deployment](operations/deployment-release.md), [Google Routes](operations/google-routes-setup.md), [acceptance](operations/verification-acceptance.md) |

## Authority and maintenance

- Code defines implemented behaviour. These guides consolidate that behaviour; they do not authorize configuration changes or release work.
- Client guides explain operation. Technical references explain contracts. Operations guides own configuration and release instructions. Handover owns account responsibility and acceptance.
- New/current guides below this index take precedence over conflicting historical milestone statements. Preserve historical audit evidence with its original date and commit.
- After a functional change, update the affected guide and the documented baseline. Record deployed verification separately from local tests.
- Do not add credentials, customer records, authentication links or unredacted provider screenshots to documentation.

## Existing documentation retained for reuse

| Existing material | Reuse and limitation |
| --- | --- |
| [DISTANCE_DELIVERY](DISTANCE_DELIVERY.md) | Detailed local implementation, rollout dependencies, file inventory and dated local checks. Reused rather than rewritten. |
| [PAYMENTS](PAYMENTS.md), [PAYMENT_LIVE_CUTOVER](PAYMENT_LIVE_CUTOVER.md) | Detailed payment architecture and cutover evidence. Hosted findings are tied to their recorded date/commit. |
| [RAZORPAY_TEST_SETUP](RAZORPAY_TEST_SETUP.md), [TEST QA findings](RAZORPAY_TEST_QA_FINDINGS.md) | Historical setup/acceptance records. Statements about missing variables or old deployments are not a current configuration audit. |
| [LOYALTY](LOYALTY.md), [COUPON_LOYALTY_AUDIT](COUPON_LOYALTY_AUDIT.md), [COUPONS](COUPONS.md) | Detailed allocation, eligibility and concurrency rules. The pre-coupon/strict flat shipping paragraph in LOYALTY is active again; distance-specific calculations remain inactive. Early COUPONS statements that campaigns are unavailable are historical. |
| [CUSTOMER_AUTH](CUSTOMER_AUTH.md), [CUSTOMERS](CUSTOMERS.md) | Authentication, profile and directory details. Early statements that customer order history is unavailable are superseded by the current routes. |
| [DELIVERY_UPDATE](DELIVERY_UPDATE.md), [ORDERS_LIST](ORDERS_LIST.md), [ORDER_DETAILS](ORDER_DETAILS.md) | Workflow/design history. Mandatory courier/AWB descriptions are superseded: all shipment fields are now optional. |
| [SHIPPING](SHIPPING.md), [DELIVERY_REVIEW](DELIVERY_REVIEW.md), [STORE_SETTINGS](STORE_SETTINGS.md) | Earlier flat-shipping milestones. Use the current flat-shipping reference before following historical release instructions. |
| [PRODUCTS_STITCH](PRODUCTS_STITCH.md), [CATEGORIES](CATEGORIES.md), [INVENTORY](INVENTORY.md) | Detailed product and inventory guidance; screenshots/layout descriptions must be matched to the eventual release. |
| [WEBSITE_CONTENT](WEBSITE_CONTENT.md), [CAMPAIGNS](CAMPAIGNS.md), [BANNERS](BANNERS.md), [CONTACT_INFORMATION](CONTACT_INFORMATION.md), [ENQUIRIES](ENQUIRIES.md) | Existing module-specific references; linked from current operator guides. |
| [ANALYTICS](ANALYTICS.md), [LOADING_EXPERIENCE](LOADING_EXPERIENCE.md), [theme/offers](STOREFRONT_THEMES_AND_OFFERS.md) | Reused detailed implementation notes. GA4 receipt and Production settings remain separate acceptance checks. |
| [COMPLETION](COMPLETION.md), [TAKEOVER_AUDIT](TAKEOVER_AUDIT.md), older design/fix reports | Historical records, not a current completion certificate or release instruction. |

## Terms and evidence labels

**Implemented locally** means code exists in the documented checkout. **Deployed** requires a deployment identifier and matching commit. **Verified operationally** requires a dated observation of the relevant hosted/provider behaviour. **Pending confirmation** means no sufficient current evidence is recorded.

Money is stored/calculated in integer **paise**, displayed in **INR**. A courier tracking link is not a courier API integration. An accepted webhook is not proof of completed reconciliation. An order page or browser payment callback is not proof of captured funds.

No screenshots were generated for this documentation run. [The acceptance guide](operations/verification-acceptance.md) specifies an optional future capture plan. Do not treat existing fixture screenshots as Production evidence.

# Approved storefront colours

The approved colour hierarchy is implemented in `src/components/storefront-colours.css`, imported after the existing styles in `src/main.tsx`.

| Role | Colour |
| --- | --- |
| Customer page canvas, gutters and section spacing | `#BC8692` solid, full opacity |
| Existing navbar and primary controls | `#780D24` |
| Cards, forms, inputs, dialogs, inactive controls and bottom navigation | `#FFFFFF` |
| Headings on the canvas | `#3A0510` |
| Body/support text on the canvas | `#2A0810` |

Tokens are scoped to the mounted `.customer-storefront`; body/root coverage follows that shell through `:has()`. The shared Tailwind palette is unchanged, so Admin retains its existing colours. Customer modal/top-layer/portal surfaces are white under the same body guard. There is no theme selector or new appearance-management feature.

Only colour properties are changed. Existing layout, type sizes/families, spacing, image sources, filters, opacity, crops, ratios, breakpoints, carousel behaviour, social controls and business code remain intact. The footer's existing brand palette and semantic success/error/warning/order-status treatments are retained. Darker canvas labels and focus rings address contrast; white panels retain readable dark text. Reference HTML is used for colour only; its older palettes, sample data, branding and redesign instructions are not copied.

Validation uses loopback fixtures and ignored `.cache/colours` artifacts, never production customers or orders. Checks cover Home, Shop/category, Product, authentication, About, Contact, policies, account/addresses/orders, order detail and all checkout stages at 320/390/768/1440px. Representative layout boxes, typography and image crop/filter/opacity are compared with this stylesheet enabled/disabled. Admin's computed styles are compared the same way, including its category dialog. Customer native and body-portal dialogs are checked separately.

Existing acceptance commands: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run test:analytics`, plus the existing storefront-presentation, checkout-design, shopping-design and social-drawer browser suites through `test:client-changes`. The latter use local Auth/Firestore emulators. They include Apply/Remove Points and shopping/auth flows. Builds retain the existing large-chunk advisory.

Release follows the existing GitHub main → Vercel Production integration. No environment variable, security-rule/index publication or production-record update is required for these colours. A local build or emulator pass is separate from Vercel readiness and hosted visual checks; report the deployed commit and actual checks separately after release.

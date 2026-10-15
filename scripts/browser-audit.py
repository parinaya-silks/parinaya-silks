"""Local smoke audit. Requires Python Playwright and Chromium; start npm run dev first."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

routes = ['/', '/shop', '/shop?search=wine', '/product/prod-mayuri-wine', '/wishlist', '/bag', '/checkout', '/order-confirmed?orderId=ord-1089', '/account', '/account/orders/ord-790412', '/login', '/register', '/forgot-password', '/verify-email?email=test%40example.com', '/about', '/contact', '/policies?tab=returns', '/shipping-policy', '/privacy-policy', '/terms-conditions', '/product/missing', '/order-result/missing', '/order-tracking/missing', '/admin', '/admin/orders', '/admin/orders/ord-1089', '/admin/products', '/admin/products/new', '/admin/products/edit/prod-mayuri-wine', '/admin/customers', '/admin/coupons', '/admin/settings']
Path('.cache/browser').mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    results = []
    for width in [360, 390, 430, 768, 1024, 1440]:
        page.set_viewport_size({'width': width, 'height': 900})
        for route in routes:
            errors.clear()
            page.goto('http://127.0.0.1:3000/#' + route)
            page.locator('#root').wait_for()
            page.wait_for_timeout(60)
            overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
            results.append({'width': width, 'route': route, 'overflow': overflow, 'errors': errors.copy()})
            if route == '/' and width in [390, 1440]:
                page.screenshot(path=f'.cache/browser/home-{width}.png')
    Path('.cache/browser/results.json').write_text(json.dumps(results, indent=2))
    failures = [r for r in results if r['errors'] or r['overflow']]
    print(json.dumps({'checks':len(results),'failures':failures}, indent=2))
    browser.close()
    if failures: raise SystemExit(1)

"""Token-owned coupon selector against loopback services; no provider or live records."""
import os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST') == '127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST') == '127.0.0.1:9099'
origin = 'http://127.0.0.1:3100'
out = Path('.cache/checkout-coupons'); out.mkdir(parents=True, exist_ok=True)
def fixture(action, script='theme-offers'):
    subprocess.run(['node', '--import', 'tsx', f'scripts/{script}-fixture-control.ts', action], check=True, capture_output=True)
fixture('cleanup', 'homepage'); fixture('seed', 'homepage'); fixture('seed'); fixture('minimum')
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={'width':390, 'height':900}, reduced_motion='reduce')
        ctx.route('https://**/*', lambda r:r.abort())
        ctx.route('https://res.cloudinary.com/**', lambda r:r.fulfill(status=200, content_type='image/jpeg', body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
        page = ctx.new_page(); errors=[]; reads=[]; mutations=[]; quotes=[]; held=[]; network={'mode':'live'}
        page.on('pageerror', lambda e:errors.append(str(e)))
        def intercept(route):
            body=route.request.post_data_json if route.request.method=='POST' else {}
            if body.get('action')=='coupons:available' and body.get('eligibleOnly'):
                reads.append(body)
                if network['mode']=='hold': held.append(route); return
                if network['mode']=='fail': route.fulfill(status=503,json={'code':'unavailable'}); return
            if body.get('action')=='orders:place': mutations.append(body)
            route.continue_()
        def response(r):
            if '/api/catalog' in r.url and r.request.method=='POST' and r.request.post_data_json.get('action')=='orders:review' and r.status==200: quotes.append(r.json())
        page.route('**/api/catalog', intercept); page.on('response', response)
        page.goto(origin+'/login?returnTo=%2Fshop')
        page.get_by_label('Email address',exact=True).fill('customer@example.test')
        page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD'])
        page.get_by_role('button',name='Sign In',exact=True).click(); page.wait_for_url('**/shop')
        page.get_by_role('region',name='Available Offers').get_by_role('button',name='Apply PUBLIC10').click(); page.wait_for_url('**/checkout')
        page.get_by_role('button',name='Continue to Review',exact=True).click(); page.wait_for_url('**/checkout/summary')
        page.get_by_role('button',name='Remove coupon',exact=True).click()
        expect(page.get_by_role('button',name='Continue to Payment',exact=True)).to_be_enabled()
        original=page.locator('[data-checkout-total]').get_attribute('data-checkout-total')
        selector=page.get_by_role('region',name='Available Coupons')
        toggle=selector.get_by_role('button',name='View Available Coupons')
        expect(toggle).to_have_attribute('aria-expanded','false'); assert not reads
        network['mode']='hold'; toggle.focus(); page.keyboard.press('Space')
        expect(selector.get_by_role('status',name='Checking available coupons')).to_be_visible()
        page.screenshot(path=str(out/'loading-390.png'),full_page=True)
        network['mode']='live'
        for route in held: route.continue_()
        held.clear()
        expect(selector.locator('article')).to_have_count(1)
        expect(selector.get_by_role('button',name='Apply Coupon PUBLIC10')).to_be_enabled()
        assert 'THIRD' not in selector.inner_text() and 'CARTMIN' not in selector.inner_text()
        selector.get_by_role('button',name='Apply Coupon PUBLIC10').click()
        expect(selector.get_by_role('button',name='Applied PUBLIC10')).to_be_disabled()
        expect(page.locator('.checkout-applied')).to_contain_text('Coupon applied.')
        assert quotes[-1]['discountPaise']=='10000'
        assert int(page.locator('[data-checkout-total]').get_attribute('data-checkout-total'))==int(original)-10000
        selector.get_by_role('button',name='Remove PUBLIC10').click()
        expect(page.locator('[data-checkout-total]')).to_have_attribute('data-checkout-total',original)
        # Both themes and narrow/desktop layouts use the same compact cards and Lora.
        for theme in ['classic-cream','light-maroon']:
            if theme=='light-maroon': fixture('maroon'); page.reload(); selector.get_by_role('button',name='View Available Coupons').click()
            for width in [320,390,768,1440]:
                page.set_viewport_size({'width':width,'height':900})
                expect(selector.get_by_role('button',name='Apply Coupon PUBLIC10')).to_be_enabled()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert 'ParinayaLora' in selector.evaluate('e=>getComputedStyle(e).fontFamily')
                assert selector.get_by_role('button',name='Apply Coupon PUBLIC10').bounding_box()['height']>=44
                page.evaluate('scrollTo(0,0)'); assert selector.bounding_box()['y'] > page.locator('.checkout-coupon').bounding_box()['y']
                page.screenshot(path=str(out/f'{theme}-{width}.png'),full_page=True)
                selector.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
                action=selector.get_by_role('button',name='Apply Coupon PUBLIC10')
                box=action.bounding_box(); assert 0<=box['y'] and box['y']+box['height']<=900
                dock=page.locator('.checkout-actions')
                if width<1024:assert dock.is_visible();assert box['y']+box['height']<=dock.bounding_box()['y']
                page.screenshot(path=str(out/f'{theme}-{width}-viewport.png'))
        # A cart change that crosses a minimum refreshes offers even while checkout stays mounted.
        fixture('cart-two'); expect(selector.get_by_role('button',name='Apply Coupon CARTMIN')).to_be_enabled()
        selector.get_by_role('button',name='Apply Coupon CARTMIN').click()
        expect(selector.get_by_role('button',name='Applied CARTMIN')).to_be_disabled()
        fixture('cart-one')
        expect(page.locator('.checkout-applied')).to_contain_text('could not be confirmed')
        expect(selector.get_by_role('button',name='Applied CARTMIN')).to_have_count(0)
        expect(page.get_by_role('button',name='Continue to Payment',exact=True)).to_be_disabled()
        page.get_by_role('button',name='Remove coupon',exact=True).click()
        expect(page.get_by_role('button',name='Continue to Payment',exact=True)).to_be_enabled()
        expect(selector.get_by_role('button',name='Apply Coupon CARTMIN')).to_have_count(0)
        # Errors never masquerade as empty results and retry uses the same authenticated endpoint.
        network['mode']='fail'; page.evaluate("dispatchEvent(new Event('focus'))")
        expect(selector.get_by_role('button',name='Retry offers')).to_be_visible()
        expect(selector.get_by_text('No offers available for this order right now.',exact=True)).to_have_count(0)
        network['mode']='live'; selector.get_by_role('button',name='Retry offers').click()
        expect(selector.get_by_role('button',name='Apply Coupon PUBLIC10')).to_be_enabled()
        fixture('disable'); page.evaluate("dispatchEvent(new Event('focus'))")
        expect(selector.get_by_text('No offers available for this order right now.',exact=True)).to_be_visible()
        # Manual invalid entry remains recoverable; no acceptance or reservation happens on discovery.
        page.get_by_label('Coupon code',exact=True).fill('INVALID')
        page.get_by_role('button',name='Apply coupon',exact=True).click()
        expect(page.get_by_role('button',name='Continue to Payment',exact=True)).to_be_disabled()
        page.get_by_role('button',name='Remove coupon',exact=True).click()
        expect(page.get_by_role('button',name='Continue to Payment',exact=True)).to_be_enabled()
        assert not mutations and not errors, (mutations,errors)
        assert all('uid' not in body and 'customerId' not in body for body in reads)
        fixture('assert'); browser.close()
    print('Checkout coupon selector passed: eligibility, keyboard, loading/retry/empty, Apply/Applied/Remove, authoritative totals, live cart changes and both themes at 320/390/768/1440. No order accepted.')
finally:
    fixture('cleanup'); fixture('cleanup','homepage')

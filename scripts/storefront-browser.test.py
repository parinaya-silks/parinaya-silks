"""Browsing review against normal development and the actual production build.
Start Vite on 3000 and production preview on 4173. No live credentials/data used.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

routes = ['/', '/shop', '/collections', '/sale', '/shop?search=wine', '/search?search=wine',
          '/product/prod-mayuri-wine', '/wishlist', '/bag', '/account', '/account/orders',
          '/login', '/register', '/forgot-password', '/verify-email', '/about', '/contact',
          '/shipping-policy', '/returns-policy', '/privacy-policy', '/terms-conditions', '/missing-page']

with sync_playwright() as p:
    browser = p.chromium.launch()
    for origin in ['http://127.0.0.1:3000', 'http://127.0.0.1:4173']:
        context = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce')
        errors, backend_requests = [], []
        context.route('https://firestore.googleapis.com/**', lambda route: (backend_requests.append(route.request.url), route.abort()))
        context.route('https://identitytoolkit.googleapis.com/**', lambda route: (backend_requests.append(route.request.url), route.abort()))
        context.add_init_script("""localStorage.setItem('parinaya_customer_demo_v2', JSON.stringify({name:'FORGED CUSTOMER',email:'forged@example.test',role:'admin'}));
            localStorage.setItem('parinaya_orders_demo_v2', JSON.stringify([{id:'forged-order',paymentStatus:'Paid'}]));""")
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        for route in routes:
            page.goto(origin+route)
            page.get_by_role('note').filter(has_text='Storefront preview').wait_for()
            try:
                page.reload()
            except Exception as error:
                raise AssertionError(f'Refresh failed at {origin}{route}') from error
            page.get_by_role('note').filter(has_text='Storefront preview').wait_for()
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), route
            assert page.get_by_text('FORGED CUSTOMER',exact=False).count()==0
            assert page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button').count()==5
        page.get_by_role('heading',name='Page not found').wait_for()
        page.goto(origin+'/product/prod-mayuri-wine')
        page.get_by_role('button',name='Add to Bag',exact=False).click()
        page.get_by_role('button',name='Save to Wishlist',exact=True).click()
        commerce = page.locator('aside').last
        bottom = page.get_by_role('navigation',name='Mobile Bottom Navigation')
        assert commerce.bounding_box()['y'] + commerce.bounding_box()['height'] <= bottom.bounding_box()['y'] + 1
        assert page.get_by_role('button',name='Checkout unavailable',exact=False).is_disabled()
        bottom.get_by_role('button',name='Bag',exact=False).click()
        page.get_by_role('heading',name='My Bag',exact=False).wait_for()
        assert page.get_by_role('button',name='Checkout unavailable',exact=False).is_disabled()
        page.get_by_role('button',name='Increase quantity').click()
        page.reload()
        page.get_by_role('heading',name='My Bag',exact=False).wait_for()
        page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Wishlist',exact=False).click()
        assert page.get_by_text('Mayuri Regal Wine Pure Kanjeevaram Silk Saree',exact=True).count()>0
        for route in ['/checkout','/order-confirmed?orderId=forged-order','/order-result/forged-order','/order-tracking/forged-order','/account/orders/forged-order']:
            page.goto(origin+route)
            page.get_by_role('heading',name='Checkout unavailable' if route=='/checkout' else 'Orders unavailable').wait_for()
            assert page.get_by_role('button',name='Simulate payment',exact=False).count()==0
            assert page.get_by_text('Payment successful',exact=False).count()==0
        for route, button in [('/login','Sign In'),('/register','Create Account'),('/forgot-password','Send Reset Link')]:
            page.goto(origin+route)
            submit = page.locator('button[type="submit"]')
            assert submit.count()==1 and submit.is_disabled(), route
            assert page.locator('input:not([disabled])').count()==0, route
            page.locator('form').evaluate('(form)=>form.requestSubmit()')
            page.wait_for_timeout(100)
            assert page.url==origin+route
        page.goto(origin+'/verify-email')
        assert page.get_by_role('button',name='Check Verification',exact=False).is_disabled()
        assert page.get_by_role('complementary',name='Email Verification State Switcher').count()==0
        assert backend_requests==[], 'Public browsing must not request live identity or Firestore data'
        page.goto(origin+'/admin/orders')
        page.get_by_role('heading',name='Administrator Sign In').wait_for()
        assert page.get_by_role('heading',name='Dashboard',exact=True).count()==0
        page.goto(origin+'/')
        page.get_by_role('heading',name='The Festive Heirloom Weaves').wait_for()
        # Header navigation, browser history, clean and legacy hash routes.
        page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button').nth(1).click()
        assert page.url==origin+'/shop'
        page.go_back()
        page.get_by_role('heading',name='The Festive Heirloom Weaves').wait_for()
        page.goto(origin+'/#/about')
        page.get_by_role('heading',name='About Parinaya Silks').wait_for()
        Path('.cache/storefront').mkdir(parents=True,exist_ok=True)
        for width in [360,390,430,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':900})
            for route in ['/','/shop','/product/prod-mayuri-wine','/bag','/account']:
                page.goto(origin+route)
                page.get_by_role('note').filter(has_text='Storefront preview').wait_for()
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), (width,route)
            if width in [390,1440] and origin.endswith('4173'):
                page.goto(origin+'/')
                page.screenshot(path=f'.cache/storefront/home-{width}.png',full_page=True)
        assert not errors, errors
        print(origin+': direct routes/refresh, five tabs, local bag/wishlist, safe account/checkout, history, admin guard and six widths passed')
        context.close()
    browser.close()

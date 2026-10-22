"""Empty-content/browser migration checks. Dev 3000 and production preview 4173.
All records seeded here are isolated browser fixtures, never Firebase records.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

routes = ['/', '/shop', '/collections', '/sale', '/shop?search=wine', '/search?search=wine',
          '/product/prod-mayuri-wine', '/wishlist', '/bag', '/account', '/account/orders',
          '/login', '/register', '/forgot-password', '/verify-email', '/about', '/contact',
          '/shipping-policy', '/returns-policy', '/privacy-policy', '/terms-conditions', '/missing-page']
forbidden = ['Mayuri Regal Wine', 'Padmavathi Rust', 'Swarna Peethambari', 'Ananya Rao',
             'Priyanka Reddy', 'Sample stock', 'Storefront preview', 'Heirloom Points',
             'HEIRLOOM10', 'SILK20', '3 to 5 business days', 'within 48 hours', 'Certified Authentic']

with sync_playwright() as p:
    browser = p.chromium.launch()
    for origin in ['http://127.0.0.1:3000', 'http://127.0.0.1:4173']:
        context = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce')
        context.route('**/api/catalog*', lambda route: route.fulfill(status=404 if 'slug=' in route.request.url else 200, content_type='application/json', body=json.dumps({'code':'not-found','message':'Product not found.'} if 'slug=' in route.request.url else {'items':[],'nextCursor':None})))
        errors, backend_requests = [], []
        for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**']:
            context.route(pattern, lambda route: (backend_requests.append(route.request.url),route.abort()))
        context.add_init_script("""if (!localStorage.getItem('cleanup-test-seeded')) {
          localStorage.setItem('cleanup-test-seeded','yes');
          localStorage.setItem('parinaya_cart_preview_v1',JSON.stringify([
            {productId:'prod-mayuri-wine',product:{id:'prod-mayuri-wine',name:'Mayuri Regal Wine'}},
            {productId:'owner-real-item',product:{id:'owner-real-item',name:'Owner data'}}]));
          localStorage.setItem('parinaya_wishlist_preview_v1',JSON.stringify([{productId:'prod-padmavathi-rust',product:{id:'prod-padmavathi-rust'}}]));
          localStorage.setItem('parinaya_customer_demo_v2',JSON.stringify({name:'Ananya Rao',role:'admin'}));
          localStorage.setItem('parinaya_orders_demo_v2',JSON.stringify([{id:'ord-1089',paymentStatus:'Paid'}]));
          localStorage.setItem('firebase:authUser:preserve-test','existing auth fixture');
          localStorage.setItem('theme','ivory');
        }""")
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        for route in routes:
            page.goto(origin+route)
            page.locator('main').first.wait_for()
            page.reload()
            page.locator('main').first.wait_for()
            text = page.locator('body').inner_text()
            for phrase in forbidden:
                assert phrase not in text, (route,phrase)
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), route
            tabs=page.get_by_role('navigation',name='Mobile Bottom Navigation')
            assert tabs.get_by_role('button').count()==5
            assert tabs.get_by_role('button').nth(2).inner_text().strip().endswith('Wishlist')
            assert tabs.get_by_role('button').nth(3).inner_text().strip().endswith('Bag')
            assert not any(char.isdigit() for char in tabs.inner_text())
        state=page.evaluate('Object.fromEntries(Object.entries(localStorage))')
        assert json.loads(state['parinaya_cart_preview_v1'])==[{'productId':'owner-real-item','product':{'id':'owner-real-item','name':'Owner data'}}]
        assert json.loads(state['parinaya_wishlist_preview_v1'])==[]
        assert state['firebase:authUser:preserve-test']=='existing auth fixture'
        assert state['theme']=='ivory'
        assert json.loads(state['parinaya_orders_demo_v2'])[0]['id']=='ord-1089'
        page.goto(origin+'/shop')
        page.get_by_role('heading',name='No products available yet.',exact=True).wait_for()
        assert page.locator('article img').count()==0
        assert page.get_by_role('button',name='Kanjeevaram',exact=True).count()==0
        page.goto(origin+'/shop?search=wine')
        page.get_by_role('heading',name='No products found.',exact=True).wait_for()
        page.get_by_role('button',name='Clear filters',exact=True).click()
        page.get_by_role('heading',name='No products available yet.',exact=True).wait_for()
        for route,heading in [('/bag','Sign in to view your bag'),('/wishlist','Sign in to view your wishlist'),('/product/prod-mayuri-wine','Product not found'),('/order-confirmed?orderId=ord-1089','Orders unavailable'),('/checkout','Checkout unavailable')]:
            page.goto(origin+route)
            page.get_by_role('heading',name=heading,exact=True).wait_for()
            assert page.get_by_role('button',name='Simulate payment',exact=False).count()==0
        for route in ['/login','/register','/forgot-password']:
            page.goto(origin+route)
            page.locator('.customer-auth-form').wait_for()
            assert page.locator('button[type="submit"]').is_enabled()
            page.locator('.customer-auth-form').evaluate('(form)=>form.requestSubmit()')
            page.get_by_role('alert').filter(has_text='Please check the highlighted fields').wait_for()
            assert page.locator('[aria-invalid="true"]').count()>0
            assert page.url==origin+route
        page.goto(origin+'/contact')
        for label in ['How do I track my order?','Where can I find delivery information?','Where can I check the returns and exchange policy?']:
            page.get_by_role('button',name=label,exact=False).click()
        text=page.locator('body').inner_text()
        for phrase in forbidden: assert phrase not in text, phrase
        # Enabled category queries are now expected; public pages must not start
        # authentication on initial browsing/invalid form submission. Real
        # customer authentication is covered by the isolated emulator suite.
        assert all('firestore.googleapis.com' in url for url in backend_requests)
        page.goto(origin+'/admin/orders')
        page.get_by_role('heading',name='Administrator Sign In').wait_for()
        assert page.get_by_role('heading',name='Dashboard',exact=True).count()==0
        page.goto(origin+'/')
        page.locator('main h1').filter(has_text='PARINAYA SILKS').wait_for()
        page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button').nth(1).click()
        assert page.url==origin+'/shop'
        page.go_back()
        page.locator('main h1').filter(has_text='PARINAYA SILKS').wait_for()
        page.goto(origin+'/#/about')
        page.get_by_role('heading',name='About Parinaya Silks').wait_for()
        Path('.cache/empty-content').mkdir(parents=True,exist_ok=True)
        for width in [360,390,430,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':900})
            for route in ['/','/shop','/bag','/wishlist','/account','/contact','/shipping-policy']:
                page.goto(origin+route)
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), (width,route)
                if origin.endswith('4173') and width in [390,1440] and route in ['/','/shop']:
                    page.screenshot(path=f'.cache/empty-content/{"home" if route=="/" else "shop"}-{width}.png',full_page=True)
        assert not errors, errors
        print(origin+': empty public routes/refresh, legacy cleanup, badges, no fixture data, unavailable actions and six widths passed')
        context.close()
    browser.close()

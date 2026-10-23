"""Synthetic accounts on loopback Auth/Firestore emulators only. No live login."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST') == '127.0.0.1:9099'
assert os.environ.get('FIRESTORE_EMULATOR_HOST') == '127.0.0.1:8080'
password = os.environ['PARINAYA_ADMIN_TEST_PASSWORD']
origin = 'http://127.0.0.1:3100'

def control(action):
    subprocess.run(['node', '--import', 'tsx', 'scripts/admin-fixture-control.ts', action], check=True, capture_output=True, env=os.environ)

def sign_in(page, email, secret=password):
    page.get_by_label('Email', exact=True).fill(email)
    page.get_by_label('Password', exact=True).fill(secret)
    page.get_by_role('button', name='Sign In', exact=True).click()

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(viewport={'width':390,'height':844})
    # Guard against accidental live Auth/Firestore requests in the test suite.
    for pattern in ['https://identitytoolkit.googleapis.com/**', 'https://securetoken.googleapis.com/**', 'https://firestore.googleapis.com/**']:
        context.route(pattern, lambda route: route.abort())
    context.add_init_script("localStorage.setItem('admin', 'true'); localStorage.setItem('parinaya_customer_demo_v2', JSON.stringify({email:'parinayasilks.in@gmail.com',role:'admin'}));")
    page = context.new_page()
    page.goto(origin + '/admin/products/new')
    page.get_by_role('heading', name='Administrator Sign In', exact=True).wait_for()
    assert page.get_by_text('Business modules are not connected yet.', exact=False).count()==0
    attempts = []
    page.on('request', lambda request: attempts.append(1) if 'accounts:signInWithPassword' in request.url else None)
    page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com')
    page.get_by_label('Password',exact=True).fill('incorrect-test-password')
    page.locator('form').evaluate('(form) => { form.requestSubmit(); form.requestSubmit(); }')
    page.get_by_role('alert').filter(has_text='Unable to sign in with those details').wait_for()
    assert len(attempts)==1, 'Duplicate submissions must issue only one sign-in request'
    sign_in(page, 'parinayasilks.in@gmail.com')
    page.get_by_role('heading', name='Add Product', exact=True).wait_for()
    assert page.evaluate('(secret) => !Object.values(localStorage).some(value => value.includes(secret))', password)
    assert page.url.endswith('/admin/products/new')
    page.reload()
    page.get_by_role('heading', name='Add Product', exact=True).wait_for()
    print('Signed-out nested route, forged local role rejection, wrong credentials, approved login and session restoration passed')

    for route, heading in [('/admin','Dashboard'),('/admin/orders','Orders'),('/admin/orders/test-order','Order details'),('/admin/products','Products & Stock'),('/admin/products/new','Add Product'),('/admin/products/edit/test-product','Edit Product'),('/admin/customers','Customers'),('/admin/coupons','Coupons'),('/admin/settings','Store Settings')]:
        page.goto(origin+route)
        try:
            page.get_by_role('heading', name=heading, exact=True).wait_for(timeout=15000)
        except Exception:
            print('Failed route heading:',route,'Expected:',heading,'Actual:',page.locator('h1').all_text_contents())
            raise
        assert page.get_by_text('No live records are displayed',exact=False).count()==0
        assert '8,42,500' not in page.inner_text('body')
        body = page.inner_text('body')
        for fictional in ['Mayuri Regal Wine', 'Ananya Rao', 'Across 4 master loom regions', 'Redeemable at', '0 Clients', '0 Pts', '0 Sarees']:
            if not (route.startswith('/admin/products') and fictional=='0 Sarees'):
                assert fictional not in body, (route,fictional)
        assert page.locator('nav[aria-label="Mobile Bottom Navigation"]').count()==0
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
    page.goto(origin+'/admin')
    page.get_by_role('heading',name='Dashboard',exact=True).wait_for()
    control('disable')
    page.get_by_role('heading',name='Access Restricted',exact=True).wait_for()
    assert page.get_by_role('heading',name='Dashboard',exact=True).count()==0
    control('enable')
    page.get_by_role('heading',name='Dashboard',exact=True).wait_for()
    control('remove-claim')
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    page.get_by_role('heading',name='Access Restricted',exact=True).wait_for()
    control('grant-claim')
    page.get_by_role('button',name='Refresh permissions').click()
    page.get_by_role('heading',name='Dashboard',exact=True).wait_for()
    print('All connected admin areas render without sample records; access-record revocation and refreshed claim removal/grant passed')

    page.set_viewport_size({'width':1440,'height':900})
    page.get_by_role('button',name='View Website',exact=False).filter(visible=True).click()
    page.locator('main h1').filter(has_text='PARINAYA SILKS').wait_for()
    assert page.url==origin+'/'
    persistence_before=page.evaluate('({local:Object.keys(localStorage).filter(k=>k.startsWith("firebase:authUser:")).length,session:Object.keys(sessionStorage).filter(k=>k.startsWith("firebase:authUser:")).length})')
    page.goto(origin+'/login')
    page.wait_for_url(origin+'/account')
    page.get_by_role('button',name='Sign out',exact=True).wait_for()
    assert page.url==origin+'/account'
    assert page.evaluate('({local:Object.keys(localStorage).filter(k=>k.startsWith("firebase:authUser:")).length,session:Object.keys(sessionStorage).filter(k=>k.startsWith("firebase:authUser:")).length})')==persistence_before
    page.goto(origin+'/admin')
    page.get_by_role('heading',name='Dashboard',exact=True).wait_for()
    page.set_viewport_size({'width':390,'height':844})
    print('Authorized View Website link opens the actual homepage and administrator session remains valid')

    # Keep a protected route behind this one for the sign-out/Back assertion.
    page.goto(origin+'/admin/orders')
    page.get_by_role('heading',name='Orders',exact=True).wait_for()
    page.get_by_role('button',name='Sign out',exact=True).filter(visible=True).click()
    page.get_by_role('heading',name='Administrator Sign In').wait_for()
    page.go_back()
    page.get_by_role('heading',name='Administrator Sign In').wait_for()
    assert page.get_by_role('heading',name='Dashboard',exact=True).count()==0
    for email in ['customer@example.test','claim-only@example.test','record-only@example.test']:
        sign_in(page,email)
        page.get_by_role('heading',name='Access Restricted',exact=True).wait_for()
        page.get_by_role('button',name='Sign out',exact=True).click()
        page.get_by_role('heading',name='Administrator Sign In').wait_for()
    print('Sign-out/back navigation and non-admin, claim-only and record-only denials passed')

    page.get_by_role('button',name='Forgot Password?').click()
    for email in ['parinayasilks.in@gmail.com','absent@example.test']:
        page.get_by_label('Email',exact=True).fill(email)
        page.get_by_role('button',name='Send reset instructions').click()
        page.get_by_role('status').filter(has_text='If this account can receive').wait_for()
    page.get_by_role('button',name='Back to Sign In').click()
    for width in [360,390,430,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
        assert page.get_by_label('Email',exact=True).bounding_box()['height'] >=44
        assert page.get_by_role('button',name='Sign In',exact=True).bounding_box()['height'] >=44
    Path('.cache/admin-browser').mkdir(parents=True,exist_ok=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path='.cache/admin-browser/login-390.png')
    page.goto(origin+'/admin/login?returnTo=https%3A%2F%2Fevil.example')
    sign_in(page,'parinayasilks.in@gmail.com')
    page.get_by_role('heading',name='Dashboard',exact=True).wait_for()
    assert page.url==origin+'/admin/dashboard'
    print('Neutral password reset, mobile inputs, duplicate-safe forms and external return-destination rejection passed')

    production = browser.new_page()
    production.goto('http://127.0.0.1:4200/admin/orders/test-order')
    production.get_by_role('heading',name='Administrator Sign In').wait_for()
    assert production.evaluate('typeof window.parinayaFirebase')=='undefined'
    production.goto('http://127.0.0.1:4200/')
    production.locator('main h1').filter(has_text='PARINAYA SILKS').wait_for()
    production.get_by_text('No products available yet.',exact=True).wait_for()
    assert production.get_by_role('link',name='Admin',exact=True).count()==0
    production.goto('http://127.0.0.1:3101/admin')
    production.get_by_role('heading',name='Administrator access unavailable').wait_for()
    production.get_by_role('button',name='Retry access check').click()
    production.get_by_role('heading',name='Administrator access unavailable').wait_for()
    assert production.get_by_role('heading',name='Dashboard',exact=True).count()==0
    production.goto('http://127.0.0.1:3101/')
    production.locator('main h1').filter(has_text='PARINAYA SILKS').wait_for()
    production.get_by_text('No products available yet.',exact=True).wait_for()
    print('Production direct/nested routing and public storefront passed locally; no hosted deployment was tested')
    browser.close()

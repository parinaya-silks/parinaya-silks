"""Saved shipping policy via real loopback admin/customer sessions, never production."""
import os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect,Error
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/shipping-browser');screens.mkdir(parents=True,exist_ok=True)
def fixture(command,script='shipping'):
    subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',command],capture_output=True,check=True)
fixture('seed','shopping');fixture('reset');fixture('below')
try:
  with sync_playwright() as p:
    browser=p.chromium.launch()
    def context():
        ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
        ctx.route('https://**/*',lambda route:route.abort())
        for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda route:route.abort())
        ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.abort());return ctx
    def login(page,admin=False):
        page.get_by_label('Email' if admin else 'Email address',exact=True).fill('parinayasilks.in@gmail.com' if admin else 'customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
    c=context();customer=c.new_page();errors=[];customer.on('pageerror',lambda error:errors.append(str(error)))
    customer.goto(origin+'/login?returnTo=%2Faccount%2Faddresses');login(customer)
    try:customer.get_by_role('heading',name='My Addresses',exact=True).wait_for()
    except Exception:
        print('Shipping login diagnostics:',customer.url,customer.locator('h1').all_text_contents(),customer.get_by_role('alert').all_text_contents(),flush=True);customer.screenshot(path=str(screens/'login-failure.png'),full_page=True);raise
    customer.get_by_role('button',name='Add address',exact=True).click()
    for label,value in [('Recipient full name','Shipping Customer'),('Mobile number','9876543210'),('PIN code','500034'),('House, building and street','Example street 12'),('Area / locality','Example Area'),('City / town','Hyderabad')]:customer.get_by_label(label,exact=True).fill(value)
    customer.get_by_label('State / Union Territory',exact=True).select_option('Telangana');customer.get_by_role('button',name='Save address',exact=True).click();customer.get_by_role('dialog').wait_for(state='hidden')
    customer.goto(origin+'/product/shopping-simple');customer.get_by_role('button',name='Add to Bag',exact=True).click();customer.get_by_role('status').filter(has_text='Added to your bag.').wait_for();customer.goto(origin+'/checkout');shipping=customer.locator('[data-shipping-state]');expect(shipping).to_have_attribute('data-shipping-state','missing');assert 'To be confirmed' in shipping.inner_text()
    a=context();admin=a.new_page();admin.on('pageerror',lambda error:errors.append(str(error)));admin.goto(origin+'/admin/settings');login(admin,True)
    section=admin.get_by_role('region',name='Store Settings',exact=True);section.get_by_text('No shipping configuration is saved.',exact=False).wait_for()
    fee=section.get_by_label('Standard Shipping Charge',exact=True);threshold=section.get_by_label('Free shipping threshold',exact=True);free=section.get_by_label('Enable free shipping',exact=True);save=section.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first;cancel=section.get_by_role('button',name='Cancel',exact=True).filter(visible=True).first
    expect(fee).to_have_value('');expect(threshold).to_have_value('');assert not free.is_checked()
    fee.fill('125.50');free.check();threshold.fill('9000');assert shipping.get_attribute('data-shipping-state')=='missing';cancel.click();admin.get_by_role('button',name='Discard Changes',exact=True).click();expect(fee).to_have_value('');expect(threshold).to_have_value('');fee.fill('99');free.check();threshold.fill('10000')
    # Uncertain save failure keeps draft; Retry Save reuses the operation ID.
    failed={'once':True};ops=[]
    def fail_first(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='settings:save':
            ops.append(route.request.post_data_json['operationId'])
            if failed['once']:failed['once']=False;route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Fixture failure"}');return
        route.continue_()
    admin.route('**/api/catalog',fail_first);save.click();section.get_by_role('alert').wait_for();expect(fee).to_have_value('99');save.click();section.get_by_role('status').filter(has_text='Store settings updated.').wait_for();assert ops[0]==ops[1];admin.unroute('**/api/catalog',fail_first)
    expect(shipping).to_have_attribute('data-shipping-state','ready');expect(shipping).to_have_attribute('data-shipping-revision','1');assert '₹99.00' in shipping.inner_text() and '₹10,098.00' in shipping.inner_text()
    for mode,total,free_expected in [('at','₹10,099.00',False),('above','₹10,000.01',True)]:
        fixture(mode);customer.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(shipping).to_contain_text(total);expect(shipping).to_have_attribute('data-shipping-state','ready');assert shipping.get_by_text('Free',exact=True).count()==(1 if free_expected else 0)
    fee.fill('123.45');free.uncheck();save.click();section.get_by_role('status').filter(has_text='Store settings updated.').wait_for();expect(shipping).to_have_attribute('data-shipping-revision','2');expect(shipping).to_contain_text('₹123.45');expect(shipping).to_contain_text('₹10,123.46')
    fee.fill('1.001');save.click();section.get_by_role('alert').wait_for();fee.fill('-1');save.click();section.get_by_role('alert').wait_for();fee.fill('');save.click();section.get_by_role('alert').wait_for();cancel.click();admin.get_by_role('button',name='Discard Changes',exact=True).click();expect(fee).to_have_value('123.45')
    held=[]
    def hold_old_review(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='orders:review' and not held:
            held.append((route,route.fetch()));return
        route.continue_()
    customer.route('**/api/catalog',hold_old_review);customer.get_by_role('button',name='Refresh checkout review',exact=True).click()
    for attempt in range(50):
        if held:break
        customer.wait_for_timeout(100)
    assert held
    fee.fill('0');save.click();section.get_by_role('status').filter(has_text='Store settings updated.').wait_for();expect(shipping).to_have_attribute('data-shipping-revision','3');expect(shipping).to_contain_text('₹0.00');assert shipping.get_by_text('Free',exact=True).count()==0
    try:held[0][0].fulfill(response=held[0][1])
    except Error:pass
    expect(shipping).to_have_attribute('data-shipping-revision','3');expect(shipping).to_contain_text('₹0.00');customer.unroute('**/api/catalog',hold_old_review)
    fixture('invalid');expect(shipping).to_have_attribute('data-shipping-state','invalid');assert 'To be confirmed' in shipping.inner_text();assert 'Total including shipping' not in shipping.inner_text();admin.reload();section.get_by_text('The saved shipping configuration is invalid',exact=False).wait_for();fee.fill('99');free.check();threshold.fill('10000');save.click();section.get_by_role('status').filter(has_text='Store settings updated.').wait_for();expect(shipping).to_have_attribute('data-shipping-state','ready');expect(shipping).to_have_attribute('data-shipping-revision','5')
    for width in [320,375,390,768,1024,1440]:
        admin.set_viewport_size({'width':width,'height':900});customer.set_viewport_size({'width':width,'height':900});assert not admin.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width;assert not customer.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
        section.scroll_into_view_if_needed();admin.screenshot(path=str(screens/f'admin-shipping-{width}.png'),full_page=True);customer.screenshot(path=str(screens/f'checkout-shipping-{width}.png'),full_page=True)
    assert 'provisional' not in customer.locator('body').inner_text().lower()
    acknowledge=customer.get_by_role('button',name='I have reviewed the updated prices',exact=True)
    if acknowledge.count():acknowledge.click()
    expect(customer.get_by_role('button',name='Continue to Summary',exact=True)).to_be_enabled()
    fixture('blocked');customer.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(shipping).to_have_attribute('data-shipping-state','blocked');assert 'Total including shipping' not in shipping.inner_text()
    fixture('restore');customer.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(shipping).to_have_attribute('data-shipping-state','ready')
    def fail_review(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='orders:review':route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Fixture failure"}')
        else:route.continue_()
    customer.route('**/api/catalog',fail_review);customer.get_by_role('button',name='Refresh checkout review',exact=True).click();customer.get_by_role('button',name='Retry checkout review',exact=True).wait_for();assert 'To be confirmed' in shipping.inner_text();assert 'Total including shipping' not in shipping.inner_text();customer.unroute('**/api/catalog',fail_review);customer.get_by_role('button',name='Retry checkout review',exact=True).click();expect(shipping).to_have_attribute('data-shipping-state','ready')
    fixture('reset');expect(shipping).to_have_attribute('data-shipping-state','missing');assert 'To be confirmed' in shipping.inner_text()
    customer.goto(origin+'/account');customer.get_by_role('button',name='Sign out',exact=True).click();customer.goto(origin+'/checkout');customer.wait_for_url('**/login?returnTo=%2Fcheckout');assert customer.locator('[data-shipping-state]').count()==0
    assert not errors,errors
    browser.close();print('Shipping browser passed: admin draft/cancel/save/retry, persistence, exact thresholds, edited/zero fee, config changes, missing/invalid/network fallback, isolation and six widths.')
finally:
    fixture('reset');fixture('cleanup','shopping')

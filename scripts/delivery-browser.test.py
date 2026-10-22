"""Delivery/address UI with real loopback Auth/Firestore/API; no production records."""
import os,subprocess,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect,Error
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
screens=Path('.cache/delivery-browser');screens.mkdir(parents=True,exist_ok=True)
def fixture(command,script='delivery'):
    subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',command],check=True,capture_output=True)
fixture('seed','shopping');fixture('profile')
try:
  with sync_playwright() as p:
    browser=p.chromium.launch()
    def context():
        ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
        for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
            ctx.route(pattern,lambda route:route.abort())
        ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.abort())
        return ctx
    def login(page,email='customer@example.test'):
        page.get_by_label('Email address',exact=True).fill(email);page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
    def fill_address(page,name='Recipient One',label='Home'):
        for field,value in [('Recipient full name',name),('Mobile number','98765 43210'),('PIN code','500034'),('House, building and street','12 Test Street'),('Area / locality','Example Area'),('City / town','Hyderabad'),('Landmark (optional)','Near the library'),('Label (optional)',label)]:page.get_by_label(field,exact=True).fill(value)
        page.get_by_label('State / Union Territory',exact=True).select_option('Telangana')
    one=context();page=one.new_page();errors=[];saves=[]
    latest_book={'data':None}
    def observe_book(response):
        if response.status==200 and response.request.method=='POST' and '/api/catalog' in response.url and response.request.post_data_json.get('action')=='addresses:list':latest_book['data']=response.json()
    page.on('response',observe_book)
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('request',lambda req:saves.append(req.post_data_json) if req.method=='POST' and '/api/catalog' in req.url and req.post_data_json.get('action')=='addresses:save' else None)
    page.goto(origin+'/checkout');page.wait_for_url('**/login?returnTo=%2Fcheckout');login(page)
    page.get_by_role('heading',name='Your bag is empty',exact=True).wait_for();assert page.get_by_role('button',name='Payment unavailable',exact=True).count()==0
    page.goto(origin+'/account');page.get_by_role('button',name='Addresses',exact=True).click();page.get_by_role('heading',name='My Addresses',exact=True).wait_for()
    page.get_by_text('No saved addresses yet.',exact=False).wait_for();page.get_by_role('button',name='Add address',exact=True).click()
    dialog=page.get_by_role('dialog');expect(dialog).to_be_visible();expect(page.get_by_label('Recipient full name',exact=True)).to_be_focused()
    expect(page.get_by_label('Recipient full name',exact=True)).to_have_value('Delivery Customer');expect(page.get_by_label('Mobile number',exact=True)).to_have_value('+919876543210')
    page.get_by_role('button',name='Save address',exact=True).click();page.get_by_label('PIN code',exact=True).wait_for();assert page.locator('[aria-invalid="true"]').count()>0
    fill_address(page);page.get_by_role('form',name='Delivery address',exact=True).evaluate('(form)=>{form.requestSubmit();form.requestSubmit();}')
    expect(dialog).not_to_be_visible();expect(page.locator('[data-address-id]')).to_have_count(1);assert len(saves)==1
    first=page.locator('[data-address-id]').first.get_attribute('data-address-id');page.get_by_text('Default delivery address',exact=True).wait_for()
    # Failed edit retains form fields and uses the same receipt on retry.
    failed={'once':True};ops=[]
    def fail_save(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='addresses:save':
            ops.append(route.request.post_data_json['operationId'])
            if failed['once']:failed['once']=False;route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Fixture failure"}');return
        route.continue_()
    page.route('**/api/catalog',fail_save);page.get_by_role('button',name='Edit address',exact=True).click();page.get_by_label('Recipient full name',exact=True).fill('Edited Recipient');page.get_by_role('button',name='Save address',exact=True).click()
    dialog.get_by_role('alert').wait_for();expect(page.get_by_label('Recipient full name',exact=True)).to_have_value('Edited Recipient');page.get_by_role('button',name='Save address',exact=True).click();expect(dialog).not_to_be_visible();assert ops[0]==ops[1];page.unroute('**/api/catalog',fail_save)
    page.get_by_role('button',name='Add address',exact=True).click();fill_address(page,'Recipient Two','Work');page.get_by_role('button',name='Save address',exact=True).click();expect(dialog).not_to_be_visible();expect(page.locator('[data-address-id]')).to_have_count(2)
    second=page.locator('[data-address-id]').filter(has_text='Recipient Two').get_attribute('data-address-id')
    # Existing catalog action adds an item; no direct guest Bag writes.
    page.goto(origin+'/product/shopping-simple');page.get_by_role('button',name='Add to Bag',exact=True).click();page.get_by_role('status').filter(has_text='Added to your bag.').wait_for();page.goto(origin+'/bag');page.get_by_role('button',name='Increase quantity',exact=True).click();page.get_by_role('heading',name='My Bag (2)',exact=True).wait_for();page.get_by_role('button',name='Review checkout',exact=True).click()
    page.get_by_role('heading',name='Checkout review',exact=True).wait_for();summary=page.locator('[data-review-address]');expect(summary).to_have_attribute('data-review-address',first);page.locator('[data-checkout-line]').wait_for()
    assert page.get_by_role('button',name='Payment unavailable',exact=True).is_disabled();assert 'To be confirmed' in page.locator('body').inner_text();assert 'Free delivery' not in page.locator('body').inner_text()
    # Delayed prior-address response must never replace the newer selection.
    held=[]
    def delay_review(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='checkout:review' and route.request.post_data_json.get('addressId')==first and not held:
            response=route.fetch();held.append((route,response));return
        route.continue_()
    page.route('**/api/catalog',delay_review);page.get_by_role('button',name='Refresh checkout review',exact=True).click()
    for attempt in range(50):
        if held:break
        page.wait_for_timeout(100)
    assert held
    page.locator('[data-address-id="'+second+'"]').get_by_role('radio').check();expect(summary).to_have_attribute('data-review-address',second)
    try:held[0][0].fulfill(response=held[0][1])
    except Error:pass # AbortController may already have cancelled the old request.
    expect(summary).to_have_attribute('data-review-address',second);page.unroute('**/api/catalog',delay_review)
    # Edit the selected address directly from checkout, then add another.
    page.locator('[data-address-id="'+second+'"]').get_by_role('button',name='Edit address',exact=True).click();page.get_by_label('City / town',exact=True).fill('Different Town');page.get_by_role('button',name='Save address',exact=True).click();expect(dialog).not_to_be_visible();expect(summary).to_have_attribute('data-review-address',second);expect(summary).to_have_attribute('data-review-revision','2')
    # A confirmed save can arrive before an older address-list response. Keep
    # the saved selection until a list at the returned book revision arrives.
    old_book=latest_book['data'];assert len(old_book['addresses'])==2
    def stale_book(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='addresses:list':route.fulfill(status=200,content_type='application/json',body=json.dumps(old_book))
        else:route.continue_()
    page.route('**/api/catalog',stale_book)
    page.get_by_role('button',name='Add address',exact=True).click();fill_address(page,'Recipient Three','Other');page.get_by_role('button',name='Save address',exact=True).click();expect(dialog).not_to_be_visible();third=saves[-1]['id'];expect(summary).to_have_attribute('data-review-address',third)
    page.unroute('**/api/catalog',stale_book);fixture('touch-book');page.locator('[data-address-id="'+third+'"]').wait_for();expect(summary).to_have_attribute('data-review-address',third)
    two=context();other=two.new_page();other.goto(origin+'/login?returnTo=%2Faccount%2Faddresses');login(other);other.get_by_role('heading',name='My Addresses',exact=True).wait_for()
    target=other.locator('[data-address-id="'+third+'"]');target.get_by_role('button',name='Edit address',exact=True).click();other.get_by_label('Recipient full name',exact=True).fill('Updated From Another Tab');other.get_by_role('button',name='Save address',exact=True).click();other.get_by_role('dialog').wait_for(state='hidden');page.get_by_role('radio',name='Updated From Another Tab',exact=False).wait_for();expect(summary).to_have_attribute('data-review-revision','2')
    target.get_by_role('button',name='Delete address',exact=True).click();expect(other.get_by_role('button',name='Cancel deletion',exact=True)).to_be_focused();other.get_by_role('button',name='Confirm deletion',exact=True).click();expect(page.locator('[data-address-id="'+third+'"]')).to_have_count(0);expect(summary).to_have_attribute('data-review-address',first)
    fixture('price');page.get_by_role('button',name='Refresh checkout review',exact=True).click();page.get_by_text('Prices have changed.',exact=False).wait_for();page.get_by_role('button',name='I have reviewed the updated prices',exact=True).click();page.get_by_text('Prices have changed.',exact=False).wait_for(state='hidden')
    fixture('stock');page.get_by_role('button',name='Refresh checkout review',exact=True).click();page.get_by_text('Only 1 available.',exact=False).wait_for()
    for width in [320,375,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
        page.screenshot(path=str(screens/f'checkout-{width}.png'),full_page=True)
        page.get_by_role('button',name='Add address',exact=True).click();expect(dialog).to_be_visible();assert not dialog.evaluate('(el)=>el.scrollWidth>el.clientWidth+1'),width
        page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.closest("dialog")!==null')
        page.screenshot(path=str(screens/f'address-form-{width}.png'),full_page=True)
        page.keyboard.press('Escape');expect(dialog).not_to_be_visible();expect(page.get_by_role('button',name='Add address',exact=True)).to_be_focused()
    # Network error remains distinct from item validation; saved data is untouched.
    def fail_review(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='checkout:review':route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Fixture failure"}')
        else:route.continue_()
    page.route('**/api/catalog',fail_review);page.get_by_role('button',name='Refresh checkout review',exact=True).click();page.get_by_role('button',name='Retry checkout review',exact=True).wait_for();assert page.locator('[data-checkout-line]').count()==0;page.unroute('**/api/catalog',fail_review);page.get_by_role('button',name='Retry checkout review',exact=True).click();page.locator('[data-checkout-line]').wait_for()
    fixture('hide');page.get_by_role('button',name='Refresh checkout review',exact=True).click();page.get_by_role('heading',name='Product unavailable',exact=True).wait_for();assert 'Shopping Simple' not in page.locator('body').inner_text()
    page.goto(origin+'/account');expect(page.locator('.customer-account-details dd').first).to_have_text('Delivery Customer');page.get_by_role('button',name='Sign out',exact=True).click();page.goto(origin+'/account/addresses');page.wait_for_url('**/login?returnTo=%2Faccount%2Faddresses');assert page.locator('[data-address-id]').count()==0;login(page,'legacy-customer@example.test');page.get_by_text('No saved addresses yet.',exact=False).wait_for();assert page.locator('[data-address-id]').count()==0
    assert not errors,errors
    browser.close();print('Delivery browser passed: CRUD/default, prefill/retry/dialog focus, checkout selection, cross-tab changes, stale responses, price/stock validation, privacy and six widths.')
finally:
    fixture('cleanup','shopping')

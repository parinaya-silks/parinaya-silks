"""Real loopback Firebase sessions/API; no production shopping mutations."""
import json,os,subprocess,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
screens=Path('.cache/shopping-browser');screens.mkdir(parents=True,exist_ok=True)
def fixture(command):
    subprocess.run(['node','--import','tsx','scripts/shopping-fixture-control.ts',command],check=True,capture_output=True)

fixture('seed')
try:
  with sync_playwright() as p:
    browser=p.chromium.launch()
    def context():
        ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
        for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
            ctx.route(pattern,lambda route:route.abort())
        ctx.route('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v2/passwordPolicy*',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({'schemaVersion':1,'enforcementState':'ENFORCE','customStrengthOptions':{'minPasswordLength':12},'allowedNonAlphanumericCharacters':['!','-',' ']})))
        ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.abort()) # exercise image fallback
        return ctx
    def login(page,email='customer@example.test'):
        page.get_by_label('Email address',exact=True).fill(email)
        page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD'])
        page.get_by_role('button',name='Sign In',exact=True).click()
    one=context();page=one.new_page();errors=[];writes=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('request',lambda request:writes.append(request.post_data_json) if '/api/catalog' in request.url and request.method=='POST' and request.post_data_json.get('action') in ['bag:add','wishlist:set'] else None)
    for route in ['/bag','/wishlist']:
        page.goto(origin+route);page.get_by_role('heading',name='Sign in to view your '+route[1:],exact=True).wait_for()
        assert page.get_by_role('button',name='Continue shopping',exact=True).is_visible()
    page.goto(origin+'/product/shopping-simple');page.get_by_role('heading',name='Shopping Simple',exact=True).wait_for()
    page.get_by_role('button',name='Add to Bag',exact=True).click();page.wait_for_url('**/login?returnTo=*')
    login(page);page.wait_for_url('**/product/shopping-simple')
    page.get_by_role('status').filter(has_text='Added to your bag.').wait_for()
    assert len([x for x in writes if x['action']=='bag:add'])==1
    page.reload();page.get_by_role('heading',name='Shopping Simple',exact=True).wait_for();page.wait_for_timeout(500)
    assert len([x for x in writes if x['action']=='bag:add'])==1,'Refresh must not replay an intent'
    page.get_by_role('button',name='Add to Bag',exact=True).click();page.get_by_role('status').filter(has_text='Already in your bag.').wait_for()
    page.goto(origin+'/bag');page.locator('[data-shopping-line]').wait_for();expect(page.get_by_role('heading',name='My Bag (1)',exact=True)).to_be_visible()
    page.get_by_role('button',name='Increase quantity',exact=True).click();expect(page.get_by_role('heading',name='My Bag (2)',exact=True)).to_be_visible()
    # A second real Firebase context sees persisted items and listener updates.
    two=context();other=two.new_page();other.goto(origin+'/login?returnTo=%2Fbag');login(other)
    expect(other.get_by_role('heading',name='My Bag (2)',exact=True)).to_be_visible()
    other.get_by_role('button',name='Increase quantity',exact=True).click();expect(page.get_by_role('heading',name='My Bag (3)',exact=True)).to_be_visible()
    page.goto(origin+'/product/shopping-simple');page.locator('[data-shopping-status="ready"]').wait_for();page.get_by_role('button',name='Save to Wishlist',exact=True).click();page.get_by_role('status').filter(has_text='Saved to your wishlist.').wait_for()
    page.goto(origin+'/wishlist');page.locator('[data-wishlist-product]').wait_for();assert page.locator('[data-wishlist-product]').count()==1
    # Failed mutation retains saved state; retry uses the same operation identity.
    failed={'once':True};operation_ids=[]
    def fail_remove(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='wishlist:set':
            operation_ids.append(route.request.post_data_json['operationId'])
            if failed['once']:
                failed['once']=False;route.abort();return
        route.continue_()
    page.route('**/api/catalog',fail_remove);page.get_by_role('button',name='Remove Shopping Simple from wishlist',exact=True).click()
    page.get_by_role('button',name='Retry change',exact=True).wait_for();assert page.locator('[data-wishlist-product]').count()==1
    page.get_by_role('button',name='Retry change',exact=True).click();page.get_by_role('heading',name='Your wishlist is empty',exact=True).wait_for()
    assert operation_ids[0]==operation_ids[1]
    page.unroute('**/api/catalog',fail_remove)
    page.goto(origin+'/product/shopping-colours');page.get_by_role('button',name='Add to Bag',exact=True).click()
    assert page.get_by_text('Please select a colour before adding to your bag.',exact=True).count()>=1
    page.get_by_role('button',name='Wine',exact=True).click();page.get_by_role('button',name='Add to Bag',exact=True).click();page.get_by_role('status').filter(has_text='Added to your bag.').wait_for()
    page.locator('[data-shopping-status="ready"]').wait_for();page.get_by_role('button',name='Save to Wishlist',exact=True).click();page.get_by_role('status').filter(has_text='Saved to your wishlist.').wait_for()
    page.goto(origin+'/wishlist');expect(page.locator('[data-wishlist-product]')).to_have_count(1)
    page.get_by_role('button',name='Select colour',exact=True).click();page.wait_for_url('**/product/shopping-colours?select=colour')
    page.get_by_role('button',name='Wine',exact=True).click();page.get_by_role('button',name='Add to Bag',exact=True).click();page.get_by_role('status').filter(has_text='Already in your bag.').wait_for()
    page.goto(origin+'/bag');expect(page.locator('[data-shopping-line]')).to_have_count(2)
    fixture('price-stock');page.reload();page.get_by_text('Only 1 available.',exact=False).wait_for()
    assert '2,000.05' in page.locator('body').inner_text()
    fixture('hide');page.reload();page.get_by_role('button',name='Product unavailable',exact=True).first.wait_for();assert 'Shopping Simple' not in page.locator('body').inner_text()
    # Layout and fixed navigation at all requested widths, populated + unavailable.
    for width in [320,375,390,768,1024,1440]:
        for route in ['/bag','/wishlist']:
            page.set_viewport_size({'width':width,'height':900});page.goto(origin+route)
            page.get_by_role('heading',name='My Bag',exact=False).wait_for() if route=='/bag' else page.get_by_role('heading',name='My Wishlist',exact=True).wait_for()
            page.wait_for_timeout(250);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(width,route)
            page.screenshot(path=str(screens/f'{route[1:]}-{width}.png'),full_page=True)
    # Failed list is an error, not an empty success, and retry works.
    def fail_read(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='shopping:get':route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Fixture unavailable"}')
        else:route.continue_()
    page.route('**/api/catalog',fail_read);page.goto(origin+'/bag');page.get_by_role('heading',name='Unable to load your bag',exact=True).wait_for();page.unroute('**/api/catalog',fail_read)
    page.get_by_role('button',name='Retry bag',exact=True).click();expect(page.locator('[data-shopping-line]')).to_have_count(2)
    page.goto(origin+'/account');page.get_by_role('button',name='Sign out',exact=True).click();page.goto(origin+'/bag');page.get_by_role('heading',name='Sign in to view your bag',exact=True).wait_for();assert page.locator('[data-shopping-line]').count()==0
    page.goto(origin+'/login?returnTo=%2Fbag');login(page,'legacy-customer@example.test');page.get_by_role('heading',name='Your bag is empty',exact=True).wait_for();assert page.locator('[data-shopping-line]').count()==0
    # Signed-out colour-card action -> registration -> selection, without a write.
    fixture('restore');three=context();new=three.new_page();new.goto(origin+'/shop')
    new.get_by_role('button',name='Add to Bag',exact=True).last.click();new.wait_for_url('**/login?returnTo=*')
    # Product order can vary: explicitly replace the intent with the colour product.
    new.goto(origin+'/product/shopping-colours');new.get_by_role('button',name='Save to Wishlist',exact=True).click();new.wait_for_url('**/login?returnTo=*')
    new.get_by_role('link',name='Create an account',exact=True).click()
    new.get_by_label('Name',exact=True).fill('Shopping Registration')
    new.get_by_label('Email address',exact=True).fill('shopping-'+uuid.uuid4().hex+'@example.test')
    new.get_by_label('Mobile number',exact=True).fill('9876543210')
    new.get_by_label('Password',exact=True).fill('ShoppingPassword9!')
    new.get_by_label('Confirm password',exact=True).fill('ShoppingPassword9!')
    new.get_by_role('button',name='Create account',exact=True).click()
    new.get_by_role('status').filter(has_text='Saved to your wishlist.').wait_for();new.goto(origin+'/wishlist');expect(new.locator('[data-wishlist-product]')).to_have_count(1)
    new.get_by_role('button',name='Select colour',exact=True).click();new.wait_for_url('**/product/shopping-colours?select=colour')
    new.get_by_text('Please select a colour before adding to your bag.',exact=True).wait_for()
    assert not errors,errors
    browser.close()
    print('Shopping browser checks passed: intent/login/registration, replay, cross-device, writes/retry, stock/privacy and six widths.')
finally:
    fixture('cleanup')

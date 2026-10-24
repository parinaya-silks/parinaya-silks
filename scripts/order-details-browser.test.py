"""Order Details on loopback emulators only; never uses production users/records."""
import os,subprocess,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/order-details-browser');screens.mkdir(parents=True,exist_ok=True)
def fixture(action):subprocess.run(['node','--import','tsx','scripts/order-details-fixture-control.ts',action],check=True,capture_output=True)
def path(n):return '/admin/orders/'+format(n,'032x')
fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000});ctx.grant_permissions(['clipboard-read','clipboard-write'],origin=origin)
  for pattern in ['https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**','https://firestore.googleapis.com/**','https://res.cloudinary.com/**']:ctx.route(pattern,lambda route:route.abort())
  page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)));page.on('dialog',lambda dialog:dialog.accept())
  page.goto(origin+path(6001));page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
  detail=page.get_by_role('region',name='Order details',exact=True);detail.wait_for();expect(detail.locator('.detail-items')).to_contain_text('Historical Kanchipuram');expect(detail.locator('.detail-payment')).to_contain_text('₹7,500.00');expect(detail.locator('.detail-summary')).to_contain_text('₹12,500.00');expect(detail.locator('.detail-items')).to_contain_text('Image unavailable');assert 'Current Profile Name' not in detail.inner_text();assert 'Shipped' not in detail.locator('.detail-timeline').inner_text()
  for width in [320,390,768,1024,1440,1920]:
   page.set_viewport_size({'width':width,'height':1000});page.screenshot(path=str(screens/f'details-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
   if width==390:page.screenshot(path=str(screens/'mobile-viewport.png'))
  page.set_viewport_size({'width':1440,'height':1000})
  detail.get_by_role('button',name='Copy email',exact=True).click();expect(detail.get_by_role('status').filter(has_text='Email copied.')).to_be_visible();expect(detail.get_by_role('link',name='Call customer',exact=True)).to_have_attribute('href','tel:+919840123456')
  detail.get_by_role('button',name='View Customer',exact=True).click();page.get_by_role('region',name='Customer details',exact=True).wait_for();page.get_by_role('heading',name='Order History',exact=True).wait_for();page.goto(origin+path(6001));detail.wait_for();page.reload();detail.wait_for()
  # Cancel before mutation; the browser must not report success or change state.
  detail.get_by_role('button',name='Start processing',exact=True).click();expect(detail.get_by_label('Action',exact=True)).to_have_value('Processing');detail.get_by_role('button',name='Save action',exact=True).click();modal=page.get_by_role('dialog',name='Confirm order action',exact=True);modal.get_by_role('button',name='Cancel',exact=True).focus();page.keyboard.press('Shift+Tab');expect(modal.get_by_role('button',name='Confirm action',exact=True)).to_be_focused();page.keyboard.press('Escape');expect(modal).not_to_be_visible();expect(detail.get_by_role('button',name='Save action',exact=True)).to_be_focused()
  # A real server conflict leaves form values intact. Reload and review again.
  mode={'conflict':True,'lose':False};requests=[]
  def mutation(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='adminOrders:update' and body.get('id')==format(6001,'032x'):
    if mode['conflict']:mode['conflict']=False;fixture('conflict')
    elif mode['lose']:mode['lose']=False;requests.append(body);route.fetch();route.abort();return
    elif requests:requests.append(body)
   route.continue_()
  page.route('**/api/catalog',mutation);detail.get_by_label('Reason / notes',exact=True).fill('Preserved processing note');detail.get_by_role('button',name='Save action',exact=True).click();modal.get_by_role('button',name='Confirm action',exact=True).click();expect(detail.get_by_role('alert')).to_contain_text('This order changed');expect(detail.get_by_label('Reason / notes',exact=True)).to_have_value('Preserved processing note');detail.get_by_role('button',name='Reload current order',exact=True).click()
  mode['lose']=True;detail.get_by_role('button',name='Save action',exact=True).click();modal.get_by_role('button',name='Confirm action',exact=True).click();expect(detail.get_by_role('button',name='Retry exact action safely',exact=True)).to_be_visible();expect(detail.get_by_label('Reason / notes',exact=True)).to_have_value('Preserved processing note');detail.get_by_role('button',name='Retry exact action safely',exact=True).click();expect(detail.get_by_label('Action',exact=True)).to_have_value('');assert len(requests)==2 and requests[0]==requests[1];fixture('assert-once');page.unroute('**/api/catalog',mutation)
  # Preserve unsaved input during a real cross-tab update.
  detail.get_by_label('Action',exact=True).select_option('note');detail.get_by_label('Reason / notes',exact=True).fill('My unsaved note')
  other=ctx.new_page();other.goto(origin+path(6001));other.get_by_label('Action',exact=True).select_option('note');other.get_by_label('Reason / notes',exact=True).fill('Other tab authoritative note');other.get_by_role('button',name='Save action',exact=True).click();other.get_by_role('dialog',name='Confirm order action',exact=True).get_by_role('button',name='Confirm action',exact=True).click();expect(other.get_by_label('Action',exact=True)).to_have_value('');expect(detail.get_by_text('Other tab authoritative note',exact=True).first).to_be_visible(timeout=15000);expect(detail.get_by_label('Reason / notes',exact=True)).to_have_value('My unsaved note');other.close()
  # Delivery Update opens the dedicated real delivery drawer.
  page.goto(origin+path(6001));detail.wait_for();detail.get_by_role('button',name='Update Delivery',exact=True).first.click();delivery=page.get_by_role('dialog',name='Update Delivery',exact=True);delivery.get_by_label('New Status',exact=True).select_option('Shipped');delivery.get_by_label('Courier Partner',exact=True).select_option('custom');delivery.get_by_label('Courier name',exact=True).fill('Local Fixture Courier');delivery.get_by_label('Consignment / AWB',exact=True).fill('LOCAL-TRACK');delivery.get_by_label('Public Tracking Link',exact=True).fill('https://courier.example.test/local');delivery.get_by_role('button',name='Review Update',exact=True).click();delivery.get_by_role('button',name='Confirm Update',exact=True).click();expect(delivery.get_by_role('status').filter(has_text='Delivery update saved.')).to_be_visible();delivery.get_by_role('button',name='Close delivery panel',exact=True).click();expect(detail.locator('.detail-delivery')).to_contain_text('LOCAL-TRACK');expect(detail.get_by_role('link',name='Open courier tracking',exact=True)).to_have_attribute('rel','noopener noreferrer')
  # Partial COD remains outstanding until explicit full remaining collection.
  page.goto(origin+path(6002));detail.wait_for();expect(detail.locator('.detail-payment')).to_contain_text('₹7,500.00');detail.get_by_role('button',name='Record Collection',exact=True).click();detail.get_by_label('External reference',exact=True).fill('Local external remittance');detail.get_by_role('button',name='Save action',exact=True).click();expect(modal).to_contain_text('₹7,500.00');modal.get_by_role('button',name='Confirm action',exact=True).click();expect(detail.get_by_label('Action',exact=True)).to_have_value('');expect(detail.locator('.detail-payment')).to_contain_text('COD — Collected');expect(detail.locator('.detail-ledger')).to_contain_text('₹0.00');fixture('assert-collection');page.reload();detail.wait_for();expect(detail.locator('.detail-payment')).to_contain_text('Local external remittance')
  page.goto(origin+path(6006));detail.wait_for();expect(detail.get_by_text('cancellation requested',exact=True)).to_be_visible();detail.get_by_role('button',name='Review Request',exact=True).click();expect(detail.get_by_label('Action',exact=True)).to_have_value('approve-request');detail.get_by_label('Action',exact=True).select_option('reject-request');detail.get_by_label('Reason / notes',exact=True).fill('Local request review reason');detail.get_by_role('button',name='Save action',exact=True).click();modal.get_by_role('button',name='Confirm action',exact=True).click();expect(detail.get_by_label('Action',exact=True)).to_have_value('');expect(detail.locator('.detail-attention')).to_have_count(0)
  page.goto(origin+path(6005));detail.wait_for();expect(detail.locator('.detail-timeline')).to_contain_text('No detailed activity history');expect(detail.locator('.detail-customer')).to_contain_text('Email not recorded');expect(detail.locator('.detail-customer')).to_contain_text('Mobile not recorded')
  # Real not-found and first-load failure stay distinct, with a working retry.
  page.goto(origin+path(6999));page.get_by_role('heading',name='Order not found',exact=True).wait_for()
  fail={'enabled':True}
  def failure(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='adminOrders:get' and fail['enabled']:route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Synthetic unavailable"}')
   else:route.continue_()
  page.route('**/api/catalog',failure);page.goto(origin+path(6003));page.get_by_role('heading',name='Unable to load this order',exact=True).wait_for();fail['enabled']=False;page.get_by_role('button',name='Retry order',exact=True).click();detail.wait_for();expect(detail.locator('.detail-delivery')).to_contain_text('HIST-TRACK-001');page.unroute('**/api/catalog',failure)
  page.get_by_role('button',name='Sign Out',exact=True).click();page.get_by_role('heading',name='Administrator Sign In',exact=True).wait_for();page.get_by_label('Email',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('heading',name='Access Restricted',exact=True).wait_for();expect(page.get_by_role('region',name='Order details',exact=True)).to_have_count(0)
  assert not errors,errors;browser.close();print('Order Details browser passed: historical snapshots, responsive cards, copy/call, customer navigation, confirmation/focus, conflict/exact retry, unsaved cross-tab input, dispatch, partial COD collection, request review, legacy/error/not-found and account cleanup.')
finally:fixture('cleanup')

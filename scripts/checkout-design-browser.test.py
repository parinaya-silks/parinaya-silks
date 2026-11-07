"""Approved checkout layout against real loopback services, no live orders."""
import json,os,re,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/checkout-design');screens.mkdir(parents=True,exist_ok=True)
def fixture(action,script='checkout-design'):subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',action],check=True,capture_output=True)
fixture('seed','shopping');fixture('seed','cod');fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort())
  def image(route):route.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes())
  ctx.route('https://res.cloudinary.com/parinaya-emulator/**',image)
  page=ctx.new_page();errors=[];reviews=[];places=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  network={'mode':'hold'};held=[]
  def read_network(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='orders:review':
    if network['mode']=='hold':held.append(route);return
    if network['mode']=='fail':route.fulfill(status=503,json={'code':'unavailable','message':'Private diagnostics omitted'});return
   route.continue_()
  page.route('**/api/catalog',read_network)
  def completed_review(request):
   # A response header can arrive before navigation aborts its body. Only a
   # completed request can provide a quote for the later totals assertions.
   if '/api/catalog' in request.url and request.method=='POST' and request.post_data_json.get('action')=='orders:review':
    response=request.response()
    if response and response.status==200:reviews.append(response.json())
  page.on('requestfinished',completed_review);page.on('request',lambda r:places.append(r.post_data_json) if '/api/catalog' in r.url and r.method=='POST' and r.post_data_json.get('action')=='orders:place' else None)
  page.goto(origin+'/login?returnTo=%2Fcheckout');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url('**/checkout')
  expect(page.locator('.store-loading-checkout')).to_be_visible()
  for width in [320,390,768,1440,1920]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(screens/f'loading-{width}.png'))
  network['mode']='fail'
  for route in held:
   try:route.fulfill(status=503,json={'code':'unavailable'})
   except:pass
  held.clear();expect(page.locator('.checkout-feedback .store-recovery')).to_be_visible();assert page.get_by_role('heading',name='Your bag is empty',exact=True).count()==0;assert not places
  network['mode']='live';page.locator('.checkout-feedback .store-recovery').get_by_role('button',name='Retry',exact=True).click();page.set_viewport_size({'width':390,'height':900})
  expect(page.locator('[data-address-id]')).to_have_count(2);expect(page.get_by_role('button',name='Continue to Review',exact=True)).to_be_enabled()
  expect(page.locator('.storefront-header,.storefront-bottom-nav,.public-floating-contact')).to_have_count(0)
  # Native dialog focus, validation, typed values, cancelled and confirmed saves.
  page.get_by_role('button',name='+ Add address',exact=True).click();dialog=page.get_by_role('dialog',name='Add delivery address',exact=True);expect(dialog).to_be_visible();page.get_by_role('button',name='Save address',exact=True).click();expect(dialog.get_by_role('alert')).to_be_visible();page.get_by_label('Recipient full name',exact=True).fill('Unsaved Fixture');page.set_viewport_size({'width':320,'height':540});expect(page.get_by_label('Recipient full name',exact=True)).to_have_value('Unsaved Fixture');page.keyboard.press('Shift+Tab');assert dialog.evaluate('el=>el.contains(document.activeElement)');page.keyboard.press('Escape');expect(dialog).not_to_be_visible();expect(page.get_by_role('button',name='+ Add address',exact=True)).to_be_focused()
  page.set_viewport_size({'width':390,'height':900});card=page.locator('[data-address-id]').filter(has_text='Checkout Fixture Customer');card.get_by_role('radio').check();card.get_by_role('button',name='Edit address',exact=True).click();dialog=page.get_by_role('dialog',name='Edit delivery address',exact=True);page.get_by_label('House, building and street',exact=True).fill('Updated fixture delivery street');page.screenshot(path=str(screens/'address-sheet-390.png'),full_page=True);page.get_by_role('button',name='Save address',exact=True).click();expect(dialog).not_to_be_visible();expect(page.locator('[data-address-id]').filter(has_text='Updated fixture delivery street').get_by_role('radio')).to_be_checked()
  page.reload();expect(page.locator('[data-address-id]').filter(has_text='Updated fixture delivery street').get_by_role('radio')).to_be_checked()
  # All steps use the actual review, with no creation on entry or navigation.
  for stage,title in [('delivery','Where should we deliver?'),('summary','Review your order'),('payment','Complete your order')]:
   if stage=='summary':page.get_by_role('button',name='Continue to Review',exact=True).click()
   if stage=='payment':page.get_by_role('button',name='Continue to Payment',exact=True).click()
   expect(page.get_by_role('heading',name=title,exact=True)).to_be_visible();expect(page.locator('.checkout-feedback')).not_to_contain_text('Checking current')
   for width in [320,390,768,1440,1920]:
    page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(80);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(stage,width)
    expect(page.locator('.checkout-screen .material-symbols-outlined')).to_have_count(0)
    assert page.locator('.checkout-primary').bounding_box()['height']>=44
    assert 'ParinayaLora' in page.locator('.checkout-primary').evaluate('el=>getComputedStyle(el).fontFamily')
    for img in page.locator('.checkout-item-photo').all():
     if img.is_visible():assert img.bounding_box()['width']<=80 and img.bounding_box()['height']<=106
    if width<1024:assert page.locator('.checkout-actions').bounding_box()['y']+page.locator('.checkout-actions').bounding_box()['height']<=901
    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(screens/f'{stage}-{width}.png'),full_page=True)
   assert not places
  page.get_by_role('navigation',name='Checkout steps').get_by_role('button').nth(1).click();page.wait_for_url('**/checkout/summary');
  page.get_by_label('Coupon code',exact=True).fill('PRESERVE DRAFT');network['mode']='fail';page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.locator('.checkout-feedback .store-recovery')).to_be_visible();expect(page.get_by_label('Coupon code')).to_have_value('PRESERVE DRAFT');expect(page.locator('[data-checkout-line]').first).to_be_visible();expect(page.get_by_role('button',name='Continue to Payment')).to_be_disabled()
  ctx.set_offline(True);expect(page.locator('.store-connection-notice')).to_be_visible();assert not places;network['mode']='live';ctx.set_offline(False);expect(page.get_by_role('button',name='Continue to Payment')).to_be_enabled(timeout=15000);expect(page.get_by_label('Coupon code')).to_have_value('PRESERVE DRAFT')
  page.get_by_label('Coupon code',exact=True).fill('INVALID');page.get_by_role('button',name='Apply coupon',exact=True).click();expect(page.locator('.checkout-feedback')).to_contain_text(re.compile('coupon',re.I));expect(page.get_by_role('button',name='Continue to Payment')).to_be_disabled();page.get_by_role('button',name='Remove coupon',exact=True).click();expect(page.get_by_role('button',name='Continue to Payment')).to_be_enabled()
  page.get_by_label('Coupon code',exact=True).fill('DESIGN10');page.get_by_role('button',name='Apply coupon',exact=True).click();expect(page.locator('.checkout-applied')).to_contain_text('Applied savings:')
  points=page.get_by_role('region',name='Loyalty points',exact=True);points.locator('summary').click();points.get_by_label('Points to use',exact=True).fill('20');points.get_by_role('button',name='Apply Points',exact=True).click();expect(points).to_contain_text('(20 points)');expect(points).to_contain_text('25 pending earnings');expect(page.get_by_label('Price review',exact=True)).to_contain_text('Loyalty savings')
  points.get_by_role('button',name='Remove Points',exact=True).click();expect(page.get_by_label('Price review',exact=True)).not_to_contain_text('Loyalty savings');points.locator('summary').click() if not points.locator('details').evaluate('el=>el.open') else None;points.get_by_label('Points to use',exact=True).fill('20');points.get_by_role('button',name='Apply Points',exact=True).click();expect(points).to_contain_text('(20 points)')
  quote=next(q for q in reversed(reviews) if q.get('loyalty',{}).get('appliedPoints')==20);expect(page.locator('[data-checkout-total]')).to_have_attribute('data-checkout-total',quote['totalPaise'])
  for width in [320,390,768,1440,1920]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(screens/f'summary-discounts-{width}.png'),full_page=True)
   expect(points).to_contain_text('pending delivery.');assert 'recorded COD collection' not in points.inner_text();points.scroll_into_view_if_needed();page.screenshot(path=str(screens/f'delivery-points-{width}.png'))
  page.get_by_role('button',name='Continue to Payment',exact=True).click();page.wait_for_url('**/checkout/payment');expect(page.locator('input[name=payment]')).to_have_count(1);expect(page.locator('input[name=payment]')).to_be_checked();page.go_back();page.wait_for_url('**/checkout/summary');expect(page.get_by_label('Coupon code')).to_have_value('DESIGN10');page.reload();expect(page.get_by_label('Coupon code')).to_have_value('DESIGN10');expect(page.get_by_label('Price review')).to_contain_text('Loyalty savings')
  fixture('disable-loyalty');page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.locator('.checkout-feedback')).to_contain_text('loyalty is disabled');expect(page.get_by_role('region',name='Loyalty points',exact=True)).to_have_count(0);expect(page.get_by_label('Price review')).not_to_contain_text('Loyalty savings');page.get_by_role('button',name='Remove Points',exact=True).click()
  fixture('price-change');page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.get_by_role('button',name='I have reviewed the updated prices',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Continue to Payment')).to_be_disabled();page.get_by_role('button',name='I have reviewed the updated prices',exact=True).click();expect(page.get_by_role('button',name='Continue to Payment')).to_be_enabled()
  fixture('stock-change');page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.get_by_role('button',name='Continue to Payment')).to_be_disabled();assert not places
  assert not errors,errors;browser.close()
 print('Checkout design browser passed: all three stages at five widths, address dialog/edit/focus/validation, authoritative totals, coupon and points Apply/Remove/disabled, stage and refresh recovery, price acknowledgement, stock blocking, local Lora/SVGs and no order creation on reads.')
finally:fixture('cleanup');fixture('cleanup','cod');fixture('cleanup','shopping')

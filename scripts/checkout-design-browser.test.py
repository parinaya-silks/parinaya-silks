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
  def response(r):
   if '/api/catalog' in r.url and r.request.method=='POST' and r.request.post_data_json.get('action')=='orders:review' and r.status==200:reviews.append(r.json())
  page.on('response',response);page.on('request',lambda r:places.append(r.post_data_json) if '/api/catalog' in r.url and r.method=='POST' and r.post_data_json.get('action')=='orders:place' else None)
  page.goto(origin+'/login?returnTo=%2Fcheckout');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url('**/checkout')
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
   for width in [320,390,768,1440]:
    page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(80);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(stage,width)
    expect(page.locator('.checkout-screen .material-symbols-outlined')).to_have_count(0)
    assert page.locator('.checkout-primary').bounding_box()['height']>=44
    assert 'ParinayaLora' in page.locator('.checkout-primary').evaluate('el=>getComputedStyle(el).fontFamily')
    for img in page.locator('.checkout-item-photo').all():
     if img.is_visible():assert img.bounding_box()['width']<=80 and img.bounding_box()['height']<=106
    if width<1024:assert page.locator('.checkout-actions').bounding_box()['y']+page.locator('.checkout-actions').bounding_box()['height']<=901
    page.evaluate('scrollTo(0,0)');page.screenshot(path=str(screens/f'{stage}-{width}.png'),full_page=True)
   assert not places
  page.get_by_role('navigation',name='Checkout steps').get_by_role('button').nth(1).click();page.wait_for_url('**/checkout/summary');page.get_by_label('Coupon code',exact=True).fill('INVALID');page.get_by_role('button',name='Apply coupon',exact=True).click();expect(page.locator('.checkout-feedback')).to_contain_text(re.compile('coupon',re.I));expect(page.get_by_role('button',name='Continue to Payment')).to_be_disabled();page.get_by_role('button',name='Remove coupon',exact=True).click();expect(page.get_by_role('button',name='Continue to Payment')).to_be_enabled()
  page.get_by_label('Coupon code',exact=True).fill('DESIGN10');page.get_by_role('button',name='Apply coupon',exact=True).click();expect(page.locator('.checkout-applied')).to_contain_text('Applied savings:')
  points=page.get_by_role('region',name='Loyalty points',exact=True);points.locator('summary').click();points.get_by_label('Points to use',exact=True).fill('20');points.get_by_role('button',name='Apply Points',exact=True).click();expect(points).to_contain_text('(20 points)');expect(points).to_contain_text('25 pending earnings');expect(page.get_by_label('Price review',exact=True)).to_contain_text('Loyalty savings')
  points.get_by_role('button',name='Remove Points',exact=True).click();expect(page.get_by_label('Price review',exact=True)).not_to_contain_text('Loyalty savings');points.locator('summary').click() if not points.locator('details').evaluate('el=>el.open') else None;points.get_by_label('Points to use',exact=True).fill('20');points.get_by_role('button',name='Apply Points',exact=True).click();expect(points).to_contain_text('(20 points)')
  quote=next(q for q in reversed(reviews) if q.get('loyalty',{}).get('appliedPoints')==20);expect(page.locator('[data-checkout-total]')).to_have_attribute('data-checkout-total',quote['totalPaise'])
  for width in [390,1440]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(screens/f'summary-discounts-{width}.png'),full_page=True)
  page.get_by_role('button',name='Continue to Payment',exact=True).click();page.wait_for_url('**/checkout/payment');expect(page.locator('input[name=payment]')).to_have_count(1);expect(page.locator('input[name=payment]')).to_be_checked();page.go_back();page.wait_for_url('**/checkout/summary');expect(page.get_by_label('Coupon code')).to_have_value('DESIGN10');page.reload();expect(page.get_by_label('Coupon code')).to_have_value('DESIGN10');expect(page.get_by_label('Price review')).to_contain_text('Loyalty savings')
  fixture('disable-loyalty');page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.locator('.checkout-feedback')).to_contain_text('loyalty is disabled');expect(page.get_by_role('region',name='Loyalty points',exact=True)).to_have_count(0);expect(page.get_by_label('Price review')).not_to_contain_text('Loyalty savings');page.get_by_role('button',name='Remove Points',exact=True).click()
  fixture('price-change');page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.get_by_role('button',name='I have reviewed the updated prices',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Continue to Payment')).to_be_disabled();page.get_by_role('button',name='I have reviewed the updated prices',exact=True).click();expect(page.get_by_role('button',name='Continue to Payment')).to_be_enabled()
  fixture('stock-change');page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.get_by_role('button',name='Continue to Payment')).to_be_disabled();assert not places
  assert not errors,errors;browser.close()
 print('Checkout design browser passed: all three stages at four widths, address dialog/edit/focus/validation, authoritative totals, coupon and points Apply/Remove/disabled, stage and refresh recovery, price acknowledgement, stock blocking, local Lora/SVGs and no order creation on reads.')
finally:fixture('cleanup');fixture('cleanup','cod');fixture('cleanup','shopping')

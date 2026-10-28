"""Local customer-order presentation and recovery; never uses production credentials/data."""
import os,re,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/customer-order-design');screens.mkdir(parents=True,exist_ok=True)
def fixture(command,name='customer-order-design'):
 file='scripts/customer-order-design-fixture.ts' if name=='customer-order-design' else f'scripts/{name}-fixture-control.ts'
 result=subprocess.run(['node','--import','tsx',file,command],capture_output=True,text=True)
 if result.returncode:raise RuntimeError('Local fixture failed: '+name+' '+command)
fixture('seed','shopping');fixture('seed','cod')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},permissions=['clipboard-read','clipboard-write']);ctx.route('https://**/*',lambda route:route.abort())
  page=ctx.new_page();errors=[];writes=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.on('request',lambda request:writes.append(request.post_data_json) if '/api/catalog' in request.url and request.method=='POST' else None)
  page.goto(origin+'/login?returnTo=%2Fcheckout');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
  page.get_by_role('button',name='Continue to Review',exact=True).click();page.get_by_role('button',name='Continue to Payment',exact=True).click();page.get_by_role('button',name=re.compile('^Place Order')).click();page.wait_for_url('**/order-confirmed/*');expect(page.get_by_role('heading',name='Thank you for choosing Parinaya.',exact=True)).to_be_visible()
  order_id=page.url.rsplit('/',1)[1];confirmed=page.url
  expect(page.locator('.order-greeting')).to_have_attribute('data-animated','true');assert page.locator('.order-ring').evaluate('el=>getComputedStyle(el).animationName')=='order-ring-draw'
  fixture('assert-single','cod');page.reload();expect(page.locator('.order-greeting')).to_have_attribute('data-animated','false');fixture('assert-single','cod');fixture('decorate')
  page.reload();expect(page.get_by_text('Historical Crimson Silk Saree',exact=True)).to_be_visible();expect(page.locator('.order-payment-notice')).to_contain_text('2,537.10 payable on delivery');assert not page.locator('.order-assistance').count()
  reference=page.locator('.order-reference strong').inner_text();page.get_by_role('button',name='Copy order reference').click();expect(page.get_by_role('status').filter(has_text='Copied')).to_be_visible();assert page.evaluate('navigator.clipboard.readText()')==reference
  def widths(label):
   for width in [320,390,768,1440]:
    page.set_viewport_size({'width':width,'height':900});page.evaluate('document.fonts.ready');assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(label,width)
    assert 'Lora' in page.locator('.customer-order-experience').evaluate('el=>getComputedStyle(el).fontFamily')
    assert not page.locator('.customer-order-experience .material-symbols-outlined').count()
    for image in page.locator('.order-item-photo').all():assert image.bounding_box()['height']<=107
    assert not page.locator('.public-floating-contact').count()
    page.screenshot(path=str(screens/f'{label}-{width}.png'),full_page=True)
  widths('confirmation');page.set_viewport_size({'width':390,'height':900});page.get_by_role('button',name='View Order & Updates',exact=True).click();page.wait_for_url('**/order-tracking/'+order_id)
  expect(page.get_by_role('heading',name='Order Progress')).to_be_visible();expect(page.get_by_text('Tracking details will appear here when available.',exact=True)).to_be_visible();expect(page.locator('.order-payment')).to_contain_text('24 expected points remain pending');expect(page.locator('.order-payment')).to_contain_text('Coupon Savings (SAVED10)');expect(page.locator('.order-payment')).to_contain_text('Loyalty Points Redeemed');widths('details');fixture('assert-reads')
  page.set_viewport_size({'width':390,'height':900});trigger=page.get_by_role('button',name='Request Cancellation',exact=True);trigger.click();dialog=page.get_by_role('dialog');expect(dialog).to_be_visible();expect(page.get_by_label('Reason',exact=True)).to_be_focused();page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.closest("dialog")!==null');page.keyboard.press('Escape');expect(dialog).not_to_be_visible();expect(trigger).to_be_focused()
  trigger.click();page.get_by_label('Reason',exact=True).fill('Please review this local fixture cancellation');state={'fail':True};ops=[]
  def request_response(route):
   body=route.request.post_data_json if route.request.method=='POST' else None
   if body and body.get('action')=='orders:request':
    ops.append(body['operationId'])
    if state['fail']:state['fail']=False;route.abort();return
   route.continue_()
  page.route('**/api/catalog',request_response);dialog.get_by_role('button',name='Submit request',exact=True).click();expect(dialog.get_by_role('alert')).to_be_visible();expect(dialog.locator('textarea')).to_have_value('Please review this local fixture cancellation');page.set_viewport_size({'width':390,'height':540});assert dialog.get_by_role('button',name='Retry request').bounding_box()['y']<540;page.screenshot(path=str(screens/'cancellation-sheet-390.png'),full_page=True);dialog.get_by_role('button',name='Retry request').click();expect(dialog.get_by_role('heading',name='Request received',exact=True)).to_be_visible();assert len(ops)==2 and ops[0]==ops[1];dialog.get_by_role('button',name='Close',exact=True).click();expect(page.locator('.order-request-status')).to_contain_text('cancellation request: pending');expect(page.locator('.order-status')).to_have_text('Placed');fixture('assert-request')
  fixture('shipped');page.reload();expect(page.locator('.order-status')).to_have_text('Shipped');expect(page.get_by_text('Courier: Local Fixture Courier',exact=True)).to_be_visible();link=page.get_by_role('link',name='Open courier tracking',exact=True);expect(link).to_have_attribute('href','https://courier.example.test/track/LOCAL-AWB-1');assert 'noopener' in link.get_attribute('rel');expect(page.get_by_role('button',name='Request Cancellation',exact=True)).to_have_count(0);assert page.locator('[aria-current="step"]').inner_text().startswith('Shipped');page.set_viewport_size({'width':390,'height':900});page.screenshot(path=str(screens/'tracking-available-390.png'),full_page=True)
  fixture('cancelled');page.goto(confirmed);expect(page.get_by_role('heading',name='Thank you for choosing Parinaya.',exact=True)).to_have_count(0);expect(page.locator('.order-status')).to_have_text('Cancelled');expect(page.locator('.order-payment-notice')).to_contain_text('No delivery payment');assert not page.locator('.order-motif').count()
  fixture('other-owned');page.goto(origin+'/order-tracking/'+'b'*32);expect(page.get_by_role('alert')).to_contain_text('Order not found');assert 'OTHER-PRIVATE-ORDER' not in page.locator('body').inner_text();page.goto(origin+'/order-tracking/'+'0'*32);expect(page.get_by_role('alert')).to_contain_text('Order not found')
  state2={'fail':True}
  def read_failure(route):
   body=route.request.post_data_json if route.request.method=='POST' else None
   if body and body.get('action')=='orders:get' and state2['fail']:route.fulfill(status=503,content_type='application/json',body=json.dumps({'code':'index-required','message':'Internal index diagnostic'}))
   else:route.continue_()
  page.route('**/api/catalog',read_failure);page.goto(origin+'/order-tracking/'+order_id);expect(page.get_by_role('alert')).to_contain_text('We couldn’t load this order. Please try again.');assert 'Internal index diagnostic' not in page.locator('body').inner_text();state2['fail']=False;page.get_by_role('button',name='Retry',exact=True).click();expect(page.locator('.order-status')).to_have_text('Cancelled')
  page.goto(origin+'/account/orders/'+order_id);expect(page.locator('.order-status')).to_have_text('Cancelled');assert len([w for w in writes if w['action']=='orders:place'])==1
  signed_out=browser.new_context();signed_out.route('https://**/*',lambda route:route.abort());other=signed_out.new_page();other.goto(origin+'/order-tracking/'+order_id);other.wait_for_url('**/login?returnTo=*');assert reference not in other.locator('body').inner_text()
  reduced=browser.new_context(reduced_motion='reduce');reduced.route('https://**/*',lambda route:route.abort());r=reduced.new_page();r.goto(origin+'/login?returnTo=%2Forder-confirmed%2F'+order_id);r.get_by_label('Email address',exact=True).fill('customer@example.test');r.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);r.get_by_role('button',name='Sign In',exact=True).click();expect(r.locator('.order-status')).to_have_text('Cancelled');assert not r.locator('.order-motif').count()
  assert not errors,errors;browser.close();print('Customer order design passed: real placement, one order/deduction, fresh/static motion, snapshot summary, four widths, request retry/idempotency, tracking, inactive confirmation, aliases, missing/ownership/auth, safe retry.')
finally:
 fixture('cleanup');fixture('cleanup','cod');fixture('cleanup','shopping')

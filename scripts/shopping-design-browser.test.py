"""Emulator-backed Wishlist/Bag design, receipts and notification acceptance."""
import os,subprocess,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';out=Path('.cache/shopping-design');out.mkdir(parents=True,exist_ok=True)
pid='s'*20;vid='v'*20;hidden='u'*20
def fixture(command,script='shopping-design-fixture.ts'):
 result=subprocess.run(['node','--import','tsx','scripts/'+script,command],capture_output=True)
 assert result.returncode==0,'Loopback fixture failed: '+command
def login(page,email='customer@example.test'):
 page.get_by_label('Email address',exact=True).fill(email);page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
fixture('seed','shopping-fixture-control.ts');fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort());ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()));page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));mode={'value':'live','held':[],'operations':[],'fail_once':True}
  def intercept(route):
   body=route.request.post_data_json if route.request.method=='POST' else {};action=body.get('action')
   if action and (action.startswith('bag:') or action=='wishlist:set'):mode['operations'].append(body)
   if mode['value']=='load-failure' and action=='shopping:get':route.fulfill(status=503,content_type='application/json',body=json.dumps({'code':'unavailable','message':'PRIVATE-TECHNICAL'}));return
   if mode['value']=='hold-read' and action=='shopping:get':
    response=route.fetch();assert response.status==200;mode['held'].append((route,response));return
   if mode['value']=='uncertain' and action=='bag:adjust' and mode['fail_once']:
    response=route.fetch();assert response.status==200;mode['fail_once']=False;route.abort();return
   if mode['value']=='hold-adjust' and action=='bag:adjust':mode['held'].append(route);return
   route.continue_()
  page.route('**/api/catalog',intercept);page.goto(origin+'/wishlist');expect(page.get_by_role('heading',name='Sign in to view your wishlist',exact=True)).to_be_visible();page.get_by_role('button',name='Sign in',exact=True).click();login(page)
  wishes=page.locator('[data-wishlist-product]');expect(wishes).to_have_count(4);simple=page.locator('[data-wishlist-product="'+pid+'"]');colours=page.locator('[data-wishlist-product="'+vid+'"]');expect(simple.get_by_role('button',name='View Bag',exact=True)).to_be_visible()
  # Colour choice is mandatory and Bag membership checks the selected variant.
  colours.get_by_role('button',name='Select Colour',exact=True).click();dialog=page.get_by_role('dialog',name='Select Colour');expect(dialog.get_by_role('button',name='Add to Bag',exact=True)).to_be_disabled();expect(dialog.get_by_role('radio',name=re.compile('Gold Out of stock'))).to_be_disabled()
  dialog.get_by_role('radio',name=re.compile('^Wine')).check();expect(dialog.get_by_role('button',name='View Bag',exact=True)).to_be_enabled();dialog.get_by_role('radio',name=re.compile('Peacock Blue')).check();expect(dialog.get_by_role('button',name='Add to Bag',exact=True)).to_be_enabled();page.screenshot(path=str(out/'colour-sheet-390.png'),full_page=True);dialog.get_by_role('button',name='Add to Bag',exact=True).click();expect(dialog).not_to_be_visible();expect(wishes).to_have_count(4)
  toast=page.locator('.customer-shopping-notice');expect(toast).to_contain_text('Added to Bag');expect(toast.get_by_role('button',name='View Bag',exact=True)).to_be_visible();assert toast.get_by_role('button',name='View Wishlist').count()==0
  # Four-second dismissal pauses on hover and keyboard focus.
  toast.hover();page.screenshot(path=str(out/'toast-390.png'),full_page=True);header=page.locator('.storefront-header').bounding_box();box=toast.bounding_box();assert box['y']>=header['y']+header['height'];page.set_viewport_size({'width':1440,'height':900});toast.hover();page.screenshot(path=str(out/'toast-1440.png'),full_page=True);page.set_viewport_size({'width':390,'height':900});toast.hover();page.wait_for_timeout(4300);expect(toast).to_be_visible();toast.get_by_role('button',name='Dismiss notification').focus();page.mouse.move(0,850);page.wait_for_timeout(4100);expect(toast).to_be_visible();page.keyboard.press('Tab');page.wait_for_timeout(4300);expect(toast).to_have_count(0)
  # Remove confirmation does not write before confirmation; preserves focus.
  simple.get_by_role('button',name=re.compile('^Remove ')).click();removal=page.get_by_role('dialog',name='Remove from Wishlist?');before=len(mode['operations']);removal.get_by_role('button',name='Keep Item',exact=True).click();assert len(mode['operations'])==before;assert page.evaluate('document.activeElement.getAttribute("aria-label")').startswith('Remove ')
  # Already-saved Bag lines remain reachable even when their current stock is zero.
  fixture('stock-zero');fixture('colour-zero');page.reload();expect(wishes).to_have_count(4);expect(simple.get_by_role('button',name='View Bag',exact=True)).to_be_enabled();colours.get_by_role('button',name='Select Colour',exact=True).click();dialog=page.get_by_role('dialog',name='Select Colour');dialog.get_by_role('radio',name=re.compile('^Wine')).check();expect(dialog.get_by_role('button',name='View Bag',exact=True)).to_be_enabled();dialog.get_by_role('button',name='Cancel',exact=True).click();fixture('restore-stock');fixture('colour-restore');page.reload();expect(wishes).to_have_count(4)
  # Responsive frames include all real item states; no prototype trust claims.
  for width in [320,390,768,1440,1920]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('scrollTo(0,0)');page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),('wishlist',width)
   expect(page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Wishlist')).to_have_attribute('aria-current','page') if width<768 else None
   boxes=page.locator('.shopping-wish-photo').all();assert all(box.bounding_box()['width']<350 for box in boxes);assert 'Lora' in page.locator('.shopping-page h1').evaluate('(el)=>getComputedStyle(el).fontFamily')
   page.screenshot(path=str(out/f'wishlist-{width}.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':900});page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Bag',exact=False).click();lines=page.locator('[data-shopping-line]');expect(lines).to_have_count(4)
  first=page.locator('[data-shopping-line="'+pid+'--simple"]');expect(page.locator('.shopping-bag-summary')).to_contain_text('1,72,000');expect(page.locator('.shopping-bag-summary')).not_to_contain_text('Total Payable')
  # A committed quantity update with lost acknowledgement retries the SAME receipt.
  mode['value']='uncertain';first.get_by_role('button',name='Increase quantity',exact=True).click();expect(page.get_by_role('button',name='Retry change',exact=True)).to_be_visible();expect(first.get_by_role('button',name='Increase quantity',exact=True)).to_be_disabled();expect(page.locator('.shopping-bag-dock').get_by_role('button',name='Proceed to Checkout')).to_be_disabled()
  mode['value']='live';first.get_by_role('button',name='Retry change',exact=True).click();expect(first.locator('output')).to_have_text('2');adjusts=[body for body in mode['operations'] if body['action']=='bag:adjust'];assert adjusts[-1]['operationId']==adjusts[-2]['operationId'];expect(first.get_by_role('button',name='Increase quantity')).to_be_enabled()
  # Rapid taps submit once; other product remains usable; no checkout while pending.
  mode['value']='hold-adjust';before=len([b for b in mode['operations'] if b['action']=='bag:adjust']);first.get_by_role('button',name='Increase quantity').dblclick();expect(first.get_by_role('status').filter(has_text='Updating')).to_be_visible();expect(page.locator('[data-shopping-line="'+vid+'--v-wine"]').get_by_role('button',name='Increase quantity')).to_be_enabled();expect(page.locator('.shopping-bag-dock').get_by_role('button',name='Proceed to Checkout')).to_be_disabled()
  for _ in range(100):
   if mode['held']:break
   page.wait_for_timeout(30)
  assert len([b for b in mode['operations'] if b['action']=='bag:adjust'])==before+1;mode['value']='live';mode['held'].pop().continue_();expect(first.locator('output')).to_have_text('3')
  fixture('stock-one');page.reload();expect(first).to_contain_text('Only 1 available');expect(first.get_by_role('button',name='Increase quantity')).to_be_disabled();first.get_by_role('button',name='Decrease quantity').click();expect(first.locator('output')).to_have_text('2');first.get_by_role('button',name='Decrease quantity').click();expect(first.locator('output')).to_have_text('1');fixture('restore-stock');page.reload();expect(first.locator('output')).to_have_text('1')
  # Failed refresh retains the confirmed rows and badge values, then recovers.
  mode['value']='load-failure';page.reload();expect(page.get_by_role('heading',name='Unable to load your bag',exact=True)).to_be_visible();assert lines.count()==0;mode['value']='live';page.get_by_role('button',name='Retry bag',exact=True).click();expect(lines).to_have_count(4)
  mode['value']='load-failure';page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Wishlist',exact=False).click();expect(page.get_by_role('alert').filter(has_text='last loaded items')).to_be_visible();expect(wishes).to_have_count(4);assert 'PRIVATE-TECHNICAL' not in page.locator('body').inner_text();mode['value']='live';page.get_by_role('button',name='Retry Wishlist',exact=True).click();page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Bag',exact=False).click();expect(lines).to_have_count(4)
  # Removal requires confirmation and reports no redundant View Bag action.
  first.get_by_role('button',name='Remove',exact=True).click();removal=page.get_by_role('dialog',name='Remove from Bag?');page.screenshot(path=str(out/'remove-sheet-390.png'),full_page=True);removal.get_by_role('button',name='Remove',exact=True).click();expect(first).to_have_count(0);expect(toast).to_contain_text('Removed from Bag.');expect(toast.get_by_role('button',name='View Bag')).to_have_count(0);expect(page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name=re.compile('Bag'))).to_contain_text('3')
  page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Wishlist',exact=False).click();expect(toast).to_have_count(0);simple.get_by_role('button',name='Add to Bag',exact=True).click();expect(simple.get_by_role('button',name='View Bag',exact=True)).to_be_visible();expect(wishes).to_have_count(4)
  # Wishlist-only feedback must never link to Bag, and suppresses redundant destination.
  simple.get_by_role('button',name=re.compile('^Remove ')).click();page.get_by_role('dialog',name='Remove from Wishlist?').get_by_role('button',name='Remove',exact=True).click();expect(simple).to_have_count(0);expect(toast).to_contain_text('Removed from Wishlist.');expect(toast.get_by_role('button',name='View Bag')).to_have_count(0)
  page.goto(origin+'/product/shopping-simple');page.get_by_role('button',name='Save to Wishlist',exact=True).click();expect(toast).to_contain_text('Saved to Wishlist');expect(toast.get_by_role('button',name='View Wishlist',exact=True)).to_be_visible();expect(toast.get_by_role('button',name='View Bag')).to_have_count(0);toast.get_by_role('button',name='Dismiss notification').click();expect(toast).to_have_count(0)
  before=len(mode['operations']);page.get_by_role('button',name='Save to Wishlist',exact=True).click();confirm=page.get_by_role('dialog',name='Remove from Wishlist?');expect(confirm).to_be_visible();assert len(mode['operations'])==before;confirm.get_by_role('button',name='Keep Item',exact=True).click()
  page.goto(origin+'/bag');expect(lines).to_have_count(4)
  for width in [320,390,768,1440,1920]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('scrollTo(0,0)');page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),('bag',width)
   if width<768:
    dock=page.locator('.shopping-bag-dock').bounding_box();nav=page.get_by_role('navigation',name='Mobile Bottom Navigation').bounding_box();assert abs(dock['y']+dock['height']-nav['y'])<2;expect(page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name=re.compile('Bag'))).to_have_attribute('aria-current','page')
   page.screenshot(path=str(out/f'bag-{width}.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':900});page.locator('.shopping-bag-dock').get_by_role('button',name='Proceed to Checkout').click();page.wait_for_url('**/checkout');assert 'buyNow' not in page.url
  # Unavailable-only Bag disables checkout without dropping saved entries.
  fixture('unavailable-only');page.goto(origin+'/bag');expect(lines).to_have_count(1);expect(page.locator('.shopping-bag-dock').get_by_role('button',name='Proceed to Checkout')).to_be_disabled();expect(page.locator('.shopping-bag-summary')).to_contain_text('No items are currently available')
  # Late previous-account reads cannot replace a restored different account.
  mode['value']='hold-read';page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Wishlist',exact=False).click()
  for _ in range(100):
   if mode['held']:break
   page.wait_for_timeout(25)
  page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Account',exact=True).click();page.get_by_role('button',name='Sign out',exact=True).click();expect(page.get_by_label('Email address',exact=True)).to_be_visible();mode['value']='live';login(page,'legacy-customer@example.test');expect(page.locator('.profile-avatar')).to_be_visible();page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='Bag',exact=True).click();expect(page.get_by_role('heading',name='Your bag is empty',exact=True)).to_be_visible()
  for route,response in mode['held']:
   try:route.fulfill(response=response)
   except:pass
  expect(lines).to_have_count(0);expect(toast).to_have_count(0);assert not errors,errors;browser.close()
 fixture('assert');print('Wishlist/Bag browser passed: variants, receipts, rapid taps, stock/subtotals, badges, confirmed notifications and pauses, dialogs, retained refresh state, checkout handoff, account cleanup and five widths.')
finally:fixture('cleanup');fixture('cleanup','shopping-fixture-control.ts')

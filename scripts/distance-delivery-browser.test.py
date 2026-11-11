"""Local real Auth/Firestore/API flow; OSM tiles and routing use test-only fixtures."""
import os,subprocess,base64,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action):subprocess.run(['node','--import','tsx','scripts/distance-delivery-fixture-control.ts',action],check=True,capture_output=True)
fixture('seed');origin='http://127.0.0.1:3100';screens=Path('.cache/distance-delivery');screens.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();errors=[]
 def context():
  ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
  ctx.route('https://**/*',lambda r:r.abort())
  ctx.route('https://tile.openstreetmap.org/**',lambda r:r.fulfill(status=200,content_type='image/png',body=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=')))
  return ctx
 def login(page,email,path):
  page.goto(origin+'/login?returnTo='+path);page.get_by_label('Email address',exact=True).fill(email);page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url('**'+path)
 customer=context();page=customer.new_page();page.on('pageerror',lambda e:errors.append(str(e)));login(page,'customer@example.test','/checkout')
 page.locator('aside.checkout-summary summary').click()
 expect(page.locator('[data-shipping-state="ready"]')).to_be_visible(timeout=30000)
 expect(page.get_by_text('Add ₹5,000.00 more to get free delivery.',exact=False)).to_be_visible()
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});expect(page.locator('.store-loading')).to_have_count(0);expect(page.get_by_role('button',name='Continue to Review',exact=True)).to_be_enabled();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.screenshot(path=str(screens/f'checkout-{width}.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':900});page.get_by_role('button',name='Edit address',exact=True).click();dialog=page.get_by_role('dialog',name='Edit delivery address');dialog.get_by_role('button',name='Select location on map (optional)',exact=True).click();expect(dialog.locator('.leaflet-container')).to_be_visible();dialog.locator('.leaflet-container').click(position={'x':100,'y':100});expect(dialog.get_by_text('Selected location:',exact=False)).to_be_visible();dialog.get_by_label('Latitude',exact=True).fill('17.5');dialog.get_by_label('Longitude',exact=True).fill('78.5');dialog.screenshot(path=str(screens/'map-mobile.png'));dialog.get_by_role('button',name='Save address',exact=True).click();expect(dialog).not_to_be_visible();fixture('assert-address')
 expect(page.locator('[data-shipping-state="ready"]')).to_be_visible();page.get_by_role('button',name='Continue to Review',exact=True).click();page.wait_for_url('**/checkout/summary');page.get_by_role('button',name='Continue to Payment',exact=True).click();page.wait_for_url('**/checkout/payment');expect(page.get_by_role('radio',name='Cash on Delivery',exact=True)).to_be_visible();page.wait_for_timeout(1500);assert page.url.endswith('/checkout/payment'),'Identical quote refresh must not redirect back to summary'
 fixture('cod-off');page.wait_for_url('**/checkout/summary');page.get_by_role('button',name='Continue to Payment',exact=True).click();page.wait_for_url('**/checkout/payment');expect(page.get_by_role('radio',name='Cash on Delivery',exact=True)).not_to_be_visible();expect(page.get_by_role('button',name='Pay Online',exact=False)).to_be_disabled()
 # A rejected cached quote must not be reused by Retry.
 rejected=[];fresh=[]
 def quote_conflict(route):
  data=route.request.post_data_json if route.request.method=='POST' else {}
  if data.get('action')=='orders:review':
   if not rejected and data.get('deliveryQuoteId'):
    rejected.append(True);route.fulfill(status=409,content_type='application/json',body=json.dumps({'code':'conflict','message':'Delivery quote expired or changed. Refresh checkout review before placing your order.'}));return
   if rejected:fresh.append(not bool(data.get('deliveryQuoteId')))
  route.continue_()
 page.route('**/api/catalog',quote_conflict);page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.get_by_text('Delivery quote expired or changed.',exact=False)).to_be_visible();page.get_by_role('button',name='Refresh checkout review',exact=True).click();expect(page.get_by_text('Delivery quote expired or changed.',exact=False)).not_to_be_visible();assert rejected and fresh and all(fresh)
 admin=context();owner=admin.new_page();owner.on('pageerror',lambda e:errors.append(str(e)));owner.goto(origin+'/admin/settings');owner.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');owner.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);owner.get_by_role('button',name='Sign In',exact=True).click();expect(owner.get_by_role('heading',name='Dispatch Location',exact=True)).to_be_visible(timeout=30000)
 for width in [320,390,768,1440]:
  owner.set_viewport_size({'width':width,'height':1000});expect(owner.locator('.store-loading')).to_have_count(0);assert owner.evaluate('document.documentElement.scrollWidth<=innerWidth+1');owner.screenshot(path=str(screens/f'settings-{width}.png'),full_page=True)
 assert owner.get_by_label('Enable COD for new orders').is_checked()==False
 assert owner.get_by_role('checkbox',name='Online',exact=False).count()==0
 owner.get_by_label('Shop / dispatch location name',exact=True).fill('Updated local dispatch');owner.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first.click();expect(owner.get_by_text('Store settings updated.',exact=True)).to_be_visible(timeout=30000);owner.reload();expect(owner.get_by_label('Shop / dispatch location name',exact=True)).to_have_value('Updated local dispatch')
 assert not errors,errors
 browser.close()
print('Distance delivery browser: manual/map addresses, stable checkout, COD toggle, settings persistence and responsive layouts passed.')

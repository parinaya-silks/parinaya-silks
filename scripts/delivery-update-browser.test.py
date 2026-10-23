"""Delivery drawer with real loopback writes, concurrency and lost-response retry."""
import os,subprocess,json
from datetime import datetime,timedelta,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';oid=format(7001,'032x');screens=Path('.cache/delivery-update-browser');screens.mkdir(parents=True,exist_ok=True)
eta=(datetime.now(timezone(timedelta(hours=5,minutes=30))).date()+timedelta(days=3)).isoformat()
def fixture(action):subprocess.run(['node','--import','tsx','scripts/delivery-update-fixture-control.ts',action],capture_output=True,check=True)
fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000});errors=[];native_dialogs=[]
  for pattern in ['https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**','https://firestore.googleapis.com/**']:ctx.route(pattern,lambda route:route.abort())
  page=ctx.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.on('dialog',lambda dialog:(native_dialogs.append(dialog.type),dialog.dismiss()))
  page.goto(origin+'/admin/orders/'+oid);page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
  entry=page.get_by_role('button',name='Update Delivery',exact=True).first;entry.click();panel=page.get_by_role('dialog',name='Update Delivery',exact=True)
  expect(panel.get_by_label('Consignment / AWB',exact=True)).to_have_value('BLR-8923019-IN');expect(panel.get_by_label('Estimated Delivery Date',exact=True)).to_have_value('2020-01-01');expect(panel.get_by_role('button',name='Review Update',exact=True)).to_be_disabled()
  assert panel.get_by_label('New Status',exact=True).locator('option').all_text_contents()==['Choose next status','Shipped']
  for width in [320,390,768,1024,1440,1920]:
   page.set_viewport_size({'width':width,'height':1000});panel.get_by_label('Estimated Delivery Date',exact=True).scroll_into_view_if_needed();page.screenshot(path=str(screens/f'edit-{width}.png'))
   assert not panel.evaluate('(el)=>el.scrollWidth>el.clientWidth+1'),width
   footer=panel.locator('.delivery-footer').bounding_box();assert footer and footer['y']+footer['height']<=1001,width
   assert page.evaluate('devicePixelRatio')==1
  page.set_viewport_size({'width':1440,'height':1000})
  panel.get_by_role('button',name='Close delivery panel',exact=True).focus();page.keyboard.press('Shift+Tab');expect(panel.get_by_role('button',name='Cancel',exact=True)).to_be_focused()
  # Closing a pristine panel restores focus. Mode changes alone are not edits.
  panel.get_by_role('button',name='Close delivery panel',exact=True).click();expect(panel).not_to_be_visible();expect(entry).to_be_focused()
  entry.click();panel.get_by_role('button',name='Edit Details Only',exact=True).click();expect(panel.get_by_role('button',name='Review Update',exact=True)).to_be_disabled()
  panel.get_by_label('Consignment / AWB',exact=True).fill('MY-DIRTY-AWB')
  # Focus/visibility changes do not discard input or show a native dialog.
  other=ctx.new_page();other.goto('about:blank');other.bring_to_front();page.bring_to_front();expect(panel.get_by_label('Consignment / AWB',exact=True)).to_have_value('MY-DIRTY-AWB');assert not native_dialogs;other.close()
  fixture('background');page.evaluate("window.dispatchEvent(new CustomEvent('parinaya:admin-data-changed',{detail:'test-approved-admin'}))")
  expect(panel.get_by_role('alert').filter(has_text='This order changed')).to_be_visible();expect(panel.get_by_label('Consignment / AWB',exact=True)).to_have_value('MY-DIRTY-AWB');expect(panel.get_by_role('button',name='Review Update',exact=True)).to_be_disabled()
  panel.get_by_role('button',name='Review latest revision',exact=True).click();expect(panel.get_by_label('Consignment / AWB',exact=True)).to_have_value('MY-DIRTY-AWB')
  panel.get_by_label('Public Tracking Link',exact=True).fill('javascript:alert(1)');panel.get_by_role('button',name='Review Update',exact=True).click();expect(panel.get_by_text('Use a safe HTTPS URL.',exact=True)).to_be_visible()
  panel.get_by_label('Public Tracking Link',exact=True).fill('https://courier.example.test/updated');panel.get_by_role('button',name='Clear estimated delivery date',exact=True).click();panel.get_by_role('button',name='Review Update',exact=True).click()
  expect(panel).to_contain_text('Order status remains unchanged.');expect(panel).to_contain_text('Cleared');panel.get_by_role('button',name='Back to Edit',exact=True).click();expect(panel.get_by_role('button',name='Review Update',exact=True)).to_be_focused()
  panel.get_by_role('button',name='Review Update',exact=True).click();panel.get_by_role('button',name='Confirm Update',exact=True).click();expect(panel.get_by_role('status').filter(has_text='Delivery update saved.')).to_be_visible();expect(panel.get_by_label('Current State',exact=True)).to_have_value('Processing');expect(panel.get_by_label('Estimated Delivery Date',exact=True)).to_have_value('')
  # The same drawer handles status transition with an exact lost-response retry.
  panel.get_by_role('button',name='Update Status',exact=True).click();panel.get_by_label('New Status',exact=True).select_option('Shipped');panel.get_by_label('Estimated Delivery Date',exact=True).fill(eta);requests=[]
  def lose_once(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='adminOrders:update' and body.get('command')=='Shipped' and body.get('id')==oid:
    requests.append(body)
    if len(requests)==1:response=route.fetch();assert response.status==200;route.abort();return
   route.continue_()
  page.route('**/api/catalog',lose_once);panel.get_by_role('button',name='Review Update',exact=True).click();page.screenshot(path=str(screens/'review-desktop.png'));panel.get_by_role('button',name='Confirm Update',exact=True).click();panel.get_by_role('button',name='Retry exact update safely',exact=True).click();expect(panel.get_by_role('status').filter(has_text='Delivery update saved.')).to_be_visible();assert len(requests)==2 and requests[0]==requests[1];fixture('assert-once');page.unroute('**/api/catalog',lose_once)
  panel.get_by_role('button',name='Close delivery panel',exact=True).click();expect(panel).not_to_be_visible();page.reload();entry.click();expect(panel.get_by_label('Current State',exact=True)).to_have_value('Shipped');expect(panel.get_by_label('Consignment / AWB',exact=True)).to_have_value('MY-DIRTY-AWB');expect(panel.get_by_label('Estimated Delivery Date',exact=True)).to_have_value(eta)
  page.set_viewport_size({'width':320,'height':560});panel.get_by_label('Estimated Delivery Date',exact=True).focus();panel.get_by_label('Estimated Delivery Date',exact=True).scroll_into_view_if_needed();field=panel.get_by_label('Estimated Delivery Date',exact=True).bounding_box();footer=panel.locator('.delivery-footer').bounding_box();assert field['y']+field['height']<=footer['y']+1;page.screenshot(path=str(screens/'short-mobile.png'));page.set_viewport_size({'width':1440,'height':1000})
  panel.get_by_role('button',name='Edit Details Only',exact=True).click();panel.get_by_label('Consignment / AWB',exact=True).fill('UNSAVED');page.keyboard.press('Escape');expect(panel.get_by_role('heading',name='Discard unsaved delivery changes?',exact=True)).to_be_visible();panel.get_by_role('button',name='Keep editing',exact=True).click();expect(panel.get_by_label('Consignment / AWB',exact=True)).to_have_value('UNSAVED');panel.get_by_role('button',name='Close delivery panel',exact=True).click();panel.get_by_role('button',name='Discard and close',exact=True).click();expect(panel).not_to_be_visible()
  # A failed panel read has its own retry without exposing previous form values.
  failing={'once':True}
  def fail_read(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='adminOrders:get' and failing['once']:failing['once']=False;route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Private fixture"}')
   else:route.continue_()
  page.route('**/api/catalog',fail_read);entry.click();expect(panel.get_by_role('alert')).to_contain_text('Unable to load delivery details.');panel.get_by_role('button',name='Retry delivery details',exact=True).click();expect(panel.get_by_label('Consignment / AWB',exact=True)).to_have_value('MY-DIRTY-AWB');panel.get_by_role('button',name='Close delivery panel',exact=True).click();page.unroute('**/api/catalog',fail_read)
  customer_ctx=browser.new_context();customer=customer_ctx.new_page();customer.goto(origin+'/login?returnTo=%2Forder-tracking%2F'+oid);customer.get_by_label('Email address',exact=True).fill('customer@example.test');customer.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);customer.get_by_role('button',name='Sign In',exact=True).click();expect(customer.get_by_text('Estimated delivery: '+datetime.fromisoformat(eta).strftime('%d/%m/%Y')+' (estimate, not guaranteed)',exact=True)).to_be_visible();expect(customer.get_by_role('link',name='Open courier tracking',exact=True)).to_have_attribute('rel','noopener noreferrer');assert 'Local administrator note' not in customer.locator('body').inner_text();customer_ctx.close()
  entry.click();page.evaluate("window.dispatchEvent(new Event('parinaya:before-admin-navigation',{cancelable:true}))");expect(panel).to_be_visible();panel.get_by_role('button',name='Close delivery panel',exact=True).click();page.get_by_role('button',name='Sign Out',exact=True).click();page.get_by_role('heading',name='Administrator Sign In',exact=True).wait_for();expect(panel).not_to_be_visible()
  assert not errors,errors;assert not native_dialogs;browser.close();print('Delivery panel browser passed: prefill, four fields/ETA, review/cancel, metadata save, concurrency, focus/tab preservation, exact lost-response retry, persistence, customer tracking, failed-read retry, sign-out cleanup and six widths.')
finally:fixture('cleanup')

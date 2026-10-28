import re
"""Real loopback COD acceptance, lost-response recovery and six-width order UI."""
import os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
screens=Path('.cache/cod-browser');screens.mkdir(parents=True,exist_ok=True)
def fixture(command,script='cod'):
 subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',command],capture_output=True,check=True)
fixture('seed','shopping');fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch()
  def context():
   ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
   for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda route:route.abort())
   ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.abort());return ctx
  def login(page,admin=False):
   page.get_by_label('Email' if admin else 'Email address',exact=True).fill('parinayasilks.in@gmail.com' if admin else 'customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
  ctx=context();page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(origin+'/login?returnTo=%2Fcheckout');login(page);page.get_by_role('button',name='Continue to Review',exact=True).click();page.get_by_role('button',name='Continue to Payment',exact=True).click();place=page.get_by_role('button',name=re.compile(r'^Place Order'));expect(place).to_be_enabled()
  for width in [320,375,390,768,1024,1440]:
   page.set_viewport_size({'width':width,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width;page.screenshot(path=str(screens/f'checkout-{width}.png'),full_page=True)
  def reject_once(route):
   if route.request.method=='POST' and route.request.post_data_json.get('action')=='orders:place':route.fulfill(status=400,content_type='application/json',body='{"code":"invalid","message":"Correctable fixture rejection"}')
   else:route.continue_()
  page.route('**/api/catalog',reject_once);place.click();page.get_by_role('alert').filter(has_text='Correctable fixture rejection').wait_for();expect(place).to_be_enabled();assert page.evaluate('localStorage.getItem("parinaya:cod-pending:test-customer")') is None;page.unroute('**/api/catalog',reject_once)
  lost={'once':True};operations=[];requests=[]
  def lose_response(route):
   if route.request.method=='POST' and route.request.post_data_json.get('action')=='orders:place':
    operations.append(route.request.post_data_json['operationId']);requests.append(route.request.post_data_json)
    if lost['once']:
     lost['once']=False;response=route.fetch();assert response.status==200;route.abort();return
   route.continue_()
  page.route('**/api/catalog',lose_response);place.click();retry=page.get_by_role('button',name='Check order status',exact=True);expect(retry).to_be_enabled();retry.click();page.wait_for_url('**/order-confirmed/*');page.get_by_role('heading',name='Thank you! Your order has been placed.',exact=True).wait_for();assert len(operations)==2 and operations[0]==operations[1];fixture('assert-single')
  order_id=page.url.rsplit('/',1)[1];page.reload();page.get_by_role('heading',name='Thank you! Your order has been placed.',exact=True).wait_for();fixture('assert-single')
  # Recreate the durable state left by a response lost before navigation. Mount
  # recovery must read the accepted operation, without submitting it again.
  page.evaluate('(body)=>localStorage.setItem("parinaya:cod-pending:test-customer",JSON.stringify(body))',requests[0]);page.goto(origin+'/checkout');page.wait_for_url('**/order-confirmed/'+order_id);page.get_by_role('heading',name='Thank you! Your order has been placed.',exact=True).wait_for();assert len(operations)==2;fixture('assert-single')
  a=context();admin=a.new_page();calls=[];admin.on('response',lambda response:calls.append((response.request.post_data_json.get('action'),response.status)) if '/api/catalog' in response.url and response.request.method=='POST' else None);admin.on('pageerror',lambda error:errors.append(str(error)));admin.goto(origin+'/admin/orders/'+order_id);login(admin,True);admin.get_by_role('heading',name='Order details',exact=True).wait_for();action=admin.get_by_label('Action',exact=True)
  try:admin.get_by_role('heading',name='Order actions',exact=True).wait_for()
  except Exception:
   print('COD admin API status only:',calls,flush=True);print('COD admin alerts:',admin.get_by_role('alert').all_text_contents(),flush=True);admin.screenshot(path=str(screens/'admin-load-failure.png'),full_page=True);raise
  for command in ['Confirmed','Processing','Shipped','Delivered']:
   try:action.select_option(command)
   except Exception:
    print('COD action wait:',command,'API statuses:',calls,'alerts:',admin.get_by_role('alert').all_text_contents(),'page error count:',len(errors),'select count:',admin.locator('select').count(),'labels:',admin.locator('label').all_text_contents(),flush=True);admin.screenshot(path=str(screens/'admin-action-failure.png'),full_page=True);raise
   if command=='Shipped':admin.get_by_label('Courier',exact=True).fill('Emulator Courier');admin.get_by_label('Tracking number',exact=True).fill('TRACK-LOCAL')
   admin.get_by_role('button',name='Save action',exact=True).click();admin.get_by_role('dialog',name='Confirm order action',exact=True).get_by_role('button',name='Confirm action',exact=True).click();expect(action).to_have_value('');admin.get_by_text('Revision ',exact=False).wait_for()
  page.goto(origin+'/order-tracking/'+order_id);page.get_by_text('Cash on Delivery',exact=False).filter(has_text='Payment due').wait_for();assert 'Collection recorded on' not in page.locator('body').inner_text()
  action.select_option('collect');admin.get_by_label('External reference',exact=True).fill('Emulator remittance');admin.get_by_role('button',name='Save action',exact=True).click();admin.get_by_role('dialog',name='Confirm order action',exact=True).get_by_role('button',name='Confirm action',exact=True).click();expect(action).to_have_value('');page.reload();page.get_by_text('Collection recorded',exact=False).first.wait_for()
  for width in [320,375,390,768,1024,1440]:
   for label,view in [('customer-order',page),('admin-order',admin)]:
    view.set_viewport_size({'width':width,'height':900});view.screenshot(path=str(screens/f'{label}-{width}.png'),full_page=True)
    if view.evaluate('document.documentElement.scrollWidth>innerWidth+1'):
     print('COD layout overflow',label,width,view.locator('body *').evaluate_all('(nodes)=>nodes.map(el=>({tag:el.tagName,classes:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(el=>el.right>innerWidth+1).slice(-12)'),flush=True);raise AssertionError((label,width))
  admin.get_by_role('button',name='Administrator notifications',exact=True).click();admin.get_by_role('region',name='Notifications',exact=True).get_by_text('New COD order PS-'+order_id.upper(),exact=True).wait_for();admin.get_by_role('button',name='Mark all as read',exact=True).click()
  page.goto(origin+'/account/orders');page.get_by_role('heading',name='My orders',exact=True).wait_for();page.get_by_text('PS-'+order_id.upper(),exact=True).wait_for()
  page.goto(origin+'/account');page.get_by_role('button',name='Edit name and mobile',exact=True).click();page.get_by_label('Name',exact=True).fill('Updated COD Customer');page.get_by_label('Mobile number',exact=True).fill('9876543210');page.get_by_role('button',name='Save profile',exact=True).click();expect(page.locator('.customer-account-details dd').first).to_have_text('Updated COD Customer')
  legacy=context().new_page();legacy.goto(origin+'/login');legacy.get_by_label('Email address',exact=True).fill('legacy-customer@example.test');legacy.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);legacy.get_by_role('button',name='Sign In',exact=True).click();legacy.get_by_role('button',name='Edit name and mobile',exact=True).click();expect(legacy.get_by_label('Mobile number',exact=True)).to_have_value('');legacy.get_by_label('Name',exact=True).fill('Legacy edited');legacy.get_by_role('button',name='Save profile',exact=True).click();expect(legacy.locator('.customer-account-details dd').first).to_have_text('Legacy edited')
  assert not errors,errors
  browser.close();print('COD browser passed: trusted placement, lost-response retry, one order/deduction, customer history, admin fulfilment, independent collection, notifications, profile editing and six widths.')
finally:
 fixture('cleanup');fixture('cleanup','shopping')

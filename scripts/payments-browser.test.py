"""Gateway requests intercepted; real loopback customer auth and checkout pricing. No live records."""
import json,os,subprocess,copy
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';oid='b'*32;out=Path('.cache/payments-ui');out.mkdir(parents=True,exist_ok=True)
def fixture(action,script):subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',action],check=True,capture_output=True)
fixture('seed','shopping');fixture('seed','cod')
order={'id':oid,'uid':'test-customer','reference':'PS-'+oid.upper(),'status':'Placed','paymentStatus':'pending','createdAt':1793221200000,'updatedAt':1793221200000,'revision':1,'items':[{'productId':'s'*20,'variantId':None,'variantName':'','name':'Synthetic checkout saree','imageUrl':'','quantity':1,'unitPaise':100000,'linePaise':'100000'}],'address':{'recipientName':'Local Customer','line1':'Local Lane','locality':'Local','city':'Hyderabad','state':'Telangana','pinCode':'500034','mobileNumber':'+919876543210'},'subtotalPaise':'100000','discountPaise':'0','shippingPaise':'0','totalPaise':'100000','couponCode':None,'courier':'','trackingNumber':'','trackingUrl':'','history':[{'action':'Placed','at':1793221200000}],'collection':None,'request':None,'refunds':[], 'payment':{'state':'PENDING','mode':'test','amountPaise':100000,'reservation':'active','createdAt':1793221200000,'updatedAt':1793221200000,'expiresAt':9999999999999}}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort());ctx.route('https://res.cloudinary.com/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
  ctx.route('https://checkout.razorpay.com/v1/checkout.js',lambda r:r.abort() if state.get('blocked') else r.fulfill(status=200,content_type='application/javascript',body="window.Razorpay=class{constructor(o){window.paymentFixture=o;}on(){}open(){window.paymentOpened=(window.paymentOpened||0)+1;}}"))
  page=ctx.new_page();errors=[];requests=[];state={'active':False,'fail':False,'decline':False}
  page.on('pageerror',lambda e:errors.append(str(e)))
  def payments(route):
   action=route.request.url.split('/api/payments/')[1].split('?')[0];body=route.request.post_data_json if route.request.method=='POST' else {};requests.append((action,body))
   if action=='capabilities':route.fulfill(status=200,json={'online':True,'mode':'test'});return
   if action=='status':
    if not state['active'] and '?operationId=' in route.request.url:route.fulfill(status=404,json={'code':'not-found','message':'Payment not found.'});return
    route.fulfill(status=200,json={'id':oid,'payment':order['payment']} if state['active'] else {'active':None});return
   if action in ['create-order','resume']:
    state['active']=True;route.fulfill(status=200,json={'id':oid,'reference':order['reference'],'payment':order['payment'],'checkout':{'key':'rzp_test_fixture123456','order_id':'order_Fixture','amount':int(order['totalPaise']),'currency':'INR','mode':'test'}});return
   if action=='verify':
    if state['fail']:route.fulfill(status=503,json={'code':'unavailable'});return
    order['payment'].update({'state':'CAPTURED','reservation':'consumed','capturedAt':1793221210000});order.update({'status':'Confirmed','paymentStatus':'paid'});route.fulfill(status=200,json={'id':oid,'payment':order['payment']});return
   route.fulfill(status=400,json={'code':'invalid'})
  page.route('**/api/payments/**',payments)
  def catalog(route):
   if route.request.method=='POST' and route.request.post_data_json.get('action')=='orders:review':
    response=route.fetch();value=response.json()
    # Checkout also reviews before an address is selected. Forward that blocked
    # review unchanged; only a payable review can define the gateway fixture.
    if value.get('valid') and value.get('totalPaise') is not None:
     order.update(totalPaise=value['totalPaise'],subtotalPaise=value['subtotalPaise'],shippingPaise=value['shipping']['shippingPaise']);order['payment']['amountPaise']=int(value['totalPaise'])
    route.fulfill(response=response);return
   if route.request.method=='POST' and route.request.post_data_json.get('action')=='orders:get':route.fulfill(status=200,json=order);return
   if route.request.method=='POST' and route.request.post_data_json.get('action')=='orders:place':raise AssertionError('Online flow must never call COD placement')
   route.continue_()
  page.route('**/api/catalog',catalog)
  page.goto(origin+'/login?returnTo=%2Fcheckout');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url('**/checkout')
  page.evaluate("localStorage.setItem('parinaya:payment:test-customer:bag','eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')");page.reload()
  page.get_by_role('button',name='Continue to Review',exact=True).click();page.get_by_role('button',name='Continue to Payment',exact=True).click();page.get_by_label('Online payment',exact=True).check()
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width;expect(page.get_by_role('button',name='Pay Online',exact=False)).to_be_enabled();page.screenshot(path=str(out/f'checkout-{width}.png'),full_page=True)
  page.get_by_role('button',name='Pay Online',exact=False).dblclick();page.wait_for_function('window.paymentOpened===1');assert len([r for r in requests if r[0]=='create-order'])==1;assert [r for r in requests if r[0]=='create-order'][0][1]['operationId']=='e'*32
  # Dismissal cannot confirm the order or create another payment.
  page.evaluate('window.paymentFixture.modal.ondismiss()');page.wait_for_url('**/order-tracking/'+oid);expect(page.get_by_role('region',name='Online payment status')).to_be_visible();assert page.locator('.order-greeting').count()==0;assert 'Cash on Delivery' not in page.locator('.customer-order-experience').inner_text()
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('document.fonts.ready');page.wait_for_timeout(150);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,page.evaluate("Array.from(document.querySelectorAll('body *')).filter(e=>e.getBoundingClientRect().right>innerWidth+2).map(e=>[e.tagName,e.className,e.getBoundingClientRect().width]).slice(0,10)"));page.screenshot(path=str(out/f'pending-{width}.png'))
  page.get_by_role('button',name='Continue existing payment').click();page.wait_for_function('window.paymentOpened===2');assert len([r for r in requests if r[0]=='create-order'])==1
  state['fail']=True;page.evaluate("window.paymentFixture.handler({razorpay_order_id:'order_Fixture',razorpay_payment_id:'pay_Fixture',razorpay_signature:'synthetic'})");expect(page.get_by_role('alert').filter(has_text='verification is pending')).to_be_visible();assert page.locator('.order-greeting').count()==0
  state['fail']=False;page.evaluate("window.paymentFixture.handler({razorpay_order_id:'order_Fixture',razorpay_payment_id:'pay_Fixture',razorpay_signature:'synthetic'})");expect(page.get_by_role('status').filter(has_text='Payment successful!').first).to_be_visible()
  page.goto(origin+'/order-confirmed/'+oid);expect(page.locator('.order-greeting')).to_be_visible();assert 'Cash on Delivery' not in page.locator('.customer-order-experience').inner_text();assert not errors,errors
  state.update(active=False,blocked=True);order['payment'].update(state='PENDING',reservation='active');order.update(status='Placed',paymentStatus='pending');page.goto(origin+'/checkout');page.get_by_role('button',name='Continue to Review',exact=True).click();page.get_by_role('button',name='Continue to Payment',exact=True).click();page.get_by_label('Online payment',exact=True).check();page.get_by_role('button',name='Pay Online',exact=False).click();expect(page.get_by_role('status').filter(has_text='Payment window was blocked')).to_be_visible();assert len([r for r in requests if r[0]=='create-order'])==2
  page.get_by_role('button',name='Check payment status',exact=True).click();page.wait_for_url('**/order-tracking/'+oid);page.reload();expect(page.get_by_role('region',name='Online payment status')).to_be_visible();assert len([r for r in requests if r[0]=='create-order'])==2;assert page.locator('.order-greeting').count()==0;assert not errors,errors
  ctx.close();browser.close()
 print('Payment UI: 320/390/768/1440; one initiation, dismissal, safe resume, lost verification, captured-only confirmation; no real gateway requests.')
finally:
 fixture('cleanup','cod');fixture('cleanup','shopping')

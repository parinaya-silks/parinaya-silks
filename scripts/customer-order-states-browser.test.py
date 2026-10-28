"""Controlled read responses for loading/stale/exceptional states, with local emulator sign-in."""
import os,json,copy
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';oid='a'*32;other_id='c'*32
order={'id':oid,'uid':'test-customer','reference':'PS-SAVED-ONE','status':'Confirmed','paymentStatus':'due','createdAt':1793221200000,'updatedAt':1793221200000,'revision':2,'items':[{'productId':'p'*20,'variantId':None,'variantName':'','name':'Saved historical item','imageUrl':'','quantity':1,'unitPaise':100000,'linePaise':'100000'}],'address':{'recipientName':'Local Customer','line1':'Local Lane','locality':'Local','city':'Hyderabad','state':'Telangana','pinCode':'500034','mobileNumber':'+919876543210'},'subtotalPaise':'100000','discountPaise':'0','shippingPaise':'0','totalPaise':'100000','couponCode':None,'courier':'','trackingNumber':'','trackingUrl':'','history':[{'action':'Placed','at':1793221200000},{'action':'Confirmed','at':1793221210000}],'collection':None,'request':None,'refunds':[]}
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort());page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));state={'mode':'hold','value':order};held=[];mutations=[]
 def api(route):
  if route.request.method!='POST':route.continue_();return
  body=route.request.post_data_json
  if body.get('action')=='orders:get':
   if state['mode']=='hold':held.append(route);return
   data=copy.deepcopy(state['value']);data['id']=body['id'];route.fulfill(status=200,content_type='application/json',body=json.dumps(data));return
  if body.get('action')=='orders:request':mutations.append(body)
  route.continue_()
 page.route('**/api/catalog',api);page.goto(origin+'/login?returnTo=%2Forder-confirmed%2F'+oid);page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();expect(page.get_by_role('status').filter(has_text='Loading your order')).to_be_visible();assert not page.locator('.order-greeting').count()
 for _ in range(100):
  if held:break
  page.wait_for_timeout(20)
 assert held;state['mode']='ready';held.pop().fulfill(status=200,content_type='application/json',body=json.dumps(order));expect(page.locator('.order-greeting')).to_have_attribute('data-animated','false');assert page.locator('.order-ring').evaluate('el=>getComputedStyle(el).animationName')=='none';assert page.locator('.order-check').evaluate('el=>getComputedStyle(el).strokeDashoffset')=='0px';assert 'ParinayaLora' in page.locator('.customer-order-experience').evaluate('el=>getComputedStyle(el).fontFamily');assert page.evaluate('document.fonts.check("14px ParinayaLora")')
 # Final isolated layout captures; the separate real-order suite covers server reads.
 out=Path('.cache/customer-order-design');out.mkdir(parents=True,exist_ok=True)
 for label,path in [('confirmation-static','/order-confirmed/'+oid),('details-static','/order-tracking/'+oid)]:
  page.goto(origin+path);expect(page.locator('.order-reference')).to_contain_text('PS-SAVED-ONE')
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
   if page.evaluate('document.documentElement.scrollWidth>innerWidth+1'):
    page.screenshot(path=str(out/'overflow.png'),full_page=True)
    print('Layout metrics',page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth})'),page.locator('body *').evaluate_all('(nodes)=>nodes.map(el=>({tag:el.tagName,cls:typeof el.className==="string"?el.className:"svg",left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,scroll:el.scrollWidth,client:el.clientWidth})).filter(el=>el.right>innerWidth+1||el.left< -1||el.scroll>el.client+1).slice(0,22)'),flush=True)
    raise AssertionError((label,width))
   page.screenshot(path=str(out/f'{label}-{width}.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':900})
 expect(page.locator('.order-payment')).not_to_contain_text('Coupon Savings');expect(page.locator('.order-payment')).not_to_contain_text('Loyalty Points Redeemed');expect(page.locator('.order-purchased .order-item')).to_have_count(1)
 # In-flight reads from one order cannot populate another order after navigation.
 state['mode']='hold';page.goto(origin+'/order-tracking/'+oid);expect(page.get_by_role('status').filter(has_text='Loading your order')).to_be_visible()
 for _ in range(100):
  if held:break
  page.wait_for_timeout(20)
 state['mode']='ready';second=copy.deepcopy(order);second['reference']='PS-CURRENT-SECOND';state['value']=second;page.goto(origin+'/order-tracking/'+other_id);expect(page.locator('.order-reference')).to_contain_text('PS-CURRENT-SECOND')
 for route in held:
  try:route.fulfill(status=200,content_type='application/json',body=json.dumps(order))
  except Exception:pass
 held.clear();expect(page.locator('.order-reference')).to_contain_text('PS-CURRENT-SECOND');assert 'PS-SAVED-ONE' not in page.locator('.customer-order-experience').inner_text()
 # A changed fulfilment state is rechecked while the cancellation sheet is open.
 page.get_by_role('button',name='Request Cancellation',exact=True).click();dialog=page.get_by_role('dialog');dialog.locator('textarea').fill('Retain draft while checking eligibility');state['value']={**second,'status':'Shipped','revision':3,'courier':'Local Courier','trackingNumber':'AWB-1','trackingUrl':'javascript:alert(1)'};page.evaluate('window.dispatchEvent(new Event("focus"))');expect(dialog).to_contain_text('no longer available');expect(dialog.get_by_role('button',name='Submit request',exact=True)).to_have_count(0);assert not mutations;dialog.get_by_role('button',name='Cancel',exact=True).click();expect(page.get_by_role('link',name='Open courier tracking',exact=True)).to_have_count(0)
 # Settled/reversed earnings remain distinct from refunded/restored redemption.
 state['value']={**second,'status':'Delivered','paymentStatus':'collected','collection':{'at':1793221220000},'loyalty':{'redeemed':10,'discountPaise':'1000','expected':20,'stage':'settled','earned':20,'reversed':3,'restored':2},'refunds':[{'amountPaise':100,'at':1793221230000}]};page.reload();expect(page.locator('.order-payment')).to_contain_text('Collection recorded');expect(page.get_by_role('region',name='Order loyalty points')).to_contain_text('20 points earned · 3 reversed');expect(page.locator('.order-payment')).to_contain_text('2 redeemed points restored');expect(page.locator('.order-payment')).to_contain_text('External manual refunds')
 for status in ['Cancelled','Rejected']:
  state['value']={**second,'status':status,'loyalty':{'redeemed':10,'discountPaise':'1000','expected':20,'stage':'cancelled','earned':0,'reversed':0,'restored':0}};page.goto(origin+'/order-confirmed/'+other_id);expect(page.locator('.order-status')).to_have_text(status);assert not page.locator('.order-greeting').count();expect(page.locator('.order-payment')).to_contain_text('Pending earnings cancelled. Reserved points released.')
 # Even a malformed/mismatched owned read cannot render another customer's data.
 state['value']={**second,'uid':'someone-else','reference':'NEVER-EXPOSE-THIS'};page.reload();expect(page.get_by_role('alert')).to_contain_text('We couldn’t load this order');assert 'NEVER-EXPOSE-THIS' not in page.locator('body').inner_text()
 state['mode']='hold';page.goto(origin+'/order-tracking/'+oid);expect(page.get_by_role('status').filter(has_text='Loading your order')).to_be_visible()
 for _ in range(100):
  if held:break
  page.wait_for_timeout(20)
 page.goto(origin+'/account');page.get_by_role('button',name='Sign out',exact=True).click()
 for route in held:
  try:route.fulfill(status=200,content_type='application/json',body=json.dumps(order))
  except Exception:pass
 assert 'PS-SAVED-ONE' not in page.locator('body').inner_text();assert not page.locator('.order-reference').count();assert not mutations;assert not errors,errors;browser.close()
print('Customer order states passed: held/stale reads, reduced motion/local Lora, one item, zero discounts, eligibility changes, unsafe links, settled/reversed/restored points, cancelled/rejected, mismatched UID and sign-out.')

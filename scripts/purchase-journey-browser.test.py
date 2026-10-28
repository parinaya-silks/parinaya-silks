import re
"""Purchase stages against real loopback API/Auth/Firestore, without production writes."""
import os,subprocess,json,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
screens=Path('.cache/purchase-journey');screens.mkdir(parents=True,exist_ok=True)
def fixture(command,script='cod'):
 subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',command],capture_output=True,check=True)
fixture('seed','shopping');fixture('seed');fixture('seed-buy-now')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
  ctx.route('https://**/*',lambda route:route.abort())
  for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**','https://res.cloudinary.com/parinaya-emulator/**']:ctx.route(pattern,lambda route:route.abort())
  page=ctx.new_page();errors=[];writes=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.on('request',lambda request:writes.append(request.post_data_json['action']) if '/api/catalog' in request.url and request.method=='POST' else None)
  page.goto(origin+'/');page.get_by_role('link',name='Shop Sarees',exact=True).filter(visible=True).first.click();page.wait_for_url('**/shop')
  page.get_by_role('heading',name='Shopping Colours',exact=True).click();page.wait_for_url('**/product/shopping-colours')
  buy=page.get_by_role('button',name='Buy Now',exact=True);expect(buy).to_be_disabled();page.get_by_role('button',name='Wine',exact=True).click();expect(buy).to_be_enabled()
  page.get_by_role('button',name='Increase quantity',exact=True).click();page.get_by_role('button',name='Increase quantity',exact=True).click();expect(page.get_by_role('button',name='Increase quantity',exact=True)).to_be_disabled();page.get_by_role('button',name='Decrease quantity',exact=True).click()
  for width in [320,375,390,768,1024,1440]:
   page.set_viewport_size({'width':width,'height':900});assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),('product',width)
   navigation=page.get_by_role('navigation',name='Mobile Bottom Navigation');button_box=buy.bounding_box()
   if navigation.is_visible():assert button_box['y']+button_box['height']<=navigation.bounding_box()['y']+1,('purchase/navigation overlap',width)
   assert page.get_by_role('navigation',name='Breadcrumb').evaluate('(el)=>!Array.from(el.parentElement.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()==="0")')
   page.screenshot(path=str(screens/f'product-{width}.png'),full_page=True)
  buy.click();page.wait_for_url('**/login?returnTo=*');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url('**/checkout?buyNow=*');delivery=page.url
  expect(page.locator('[data-checkout-line]')).to_have_count(1);
  if not page.locator('.checkout-summary details').evaluate('el=>el.open'):page.locator('.checkout-summary summary').click()
  page.get_by_text('Quantity: 2',exact=True).wait_for();assert 'bag:add' not in writes
  assert page.evaluate('sessionStorage.getItem("parinaya:checkout:v1:pending")') is None
  for stage,forward in [('delivery','Continue to Review'),('summary','Continue to Payment'),('payment',None)]:
   if stage!='delivery':page.wait_for_url('**/checkout/'+stage+'?buyNow=*')
   page.reload();expect(page.locator('[data-checkout-line]')).to_have_count(1);
   if stage=='delivery' and not page.locator('.checkout-summary details').evaluate('el=>el.open'):page.locator('.checkout-summary summary').click()
   page.get_by_text('Quantity: 2',exact=True).wait_for();expect(page.locator('[aria-current="step"]')).to_contain_text({'delivery':'Delivery','summary':'Review','payment':'Payment'}[stage])
   for width in [320,375,390,768,1024,1440]:
    page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(200);page.screenshot(path=str(screens/f'{stage}-{width}.png'),full_page=True)
    if page.evaluate('document.documentElement.scrollWidth>innerWidth+1'):
     print('Journey overflow:',stage,width,page.locator('body *').evaluate_all('(nodes)=>nodes.map(el=>({tag:el.tagName,classes:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(el=>el.right>innerWidth+1).slice(-12)'),flush=True);raise AssertionError((stage,width))
   if forward:page.get_by_role('button',name=forward,exact=True).click()
  expect(page.get_by_role('button',name=re.compile(r'^Place Order'))).to_be_enabled();page.go_back();page.get_by_role('button',name='Continue to Payment',exact=True).click();page.get_by_role('button',name=re.compile(r'^Place Order')).dblclick()
  page.wait_for_url('**/order-confirmed/*');page.get_by_role('heading',name='Thank you! Your order has been placed.',exact=True).wait_for();order_id=page.url.rsplit('/',1)[1];fixture('assert-buy-now')
  page.reload();page.get_by_role('heading',name='Thank you! Your order has been placed.',exact=True).wait_for();fixture('assert-buy-now')
  confirmation=page.url;page.go_back();page.get_by_role('heading',name=re.compile('Review your order|Where should we deliver|Complete your order')).wait_for();assert writes.count('orders:place')==1;page.goto(confirmation);page.get_by_role('heading',name='Thank you! Your order has been placed.',exact=True).wait_for()
  page.get_by_role('button',name='Track Order',exact=True).click();page.wait_for_url('**/order-tracking/'+order_id);page.get_by_text('Payment due',exact=False).first.wait_for()
  page.goto(origin+'/order-confirmed/'+'0'*32);page.get_by_role('alert').wait_for();expect(page.get_by_role('heading',name='Thank you! Your order has been placed.',exact=True)).to_have_count(0)
  page.goto(origin+'/checkout/payment');page.wait_for_url('**/checkout');page.get_by_role('button',name='Continue to Review',exact=True).wait_for();assert writes.count('orders:place')==1
  page.goto(origin+'/checkout/payment?buyNow='+'0'*32);page.get_by_role('heading',name='Checkout selection expired',exact=True).wait_for();assert writes.count('orders:place')==1
  # Registration restores the same selected source, without replaying a Bag action.
  fresh=browser.new_context(viewport={'width':390,'height':900})
  fresh.route('https://**/*',lambda route:route.abort())
  for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**','https://res.cloudinary.com/parinaya-emulator/**']:fresh.route(pattern,lambda route:route.abort())
  fresh.route('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v2/passwordPolicy*',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({'schemaVersion':1,'enforcementState':'ENFORCE','customStrengthOptions':{'minPasswordLength':12},'allowedNonAlphanumericCharacters':['!','-',' ']})))
  new=fresh.new_page();new.goto(origin+'/product/shopping-simple');new.get_by_role('heading',name='Shopping Simple',exact=True).wait_for();assert new.locator('main').evaluate('(el)=>{const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(walk.nextNode())if(walk.currentNode.textContent.trim()==="0")return false;return true;}');new.get_by_role('button',name='Buy Now',exact=True).click();new.wait_for_url('**/login?returnTo=*');new.get_by_role('link',name='Create an account',exact=True).click();new.get_by_label('Name',exact=True).fill('Purchase Journey Fixture');new.get_by_label('Mobile number',exact=True).fill('9876543210');new.get_by_label('Email address',exact=True).fill('journey-'+uuid.uuid4().hex+'@example.test');new.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);new.get_by_label('Confirm password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);new.get_by_role('button',name='Create account',exact=True).click();new.wait_for_url('**/checkout?buyNow=*');new.locator('.checkout-summary summary').click();new.get_by_text('Shopping Simple',exact=True).first.wait_for();expect(new.get_by_role('button',name='Continue to Review',exact=True)).to_be_disabled()
  new.reload();new.locator('.checkout-summary summary').click();new.get_by_text('Shopping Simple',exact=True).first.wait_for();assert new.evaluate('sessionStorage.getItem("parinaya:checkout:v1:pending")') is None
  assert not errors,errors
  browser.close();print('Purchase journey browser passed: Home/Shop/product, variant and quantity, signed-out Buy Now restoration, independent Bag, staged refresh/Back, single COD placement, owned confirmation/tracking, invalid routes and six widths.')
finally:
 fixture('cleanup');fixture('cleanup','shopping')

"""Actual loopback customer APIs; emulator fixtures only. No production writes."""
import os,subprocess,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';out=Path('.cache/customer-history');out.mkdir(parents=True,exist_ok=True)
def fixture(command):
 result=subprocess.run(['node','--import','tsx','scripts/customer-history-fixture.ts',command],capture_output=True)
 assert result.returncode==0,'Local history fixture failed'
def login(page,email='customer@example.test'):
 page.get_by_label('Email address',exact=True).fill(email);page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900});ctx.route('https://**/*',lambda route:route.abort());page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)));mode={'value':'live','requests':0,'held':[]}
  def requests(route):
   if route.request.method!='POST' or route.request.post_data_json.get('action')!='orders:list':route.continue_();return
   body=route.request.post_data_json;mode['requests']+=1
   assert 'customerUid' not in body and 'uid' not in body and body['view']=='cards'
   if mode['value']=='failure' or (mode['value']=='more-failure' and body.get('cursor')):route.fulfill(status=503,content_type='application/json',body=json.dumps({'code':'index-required','message':'PRIVATE-TECHNICAL-INDEX'}))
   elif mode['value']=='empty':route.fulfill(status=200,content_type='application/json',body=json.dumps({'items':[],'nextCursor':None}))
   elif mode['value']=='hold':mode['held'].append(route)
   else:route.continue_()
  page.route('**/api/catalog',requests)
  page.goto(origin+'/account/orders');login(page);root=page.locator('.customer-order-history');cards=root.locator('.history-card');expect(cards).to_have_count(25)
  expect(cards.first.locator('.history-mobile-more')).to_have_text('+2 more items in this order');expect(cards.first.locator('.history-count')).to_have_text('3 product lines · 6 units')
  assert 'PRIVATE' not in root.inner_text();assert 'Invoice' not in root.inner_text();expect(cards.filter(has_text='Purchased item details are available')).to_have_count(1)
  delivered=cards.filter(has=page.locator('.history-status[data-status="Delivered"]')).first;expect(delivered.locator('.history-order-summary')).to_contain_text('Due at delivery')
  cancelled=cards.filter(has=page.locator('.history-status[data-status="Cancelled"]')).first;expect(cancelled.locator('.history-order-summary')).to_contain_text('No delivery payment requested');expect(cancelled.locator('.history-order-summary')).to_contain_text('Order Value');assert cancelled.locator('del').count()==0
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':1000});page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
   for box in root.locator('.history-photo').all()[:4]:
    bounds=box.bounding_box();assert bounds is None or (bounds['width']<=80 and bounds['height']<=106)
   assert page.locator('.storefront-header').count()==1
   assert 'Lora' in root.locator('h1').evaluate('(el)=>getComputedStyle(el).fontFamily')
   page.add_style_tag(content='.history-card:not(:nth-child(1)):not(:nth-child(6)):not(:nth-child(7)){display:none!important}');page.screenshot(path=str(out/f'orders-{width}.png'),full_page=True);page.locator('style').last.evaluate('(el)=>el.remove()')
  page.keyboard.press('Tab');assert page.evaluate('document.activeElement.tagName') in ['A','BUTTON']
  # Bounded, duplicate-free append pages; failure leaves existing cards visible.
  mode['value']='more-failure';root.get_by_role('button',name='Load More Orders',exact=True).click();expect(root.get_by_role('alert')).to_contain_text('load more orders');expect(cards).to_have_count(25)
  mode['value']='live';root.get_by_role('button',name='Retry',exact=True).click();expect(cards).to_have_count(50);root.get_by_role('button',name='Load More Orders',exact=True).click();expect(cards).to_have_count(63)
  refs=cards.locator('.history-reference strong').all_text_contents();assert len(set(refs))==63
  # Real filters include all matching pages, not a filter of the already-loaded slice.
  root.get_by_role('link',name='In Progress',exact=True).click();expect(cards).to_have_count(25);root.get_by_role('button',name='Load More Orders',exact=True).click();expect(cards).to_have_count(36);assert set(cards.get_attribute('data-status') for cards in cards.all())<={'Placed','Confirmed','Processing','Shipped'}
  page.set_viewport_size({'width':390,'height':900});page.evaluate('scrollTo(0,680)');page.wait_for_timeout(150);before=mode['requests'];first_link=cards.first.get_by_role('link',name='View Order & Updates',exact=True);first_link.evaluate('(el)=>el.click()');page.wait_for_url('**/order-tracking/*');expect(page.locator('.order-detail-heading')).to_be_visible();expect(page.locator('.order-greeting')).to_have_count(0)
  page.get_by_role('button',name='Back to My Orders',exact=True).click();page.wait_for_url('**/account/orders?status=progress');expect(cards).to_have_count(36);page.wait_for_timeout(200);assert page.evaluate('scrollY')>500;assert mode['requests']==before
  first_link.evaluate('(el)=>el.click()');page.wait_for_url('**/order-tracking/*');page.go_back();expect(cards).to_have_count(36);page.go_forward();expect(page.locator('.order-detail-heading')).to_be_visible();page.go_back();expect(cards).to_have_count(36)
  root.get_by_role('link',name='Delivered',exact=True).click();expect(cards).to_have_count(9);assert set(card.get_attribute('data-status') for card in cards.all())=={'Delivered'}
  expect(cards.filter(has_text='Collection recorded').first).to_be_visible();expect(cards.filter(has_text='Recorded refunds:').first).to_be_visible()
  root.get_by_role('link',name='Cancelled',exact=True).click();expect(cards).to_have_count(18);assert set(card.get_attribute('data-status') for card in cards.all())=={'Cancelled','Rejected'}
  # Initial loading/failure/empty are distinct. Technical diagnostics stay server-side.
  mode['value']='failure';root.get_by_role('link',name='All Orders',exact=True).click();expect(root.get_by_role('alert')).to_contain_text('We couldn’t load your orders');expect(root.locator('.history-empty')).to_have_count(0);assert 'PRIVATE-TECHNICAL' not in root.inner_text()
  mode['value']='hold';root.get_by_role('button',name='Retry',exact=True).click();expect(root.get_by_role('status')).to_have_text('Loading your orders…');expect(root.locator('.history-skeleton')).to_have_count(3);page.screenshot(path=str(out/'loading-390.png'),full_page=True)
  # Ignore delayed response from an earlier filter.
  for _ in range(80):
   if mode['held']:break
   page.wait_for_timeout(25)
  mode['value']='live';root.get_by_role('link',name='Delivered',exact=True).click();expect(cards).to_have_count(9)
  for route in mode['held']:
   try:route.fulfill(status=200,content_type='application/json',body=json.dumps({'items':[],'nextCursor':None}))
   except:pass
  mode['held']=[];expect(cards).to_have_count(9)
  mode['value']='empty';root.get_by_role('button',name='Refresh orders').click();expect(root.get_by_role('heading',name='No matching orders',exact=True)).to_be_visible();root.get_by_role('link',name='View All Orders').click();expect(root.get_by_role('heading',name='No orders yet',exact=True)).to_be_visible();expect(root.get_by_role('link',name='Explore Sarees')).to_have_attribute('href','/shop');page.screenshot(path=str(out/'empty-390.png'),full_page=True)
  mode['value']='live';root.get_by_role('button',name='Refresh orders').click();expect(cards).to_have_count(25)
  # Cache cleared on sign-out even while list unmounted, then another account's data only.
  mode['value']='hold';root.get_by_role('button',name='Refresh orders').click();expect(root.locator('.history-loading-more')).to_be_visible()
  mode['value']='live'
  root.get_by_role('link',name='Back to Profile',exact=True).click();page.get_by_role('button',name='Sign out',exact=True).click();expect(page.get_by_label('Email address',exact=True)).to_be_visible();login(page,'legacy-customer@example.test');page.get_by_role('button',name='My Orders',exact=True).click();expect(cards).to_have_count(1);expect(cards.first.locator('.history-reference strong')).to_have_text('PS-'+format(100,'032X'))
  for route in mode['held']:
   try:route.fulfill(status=200,content_type='application/json',body=json.dumps({'items':[],'nextCursor':None}))
   except:pass
  expect(cards).to_have_count(1)
  assert not errors,errors
  browser.close()
 fixture('assert')
 print('Customer history browser passed: real snapshots, all filters/pages, failure/retry/stale cleanup, details return context, account isolation, four widths and bounded imagery.')
finally:fixture('cleanup')

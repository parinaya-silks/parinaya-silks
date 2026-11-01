"""Controlled loopback read failures only; no production requests or mutation replay."""
import os,copy,subprocess
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';out=Path('.cache/loading-design');out.mkdir(parents=True,exist_ok=True)
image=Path('public/assets/customer-auth-portrait.jpg').read_bytes()
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':950},reduced_motion='reduce')
 base=ctx.request.get(origin+'/api/catalog?content=store').json()
 art={'url':'https://res.cloudinary.com/parinaya-emulator/image/upload/fixture.jpg','alt':'Local banner fixture','width':800,'height':1000,'focalX':50,'focalY':50}
 base['banners']=[{'id':'local-banner','title':'Saved Banner','supportingText':'','link':'/shop','images':{'desktop':art,'mobile':art},'showButton':False}]
 mode={'get':'live','post':'live','images':'live','action':'','more':False};held=[];image_held=[];counts={};writes=[]
 def photo(r):
  if mode['images']=='hold':image_held.append(r);return
  if mode['images']=='fail':r.abort();return
  r.fulfill(status=200,content_type='image/jpeg',body=image)
 ctx.route('https://res.cloudinary.com/**',photo)
 def api(r):
  req=r.request;q=parse_qs(urlparse(req.url).query);action=(req.post_data_json or {}).get('action','') if req.method=='POST' else ''
  key=action or ('content' if 'content' in q else 'campaigns' if 'campaigns' in q else 'products');counts[key]=counts.get(key,0)+1
  if action and action not in ['shopping:get','addresses:list','orders:list','orders:get','orders:review','loyalty:account','loyalty:customerHistory','profile:syncDirectory']:writes.append(action)
  value=mode['post'] if action and (not mode['action'] or mode['action']==action) else mode['get'] if not action else 'live'
  if mode['more'] and not q.get('cursor'):value='live'
  if value=='hold':held.append(r);return
  if value=='fail':r.fulfill(status=503,json={'code':'index-required','message':'Private diagnostics omitted'});return
  if 'content' in q:r.fulfill(status=200,json=copy.deepcopy(base));return
  r.continue_()
 ctx.route('**/api/catalog*',api);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def release():
  for r in list(held):
   try:r.abort()
   except:pass
  held.clear()
 def capture(name,width):
  page.set_viewport_size({'width':width,'height':950});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,width);page.screenshot(path=str(out/(name+'-'+str(width)+'.png')))
 # Initial shell/data loading has layout-sized placeholders, never a temporary text hero.
 for width in [320,390,768,1440,1920]:
  mode['get']='hold';page.goto(origin+'/');expect(page.locator('.store-banner-skeleton')).to_be_visible();expect(page.locator('.store-products-skeleton')).to_be_visible();assert page.get_by_role('heading',name='Discover our saree collection',exact=True).count()==0
  height=page.locator('.store-banner-skeleton').bounding_box()['height'];assert height>100
  assert page.locator('.store-skeleton').first.evaluate('e=>getComputedStyle(e,"::after").animationName')=='none';capture('home-skeleton',width)
  page.evaluate("window.dispatchEvent(new Event('offline'))") # A signal alone does not falsify navigator.onLine.
  ctx.set_offline(True);expect(page.get_by_role('heading',name="You're offline.",exact=True)).to_be_visible();capture('offline',width)
  mode['get']='live';release();ctx.set_offline(False);expect(page.get_by_role('heading',name='Saved Banner',exact=True)).to_be_visible(timeout=20000);expect(page.locator('.home-product-card')).to_have_count(4,timeout=20000);capture('recovered',width)
 # Image loading reserves exactly the banner geometry; a failed image ends the shimmer.
 mode['images']='hold';page.goto(origin+'/');expect(page.get_by_role('heading',name='Saved Banner',exact=True)).to_be_visible();expect(page.locator('.home-banner-slide .store-image-placeholder')).to_be_visible();box=page.locator('.home-banner-slide').bounding_box();assert abs(box['width']/box['height']-8/3)<0.01
 for r in image_held:
  try:r.abort()
  except:pass
 image_held.clear();expect(page.locator('.home-banner-slide .store-image-fallback')).to_be_visible();assert page.locator('.home-banner-slide .store-image-placeholder').count()==0;mode['images']='live'
 # Already loaded products survive a failed refresh, and pagination retries the failed page.
 page.goto(origin+'/shop?search=local');expect(page.locator('main article')).to_have_count(50,timeout=20000);first=page.locator('main article h3').first.inner_text();page.get_by_role('button',name='Load more matching products',exact=True).click();expect(page.locator('main article')).to_have_count(100,timeout=20000)
 mode['get']='fail';mode['more']=True;page.get_by_role('button',name='Load more matching products',exact=True).click();expect(page.get_by_text('Unable to refresh. Showing the last loaded information.',exact=True)).to_be_visible();expect(page.locator('main article')).to_have_count(100);mode['get']='live';page.locator('.store-recovery').get_by_role('button',name='Retry',exact=True).click();expect(page.locator('main article')).to_have_count(150,timeout=20000);assert page.locator('main article h3').first.inner_text()==first;mode['more']=False
 # Offline retained results remain visible; reconnect refreshes the loaded extent without jumping scroll.
 page.evaluate('window.scrollTo(0,400)');ctx.set_offline(True);expect(page.locator('.store-connection-notice')).to_be_visible();expect(page.locator('main article')).to_have_count(150);ctx.set_offline(False);page.wait_for_timeout(800);expect(page.locator('main article')).to_have_count(150);assert page.evaluate('scrollY')>250
 # Online server failures are not called offline or empty; Retry retains the query.
 mode['get']='fail';page.goto(origin+'/shop?search=blue');expect(page.get_by_role('button',name='Retry products',exact=True)).to_be_visible();assert page.get_by_role('heading',name="You're offline.",exact=True).count()==0;assert page.get_by_role('heading',name='No products found.',exact=True).count()==0;mode['get']='live';page.get_by_role('button',name='Retry products',exact=True).click();expect(page.locator('main article')).to_have_count(25,timeout=20000);assert 'search=blue' in page.url
 # Slow/hanging request: slow message, finite deadline, recovery, then Retry.
 mode['get']='hold';page.goto(origin+'/shop?search=blue');expect(page.locator('.store-products-skeleton')).to_be_visible();expect(page.get_by_text('This is taking longer than usual.',exact=True)).to_be_visible(timeout=7000);expect(page.get_by_role('button',name='Retry products',exact=True)).to_be_visible(timeout=17000);assert page.locator('.store-products-skeleton').count()==0;mode['get']='live';release();page.get_by_role('button',name='Retry products',exact=True).click();expect(page.locator('main article')).to_have_count(25,timeout=20000)
 # A query navigation must not display previously loaded products under its new heading.
 mode['get']='hold';page.goto(origin+'/shop?search=red');expect(page.locator('.store-products-skeleton')).to_be_visible();page.get_by_label('Search products',exact=True).fill('blue');mode['get']='live';page.get_by_label('Search products',exact=True).press('Enter');expect(page.locator('main article')).to_have_count(25,timeout=20000);release();expect(page.locator('main article')).to_have_count(25)
 # Public detail/editorial skeletons with static navigation and Contact form still available.
 for route,kind in [('/product/local-saree-2','product'),('/about','text'),('/contact','text'),('/privacy-policy','text')]:
  mode['get']='hold';page.goto(origin+route);expect(page.locator('.store-loading-'+kind).first).to_be_visible();assert page.get_by_role('button',name='Search Catalog',exact=True).count()==1
  if route=='/contact':expect(page.get_by_label('Full Name',exact=False).first).to_be_visible()
  mode['get']='live';release()
 # Real emulator authentication; private read skeletons keep the shell and never show false empty states.
 page.goto(origin+'/login');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url('**/account')
 for route,action,kind in [('/bag','shopping:get','bag'),('/wishlist','shopping:get','products'),('/account/orders','orders:list','orders'),('/account','addresses:list','text')]:
  mode['post']='hold';mode['action']=action;page.goto(origin+route);expect(page.locator('.store-loading-'+kind).first).to_be_visible(timeout=15000);assert page.get_by_role('heading',name='Your bag is empty',exact=True).count()==0;assert page.get_by_role('heading',name='No orders yet',exact=True).count()==0;capture(kind+'-private-skeleton',390);mode['post']='live';release()
 # Bag read outage preserves loaded items, never signs out or silently retries writes.
 page.goto(origin+'/bag');expect(page.locator('[data-shopping-line]')).to_have_count(1,timeout=20000);mode['post']='fail';mode['action']='shopping:get';page.evaluate("window.dispatchEvent(new Event('online'))");expect(page.get_by_text('Unable to refresh. Showing the last loaded information.',exact=True)).to_be_visible();expect(page.locator('[data-shopping-line]')).to_have_count(1);assert page.get_by_role('heading',name='Your bag is empty',exact=True).count()==0
 mode['post']='live';page.locator('.store-recovery').get_by_role('button',name='Retry',exact=True).click();expect(page.locator('.store-recovery')).to_have_count(0);assert not writes,writes
 assert not errors,errors;ctx.close();browser.close()
print('Loading browser passed: five widths, skeleton/offline/recovery, slow images/data, finite hangs, retained refresh/pagination, query isolation, private reads and no mutation replay.')

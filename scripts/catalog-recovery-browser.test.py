"""Local-only failure recovery, independent sections and reorganized navigation."""
import os,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
labels=['Dashboard','Products','Categories','Orders','Customers','Inventory','Marketing / Sale Campaigns','Banners','Website Content','Contact Information','About Us','Customer Enquiries','Settings']
routes=['dashboard','products','categories','orders','customers','inventory','marketing','banners','website-content','contact-information','about','enquiries','settings']
headings=['Dashboard','Products & Stock','Manage Categories','Orders','Customers','Inventory','Coupons','Banners','Website Content','Contact Information','About Us','Customer Enquiries','Store Settings']
screens=Path('.cache/catalog-recovery');screens.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':900});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda route:route.abort())
 mode={'browse':True,'action':'dashboard:backlog','hold':False};requests=[];held=[]
 def catalog(route):
  req=route.request
  if req.method=='GET' and 'browse=1' in req.url:
   requests.append(req.url)
   if mode['hold'] and 'sort=newest' in req.url:held.append(route);return
   if mode['browse']:route.fulfill(status=503,json={'code':'index-required','message':'Synthetic index failure'});return
   route.fulfill(status=200,json={'items':[],'nextCursor':None});return
  if req.method=='POST' and req.post_data_json.get('action')==mode['action']:
   route.fulfill(status=503,json={'code':'index-required','message':'Synthetic index failure'});return
  route.continue_()
 ctx.route('**/api/catalog*',catalog)
 page.goto(origin+'/shop');page.get_by_text('Unable to load products.',exact=True).wait_for();expect(page.get_by_text('Count unavailable',exact=True)).to_be_visible();assert page.get_by_text('0 Sarees',exact=True).count()==0
 assert len(requests)==1,requests
 page.evaluate("window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_timeout(400);assert len(requests)==1
 # Change sort during the error then retry without clearing it.
 page.get_by_role('button',name=re.compile('SORT:',re.I)).click()
 with page.expect_response(lambda response:'browse=1' in response.url and 'sort=price-asc' in response.url and response.status==503):page.get_by_role('button',name='Price: Low to High',exact=True).click()
 page.get_by_text('Count unavailable',exact=True).wait_for()
 mode['browse']=False;page.get_by_role('button',name='Retry products',exact=True).click();page.get_by_text('No products available yet.',exact=True).wait_for();expect(page.get_by_text('0 Sarees',exact=True)).to_be_visible();assert 'sort=price-asc' in requests[-1]
 # An older request failing after a new sort succeeds cannot replace its state.
 mode['hold']=True;page.get_by_role('button',name=re.compile('SORT:',re.I)).click();page.get_by_role('button',name='Newest Arrivals',exact=True).click();page.wait_for_timeout(200);assert len(held)==1
 page.get_by_role('button',name=re.compile('SORT:',re.I)).click();page.get_by_role('button',name='Price: High to Low',exact=True).click();page.get_by_text('No products available yet.',exact=True).wait_for();held[0].fulfill(status=503,json={'code':'index-required'});page.wait_for_timeout(200);expect(page.get_by_text('0 Sarees',exact=True)).to_be_visible();assert page.get_by_text('Count unavailable',exact=True).count()==0
 page.goto(origin+'/admin/dashboard');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
 page.get_by_text('Unable to load current backlog and COD amounts. Please try again.',exact=True).wait_for();page.get_by_text(re.compile('Showing up to 5 low-stock variants')).wait_for();expect(page.locator('[data-metric="COD to Collect"]')).to_have_text('\u2014')
 page.screenshot(path=str(screens/'dashboard-report-failure.png'),full_page=True)
 mode['action']='inventory:low';page.reload();page.get_by_text('Unable to load low stock. Please try again.',exact=True).wait_for();page.get_by_role('heading',name='COD to Collect',exact=True).wait_for()
 mode['action']='';page.reload();page.get_by_role('heading',name='Dashboard',exact=True).wait_for()
 nav=page.get_by_role('navigation',name='Admin Navigation',exact=True);assert nav.locator('button > span:last-child').all_text_contents()==labels
 for route,heading in zip(routes,headings):
  page.goto(origin+'/admin/'+route);page.get_by_role('heading',name=heading,exact=True).first.wait_for();page.reload();page.get_by_role('heading',name=heading,exact=True).first.wait_for();expect(page.get_by_role('navigation',name='Admin Navigation',exact=True).locator('[aria-current="page"]')).to_contain_text(labels[routes.index(route)])
 page.goto(origin+'/admin/coupons');page.get_by_role('heading',name='Coupons',exact=True).wait_for();expect(page.get_by_role('navigation',name='Admin Navigation',exact=True).locator('[aria-current="page"]')).to_contain_text('Marketing / Sale Campaigns')
 page.goto(origin+'/admin/banners');page.get_by_role('navigation',name='Admin Navigation',exact=True).get_by_role('button',name=re.compile('Website Content')).click();page.get_by_role('heading',name='Website Content',exact=True).wait_for();page.go_back();page.get_by_role('heading',name='Banners',exact=True).wait_for()
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':760});page.goto(origin+'/admin/dashboard');page.get_by_role('heading',name='COD to Collect',exact=True).wait_for();assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  if width<1024:
   page.get_by_role('button',name='Open admin menu',exact=True).click();mobile=page.get_by_role('navigation',name='Mobile Admin Navigation',exact=True);assert mobile.locator('button > span:last-child').all_text_contents()==labels
   mobile.get_by_role('button',name=re.compile('Inventory')).click();page.get_by_role('heading',name='Inventory',exact=True).wait_for();assert mobile.count()==0
   page.get_by_role('button',name='Open admin menu',exact=True).click();expect(page.get_by_role('navigation',name='Mobile Admin Navigation',exact=True).locator('[aria-current="page"]')).to_contain_text('Inventory');page.get_by_role('button',name='Close admin menu',exact=True).click()
  page.screenshot(path=str(screens/f'admin-{width}.png'),full_page=True)
 assert not errors,errors
 browser.close();print('Catalog recovery browser passed: unknown/empty counts, manual retry retains sort, no focus retry loop, independent dashboard failures, 13 direct routes/refresh/alias/back and desktop/mobile navigation.')

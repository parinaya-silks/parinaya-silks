"""Rendered product sizing/category regressions using loopback fixtures only."""
import base64,json,os,re,subprocess,sys
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
before='--before' in sys.argv
origin='http://127.0.0.1:3100';out=Path('.cache/product-presentation');out.mkdir(parents=True,exist_ok=True)
def fixture(action):subprocess.run(['node','--import','tsx','scripts/homepage-fixture-control.ts',action],check=True,capture_output=True)
def clean_shopping():subprocess.run(['node','--import','tsx','scripts/shopping-fixture-control.ts','cleanup'],check=True,capture_output=True)
clean_shopping()
fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':900});ctx.route('https://**/*',lambda r:r.abort())
  def media(route):
   name=route.request.url.rsplit('/',1)[1].replace('home-','').replace('.jpg','');file=Path('.cache/home-assets/'+name+'.jpg')
   if not file.exists():file=Path('public/assets/customer-auth-portrait.jpg')
   if file.exists():
    # Code-native SVG fixture supplies the real catalogue's 960x1280 intrinsic
    # size around cached sample photography; never alters saved media.
    data=base64.b64encode(file.read_bytes()).decode()
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1280"><image width="960" height="1280" preserveAspectRatio="xMidYMid meet" href="data:image/jpeg;base64,{data}"/></svg>'
    route.fulfill(status=200,content_type='image/svg+xml',body=svg)
   else:route.abort()
  ctx.route('https://res.cloudinary.com/parinaya-emulator/image/upload/home-*',media)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));mode={'count':4,'long':False,'missing':False}
  def api(route):
   if route.request.method!='GET':route.continue_();return
   q=parse_qs(urlparse(route.request.url).query)
   if 'slug' in q:
    value=route.fetch().json()
    if not before and q['slug']==['home-saree-0']:
     value['images'].append({**value['images'][0],'mediaId':'e'*32,'url':value['images'][0]['url'].replace('home-5','home-6'),'alt':'Alternate fixture photograph'})
    route.fulfill(status=200,json=value);return
   if q and 'browse' not in q:route.continue_();return
   value=route.fetch().json();value['items']=value.get('items',[])[:mode['count']]
   if mode['long']:
    for record in value['items']:record['name']='A very long recorded saree name '+('Handwoven ' * 20);record['categoryName']='An exceptionally long category display name '+('Collection ' * 15)
   if mode['missing']:
    for record in value['items']:record['categoryName']=''
   route.fulfill(status=200,json=value)
  page.route('**/api/catalog*',api)
  def parts():
   image=page.locator('main img').first
   section=page.get_by_role('heading',name='You May Also Like',exact=True).locator('../../..')
   track=section.locator(':scope > div').nth(1)
   return image,section,track,track.locator(':scope > *')
  def shot(name,locator=None):
   if locator:locator.scroll_into_view_if_needed()
   else:page.evaluate('scrollTo(0,0)')
   page.evaluate('document.activeElement.blur()');page.screenshot(path=str(out/f'{"before" if before else "after"}-{name}.png'))
  metrics=[]
  for width in [320,390,768,1440,1920]:
   page.set_viewport_size({'width':width,'height':900});page.goto(origin+'/product/home-saree-0');expect(page.get_by_role('heading',name='You May Also Like',exact=True)).to_be_visible()
   image,section,track,cards=parts();expect(cards).to_have_count(3);expect(image).to_have_js_property('complete',True)
   expect(image).to_have_js_property('naturalWidth',960)
   row={'width':width,'gallery':image.locator('..').bounding_box(),'card':cards.first.bounding_box(),'image':cards.first.locator('img').bounding_box(),'computed':cards.first.evaluate("el=>({width:getComputedStyle(el).width,minWidth:getComputedStyle(el).minWidth,flexBasis:getComputedStyle(el).flexBasis,shrink:getComputedStyle(el).flexShrink,naturalWidth:el.querySelector('img').naturalWidth,naturalHeight:el.querySelector('img').naturalHeight})")};metrics.append(row)
   if width==390:shot('mobile-gallery');shot('mobile-recommendations',section)
   if width==1440:shot('desktop-recommendations',section)
   if not before:
    gallery=row['gallery'];assert abs(gallery['height']/gallery['width']-4/3)<.005,row
    if width==390:assert 320<=gallery['width']<=345 and 425<=gallery['height']<=460,row
    if width>=1440:assert 420<=gallery['width']<=480,row
    assert gallery['width']<=width-32,row
    assert image.evaluate("el=>getComputedStyle(el).objectFit")=='contain'
    card=row['card'];assert (160<=card['width']<=175 if width==390 else 220<=card['width']<=260 if width>=768 else card['width']<160),row
    assert abs(row['image']['height']/row['image']['width']-4/3)<.005,row
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
    assert cards.first.locator('img').evaluate("el=>getComputedStyle(el).objectFit")=='contain'
    expect(cards.first.locator('.recommendation-category')).to_have_text('Pure Organza')
    expect(page.get_by_role('button',name='Close zoom modal')).to_have_count(0)
    thumbs=page.locator('.product-gallery > div').nth(1).get_by_role('button');expect(thumbs).to_have_count(2);thumbs.nth(1).click();expect(image).to_have_attribute('src',re.compile('home-6'));thumbs.first.click();expect(image).to_have_attribute('src',re.compile('home-5'))
    page.get_by_role('button',name='Zoom image',exact=True).click();expect(page.get_by_role('button',name='Close zoom modal')).to_be_visible();page.get_by_role('button',name='Close zoom modal').click()
    buy=page.get_by_role('button',name='Buy Now',exact=True).bounding_box();nav=page.get_by_role('navigation',name='Mobile Bottom Navigation')
    if nav.is_visible():assert buy['y']+buy['height']<=nav.bounding_box()['y']+1
    root=page.get_by_role('navigation',name='Breadcrumb').locator('..');padding=root.evaluate('el=>parseFloat(getComputedStyle(el).paddingBottom)');assert padding<=180
  (out/f'{"before" if before else "after"}-metrics.json').write_text(json.dumps(metrics,indent=2))
  page.set_viewport_size({'width':390,'height':900});page.goto(origin+'/shop');expect(page.locator('main article')).to_have_count(4);shot('shop-categories',page.locator('main article').first)
  if not before:
   first=page.locator('main article').first;expect(first.locator('.shop-product-category')).to_have_text('Kanjeevaram');assert 'Pure Zari Weave' not in first.inner_text()
   expect(first.locator('.shop-product-art')).not_to_contain_text('Kanjeevaram');expect(first.get_by_role('button',name='Save ',exact=False)).to_be_visible();expect(first).to_contain_text('16,200');expect(first).to_contain_text('18,500')
   for count,long,missing in [(2,False,False),(4,True,False),(4,False,True)]:
    mode.update(count=count,long=long,missing=missing)
    for width in [320,390,768,1440,1920]:
     page.set_viewport_size({'width':width,'height':900});page.goto(origin+'/product/home-saree-0');image,section,track,cards=parts();expect(cards).to_have_count(count-1)
     assert cards.first.bounding_box()['width']<=260;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
     if missing:expect(cards.first.locator('.recommendation-category')).to_have_count(0)
    page.goto(origin+'/shop');expect(page.locator('main article')).to_have_count(count);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    if missing:expect(page.locator('.shop-product-category')).to_have_count(0);assert 'undefined' not in page.locator('main').first.inner_text()
   mode.update(count=4,long=False,missing=False);page.goto(origin+'/product/home-saree-0');_,_,_,cards=parts();cards.first.click();page.wait_for_url('**/product/home-saree-1')
   page.goto(origin+'/shop');first=page.locator('main article').first;first.get_by_role('button',name='Save ',exact=False).click();page.wait_for_url('**/login?returnTo=*');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url('**/shop');first=page.locator('main article').first;expect(first.get_by_role('button',name='Save ',exact=False)).to_have_attribute('aria-pressed','true');first.get_by_role('button',name='Add to Bag',exact=True).click();expect(page.get_by_text('Added to your bag.',exact=True)).to_be_visible()
   page.goto(origin+'/collections/home-category-0');expect(page.locator('main article')).to_have_count(1);expect(page.locator('.shop-product-category')).to_have_text('Kanjeevaram');expect(page.locator('.shop-product-art')).not_to_contain_text('Kanjeevaram')
  assert not errors,errors;browser.close()
 print('Product presentation '+('baseline captured' if before else 'passed: five widths, gallery/zoom, one/multiple/long recommendations, containment, category placement/missing data, wishlist/login, bag and navigation.'))
finally:fixture('cleanup');clean_shopping()

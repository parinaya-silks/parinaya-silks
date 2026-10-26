"""Homepage visual and shopping checks; backend mutations are loopback fixtures only."""
import os,subprocess,json,re
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/homepage-design');screens.mkdir(parents=True,exist_ok=True)
def fixture(action):subprocess.run(['node','--import','tsx','scripts/homepage-fixture-control.ts',action],check=True,capture_output=True)
fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort())
  def media(route):
   name=route.request.url.rsplit('/',1)[1].replace('home-','').replace('.jpg','');file=Path('.cache/home-assets/'+name+'.jpg')
   if name in ['desktop','mobile']:file=Path('.cache/home-assets/bg-0.jpg')
   if file.exists():route.fulfill(status=200,content_type='image/jpeg',body=file.read_bytes())
   else:route.abort()
  ctx.route('https://res.cloudinary.com/parinaya-emulator/image/upload/home-*',media)
  page=ctx.new_page();errors=[];requests=[];mode={'content':'normal','products':'normal','campaigns':'normal'}
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
  def api(route):
   if route.request.method!='GET':route.continue_();return
   q=parse_qs(urlparse(route.request.url).query)
   kind='content' if q.get('content')==['store'] else 'campaigns' if 'campaigns' in q else 'products' if q.get('browse')==['1'] and not 'campaign' in q else None
   if not kind or mode[kind]=='normal':route.continue_();return
   selected=mode[kind]
   if selected=='error':route.fulfill(status=503,json={'code':'unavailable'});return
   value=route.fetch().json()
   if kind=='content':
    if selected=='zero':value['banners']=[]
    elif selected=='one':value['banners']=value['banners'][:1]
    elif selected=='artwork':value['banners']=value['banners'][:1];value['banners'][0].update({'title':'','supportingText':'','showButton':False,'link':''})
    elif selected=='long':value['banners'][0]['title']='A very long approved banner title with meaningful wrapping across small screens';value['banners'][0]['supportingText']='A supporting paragraph with many words to test reading and access to the saved call to action.'
   elif selected=='empty':value['items']=[];value['nextCursor']=None
   elif selected=='long' and kind=='products':value['items'][0]['name']='A very long traditional Kanchipuram handwoven saree product title with many carefully recorded details'
   route.fulfill(status=200,json=value)
  page.route('**/api/catalog?*',api);page.goto(origin+'/');expect(page.locator('[data-home-product]')).to_have_count(4);expect(page.get_by_role('region',name='Homepage promotions')).to_be_visible();expect(page.get_by_role('navigation',name='Featured collections')).to_be_visible();expect(page.locator('.home-campaign')).to_have_count(3);expect(page.locator('.home-spotlight')).to_be_visible();expect(page.locator('.home-story')).to_be_visible()
  expect(page.locator('.home-banner-slide img')).to_have_attribute('src',re.compile('home-mobile'))
  assert not any('home-desktop.jpg' in x for x in requests),'Mobile must not download desktop hero'
  art=page.locator('.home-product-art').first.bounding_box();assert abs(art['height']/art['width']-4/3)<0.02
  assert not any(x in page.locator('.home-footer').inner_text() for x in ['UPI','Visa','No COD','100% Online'])
  assert not any('loyalty:' in x for x in requests)
  header=page.locator('.storefront-header');nav=page.get_by_role('navigation',name='Mobile Bottom Navigation');expect(nav.get_by_role('button')).to_have_count(5)
  expect(header.get_by_role('button',name='Wishlist',exact=True)).not_to_be_visible();expect(header.get_by_role('button',name='Shopping Bag',exact=True)).not_to_be_visible()
  page.get_by_role('button',name='Open Navigation Drawer',exact=True).click();dialog=page.get_by_role('dialog',name='Store navigation',exact=True);expect(dialog).to_be_visible();assert page.evaluate('document.body.style.overflow')=='hidden';page.keyboard.press('Shift+Tab');assert dialog.evaluate('(el)=>el.contains(document.activeElement)');page.keyboard.press('Escape');expect(dialog).to_have_count(0);expect(page.get_by_role('button',name='Open Navigation Drawer')).to_be_focused();assert page.evaluate('document.body.style.overflow')!='hidden'
  for width in [320,390,768,1024,1440,1920]:
   page.set_viewport_size({'width':width,'height':900});page.wait_for_timeout(100);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
   for element in page.locator('.home-page a,.home-page button').all():
    if element.is_visible():assert element.evaluate('(el)=>el.getBoundingClientRect().right<=innerWidth+1 || el.closest(".home-category-rail")!==null'),width
   if width<768:
    expect(nav).to_be_visible();float_box=page.get_by_role('link',name='Chat on WhatsApp',exact=True).bounding_box();assert float_box['y']+float_box['height']<=nav.bounding_box()['y']
   else:expect(nav).not_to_be_visible()
   page.screenshot(path=str(screens/f'home-{width}.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':900});page.route('**/home-mobile.jpg',lambda route:route.abort());page.reload();expect(page.locator('.home-banner-slide img')).to_have_attribute('src',re.compile('home-desktop'));page.unroute('**/home-mobile.jpg');page.reload();expect(page.locator('.home-banner-slide img')).to_have_attribute('src',re.compile('home-mobile'));page.get_by_role('button',name='Show banner 2').click();expect(page.get_by_role('group',name='2 of 2',exact=True)).to_be_visible();page.get_by_role('button',name='Previous banner').click();expect(page.get_by_role('group',name='1 of 2',exact=True)).to_be_visible()
  for state in ['one','zero','artwork','long']:
   mode['content']=state;page.reload();expect(page.locator('[data-home-product]')).to_have_count(4)
   if state=='zero':expect(page.locator('.home-hero-empty')).to_be_visible();expect(page.get_by_role('region',name='Homepage promotions')).to_have_count(0)
   else:expect(page.get_by_role('region',name='Homepage promotions')).to_be_visible()
   if state=='one':expect(page.get_by_role('button',name='Next banner')).to_have_count(0)
   if state=='artwork':expect(page.locator('.home-banner-overlay')).to_have_count(0)
   if state=='long':assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');page.locator('.home-banner-cta').click();page.wait_for_url('**/shop')
  mode['content']='error';page.goto(origin+'/');expect(page.get_by_role('button',name='Retry homepage content')).to_be_visible();expect(page.locator('[data-home-product]')).to_have_count(4);mode['content']='normal';page.get_by_role('button',name='Retry homepage content').click();expect(page.get_by_role('region',name='Homepage promotions')).to_be_visible()
  mode['products']='error';page.reload();expect(page.get_by_role('button',name='Retry products',exact=True)).to_be_visible();expect(page.locator('.home-campaign')).to_have_count(3);mode['products']='normal';page.get_by_role('button',name='Retry products',exact=True).click();expect(page.locator('[data-home-product]')).to_have_count(4)
  mode['products']='long';page.reload();expect(page.locator('[data-home-product]').first).to_contain_text('A very long traditional');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');mode['products']='empty';mode['campaigns']='empty';page.reload();expect(page.get_by_text('No products available yet.',exact=True)).to_be_visible();expect(page.locator('.home-curations')).to_have_count(0);mode['products']='normal';mode['campaigns']='error';page.reload();expect(page.get_by_role('button',name='Retry collections')).to_be_visible();mode['campaigns']='normal';page.get_by_role('button',name='Retry collections').click();expect(page.locator('.home-campaign')).to_have_count(3)
  first=page.locator('[data-home-product]').first;first.get_by_role('button',name='Save to wishlist:',exact=False).click();page.wait_for_url('**/login?returnTo=*');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url(origin+'/');first=page.locator('[data-home-product]').first;expect(first.get_by_role('button',name='Remove from wishlist:',exact=False)).to_be_visible(timeout=20000);first.get_by_role('button',name='Add to Bag',exact=True).dblclick();expect(page.get_by_text('Added to your bag.',exact=True)).to_be_visible();expect(nav.get_by_role('button',name='Bag',exact=False).locator('b')).to_have_text('1');page.get_by_role('button',name='Dismiss',exact=True).click();expect(page.locator('[data-home-product]').last.get_by_role('button',name='Out of stock')).to_be_disabled()
  page.locator('[data-home-product]').nth(1).get_by_role('button',name='Choose colour',exact=True).click();page.wait_for_url('**/product/home-saree-1?select=colour');page.goto(origin+'/');page.get_by_role('button',name='Search Catalog',exact=True).click();page.get_by_label('Search sarees',exact=True).fill('Crimson');page.locator('.storefront-search').get_by_role('button',name='Search',exact=True).click();page.wait_for_url('**/shop?search=Crimson');page.goto(origin+'/account');page.get_by_role('button',name='Sign out',exact=True).click();page.goto(origin+'/');expect(page.locator('[data-home-product]').first.get_by_role('button',name='Save to wishlist:',exact=False)).to_be_visible();assert not errors,errors;browser.close()
 print('Homepage browser passed: six widths, hero zero/one/multiple/artwork/long states, section errors/empty/retry, drawer keyboard/scroll locking, actual guest intent/login, wishlist/bag counts and duplicate protection, variants, stock, search and sign-out isolation.')
finally:fixture('cleanup')

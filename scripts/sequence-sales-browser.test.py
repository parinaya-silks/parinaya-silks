"""Shared active campaigns, linked hero and responsive navigation; synthetic loopback data only."""
import os,subprocess,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action):subprocess.run(['node','--import','tsx','scripts/homepage-fixture-control.ts',action],check=True,capture_output=True)
fixture('cleanup');fixture('seed');origin='http://127.0.0.1:3100';out=Path('.cache/sequence-sales');out.mkdir(parents=True,exist_ok=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':900})
  ctx.route('https://**/*',lambda route:route.abort())
  def media(route):
   asset=Path('.cache/home-assets/bg-0.jpg')
   if asset.exists():route.fulfill(status=200,content_type='image/jpeg',body=asset.read_bytes())
   else:route.abort()
  ctx.route('https://res.cloudinary.com/**',media)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});page.goto(origin+'/')
   expect(page.locator('[aria-label="Show banner 5"]')).to_be_visible();expect(page.locator('.home-curations')).to_have_count(0)
   hero=page.locator('.home-banner-slide');box=hero.bounding_box();assert abs(box['height']/box['width']-(1.25 if width<768 else .375))<.006
   expect(hero.locator('a')).to_have_attribute('href','/shop')
   page.get_by_role('button',name='Next banner',exact=True).click();assert page.url==origin+'/'
   page.get_by_role('button',name='Pause',exact=True).click();assert page.url==origin+'/'
   page.get_by_role('button',name='Show banner 3',exact=True).click();expect(hero.locator('a')).to_have_attribute('href','/sale/home-campaign-0')
   hero.locator('a').focus();page.keyboard.press('Enter');page.wait_for_url('**/sale/home-campaign-0');expect(page.locator('#campaign-products article')).to_have_count(1)
   page.goto(origin+'/sale');expect(page.locator('.campaign-offers>div>a')).to_have_count(3);expect(page.locator('main article')).to_have_count(0)
   page.goto(origin+'/');page.get_by_role('button',name='Open Navigation Drawer',exact=True).click();drawer=page.get_by_role('dialog',name='Store navigation');expect(drawer.get_by_role('link',name='Sale',exact=True)).to_have_attribute('href','/sale')
   labels=drawer.locator('nav a').all_text_contents();assert labels[:5]==['Home','Shop Sarees','Sale','About Us','Contact Us'],labels
   page.keyboard.press('Escape');expect(drawer).not_to_be_visible();assert page.url==origin+'/'
   if width<1024:assert page.locator('.storefront-bottom-nav button').count()==5
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   expect(page.locator('.customer-storefront')).to_have_css('background-color','rgb(188, 134, 146)')
   page.screenshot(path=str(out/f'home-{width}.png'),full_page=True)
  page.set_viewport_size({'width':390,'height':900});page.goto(origin+'/');page.get_by_role('button',name='Show banner 1',exact=True).click()
  hero=page.locator('.home-banner-slide');hero.evaluate("""el=>{for(const [type,key,x] of [['touchstart','touches',280],['touchmove','touches',70],['touchend','changedTouches',70]]){const event=new Event(type,{bubbles:true});Object.defineProperty(event,key,{value:[{clientX:x,clientY:180}]});el.dispatchEvent(event);}}""");expect(page.get_by_role('button',name='Show banner 2',exact=True)).to_have_attribute('aria-current','true');hero.locator('a').evaluate('el=>el.click()');assert page.url==origin+'/'
  page.wait_for_timeout(550);hero.locator('a').click();page.wait_for_url('**/shop')
  # Mock only public GET metadata: schedule activation and expiration at server-relative boundaries.
  timeline={'mode':'expiry','start':time.time()}
  def campaigns(route):
   value=route.fetch().json();now=int(time.time()*1000);elapsed=time.time()-timeline['start'];value['serverNow']=now
   if timeline['mode']=='empty':value.update(items=[],nextBoundary=None)
   elif timeline['mode']=='expiry':
    if elapsed<2:value['items']=value['items'][:1];value['items'][0]['endsAt']=int((timeline['start']+2)*1000);value['nextBoundary']=value['items'][0]['endsAt']
    else:value.update(items=[],nextBoundary=None)
   else:
    if elapsed<2:value.update(items=[],nextBoundary=int((timeline['start']+2)*1000))
    else:value.update(items=value['items'][:1],nextBoundary=None)
   route.fulfill(status=200,json=value)
  page.route('**/api/catalog?campaigns=1',campaigns);timeline['start']=time.time();page.goto(origin+'/');expect(page.get_by_role('button',name='Show banner 3',exact=True)).to_be_visible();expect(page.get_by_role('button',name='Show banner 3',exact=True)).not_to_be_visible(timeout=8000)
  page.get_by_role('button',name='Open Navigation Drawer',exact=True).click();expect(page.get_by_role('dialog').get_by_role('link',name='Sale',exact=True)).to_have_count(0);page.keyboard.press('Escape')
  timeline.update(mode='scheduled',start=time.time());page.reload();expect(page.get_by_role('button',name='Show banner 3',exact=True)).not_to_be_visible();expect(page.get_by_role('button',name='Show banner 3',exact=True)).to_be_visible(timeout=8000)
  page.goto(origin+'/sale/no-such-campaign');expect(page.get_by_role('heading',name='Campaign unavailable',exact=True)).to_be_visible();expect(page.locator('.campaign-storefront').get_by_role('button',name='Shop Sarees',exact=True)).to_be_visible()
  assert not errors,errors;browser.close()
 print('Sequence/Sale storefront passed: linked regular/campaign heroes, deduped placement, Sale overview and scoped products, empty/activation/expiry, unavailable direct route, keyboard, swipe/control isolation, 320/390/768/1440px, maroon and five bottom tabs preserved.')
finally:fixture('cleanup')

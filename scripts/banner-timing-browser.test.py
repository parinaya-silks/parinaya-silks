import os,copy
from datetime import datetime,timezone,timedelta
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
if os.environ.get('FIRESTORE_EMULATOR_HOST')!='127.0.0.1:8080' or os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')!='127.0.0.1:9099':raise RuntimeError('Loopback emulators required')
origin='http://127.0.0.1:3100';image=Path('public/assets/customer-auth-portrait.jpg').read_bytes()
with sync_playwright() as p:
 browser=p.chromium.launch()
 # Deterministic virtual-clock carousel checks, without real waits or live media writes.
 ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='no-preference');ctx.route('https://res.cloudinary.com/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=image));settings={'seconds':None,'count':3}
 base=ctx.request.get(origin+'/api/catalog?content=store').json()
 def banners(r):
  if 'content=store' not in r.request.url:r.continue_();return
  value=copy.deepcopy(base);art={'url':'https://res.cloudinary.com/parinaya-emulator/image/upload/fixture.jpg','alt':'Local timing fixture','width':800,'height':1000,'focalX':50,'focalY':50};value['banners']=[{'id':str(i),'title':'Local Banner '+str(i),'link':'/shop','images':{'desktop':art,'mobile':art},'showButton':False} for i in range(settings['count'])];value['bannerSeconds']=settings['seconds'];r.fulfill(status=200,json=value)
 ctx.route('**/api/catalog?*',banners);page=ctx.new_page();page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1));page.goto(origin+'/');slides=page.locator('.home-banner-carousel [aria-roledescription=slide]');expect(slides).to_have_attribute('aria-label','1 of 3');page.clock.run_for(2999);expect(slides).to_have_attribute('aria-label','1 of 3');page.clock.run_for(1);expect(slides).to_have_attribute('aria-label','2 of 3')
 settings['seconds']=6;page.evaluate("window.dispatchEvent(new Event('focus'))");page.wait_for_timeout(100);page.clock.run_for(5999);expect(slides).to_have_attribute('aria-label','2 of 3');page.clock.run_for(1);expect(slides).to_have_attribute('aria-label','3 of 3')
 page.get_by_role('button',name='Previous banner',exact=True).click();page.mouse.move(0,0);page.evaluate('document.activeElement.blur()');expect(slides).to_have_attribute('aria-label','2 of 3');page.clock.run_for(5999);expect(slides).to_have_attribute('aria-label','2 of 3');page.clock.run_for(1);expect(slides).to_have_attribute('aria-label','3 of 3')
 page.get_by_role('button',name='Pause',exact=True).click();page.mouse.move(0,0);page.evaluate('document.activeElement.blur()');page.clock.run_for(10000);expect(slides).to_have_attribute('aria-label','3 of 3')
 page.get_by_role('button',name='Play',exact=True).click();page.evaluate('document.activeElement.blur()');page.mouse.move(0,0);page.locator('.home-banner-carousel').hover();page.clock.run_for(10000);expect(slides).to_have_attribute('aria-label','3 of 3');page.mouse.move(0,0);page.clock.run_for(5999);expect(slides).to_have_attribute('aria-label','3 of 3');page.clock.run_for(1);expect(slides).to_have_attribute('aria-label','1 of 3')
 page.get_by_role('button',name='Next banner',exact=True).focus();page.clock.run_for(10000);expect(slides).to_have_attribute('aria-label','1 of 3');page.evaluate('document.activeElement.blur()')
 page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))");page.clock.run_for(10000);expect(slides).to_have_attribute('aria-label','1 of 3');page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))");page.clock.run_for(5999);expect(slides).to_have_attribute('aria-label','1 of 3');page.clock.run_for(1);expect(slides).to_have_attribute('aria-label','2 of 3')
 page.emulate_media(reduced_motion='reduce');page.clock.run_for(20);expect(page.locator('.home-banner-carousel')).to_have_attribute('data-autoplay','false');page.clock.run_for(10000);expect(slides).to_have_attribute('aria-label','2 of 3');page.emulate_media(reduced_motion='no-preference');page.clock.run_for(20)
 settings['count']=2;page.evaluate("window.dispatchEvent(new Event('focus'))");expect(slides).to_have_attribute('aria-label','1 of 2');page.clock.run_for(5999);expect(slides).to_have_attribute('aria-label','1 of 2');page.clock.run_for(1);expect(slides).to_have_attribute('aria-label','2 of 2')
 page.goto(origin+'/contact');page.clock.run_for(10000);assert page.locator('.home-banner-carousel').count()==0
 settings['count']=1;page.goto(origin+'/');expect(slides).to_have_attribute('aria-label','1 of 1');page.clock.run_for(10000);expect(slides).to_have_attribute('aria-label','1 of 1');assert page.get_by_role('button',name='Next banner',exact=True).count()==0
 settings['count']=0;page.goto(origin+'/');assert page.locator('.home-banner-carousel').count()==0
 ctx.close();browser.close()
print('Banner timing browser passed: default, saved and full manual intervals, pause, no single/empty autoplay and unmount cleanup.')

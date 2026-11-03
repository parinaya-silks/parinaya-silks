"""Social navigation layout against loopback fixtures; never open external apps."""
import copy,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';out=Path('.cache/social-drawer');out.mkdir(parents=True,exist_ok=True)
before=os.environ.get('PARINAYA_SOCIAL_BEFORE')=='1';phase='before' if before else 'after'
widths=[320,390,430,768,1024,1440]
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
 ctx.route('https://**/*',lambda r:r.abort());ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
 base=ctx.request.get(origin+'/api/catalog?content=store').json();settings={'social':'valid'}
 def content(route):
  value=copy.deepcopy(base);art={'url':'https://res.cloudinary.com/parinaya-emulator/image/upload/social-banner.jpg','alt':'Local banner layout fixture','width':800,'height':1000,'focalX':50,'focalY':42}
  value['banners']=[{'id':str(i),'title':'A considered collection '+str(i+1),'supportingText':'Local layout fixture','link':'/shop','images':{'desktop':{**art,'width':1600,'height':600},'mobile':art},'showButton':False} for i in range(2)]
  value['bannerSeconds']=6;value['contact'].update({'instagram':'https://www.instagram.com/local_fixture/','facebook':'https://www.facebook.com/local_fixture/','whatsappEnabled':True,'whatsappNumber':'+919876543210'})
  if settings['social']=='empty':value['contact'].update({'instagram':'','facebook':''})
  if settings['social']=='invalid':value['contact'].update({'instagram':'https://instagram.com.attacker.test/private','facebook':'javascript:alert(1)'})
  if settings['social']=='one':value['contact'].update({'facebook':''})
  route.fulfill(status=200,json=value)
 ctx.route('**/api/catalog?content=store',content);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));metrics={}
 def geometry():
  return page.evaluate("""()=>{const b=document.querySelector('.home-banner-slide'),h=document.querySelector('.storefront-header'),img=b.querySelector('img'),r=b.getBoundingClientRect(),hr=h.getBoundingClientRect();return {header:{x:hr.x,y:hr.y,width:hr.width,height:hr.height,bottom:hr.bottom},banner:{x:r.x,y:r.y,width:r.width,height:r.height},fit:getComputedStyle(img).objectFit,position:getComputedStyle(img).objectPosition,duration:document.querySelector('.home-banner-carousel').dataset.durationMs}}""")
 for width in widths:
  page.set_viewport_size({'width':width,'height':900});page.goto(origin+'/');expect(page.locator('.home-banner-slide img')).to_be_visible();expect(page.locator('.home-banner-slide img')).to_have_js_property('complete',True)
  expect(page.get_by_role('navigation',name='Follow Parinaya Sarees',exact=True)).to_be_visible() if before else None
  metrics[str(width)]=geometry();page.screenshot(path=str(out/f'{phase}-home-{width}.png'))
  if before:
   if width<768:page.get_by_role('button',name='Follow Us',exact=True).click();page.screenshot(path=str(out/f'before-expanded-{width}.png'))
   continue
  expected_ratio=4/5 if width<768 else 8/3
  assert metrics[str(width)]['header']['height']==(64 if width<768 else 72)
  assert metrics[str(width)]['fit']=='cover' and metrics[str(width)]['position']=='50% 42%'
  assert metrics[str(width)]['duration']=='6000'
  assert abs(metrics[str(width)]['banner']['width']/metrics[str(width)]['banner']['height']-expected_ratio)<.01
  assert abs(metrics[str(width)]['banner']['y']-metrics[str(width)]['header']['bottom'])<=1,(width,metrics[str(width)])
  assert page.get_by_role('button',name='Follow Us',exact=True).count()==0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  if width<=1100:expect(page.locator('.public-floating-social')).not_to_be_visible()
  else:
   floating=page.get_by_role('navigation',name='Follow Parinaya Sarees',exact=True);expect(floating).to_be_visible();assert floating.locator('a').count()==2
   placement=floating.evaluate('el=>({position:getComputedStyle(el).position,right:getComputedStyle(el).right,top:getComputedStyle(el).top})');assert placement=={'position':'fixed','right':'12px','top':'387px'},placement
  # A selected slide and its DOM node must survive drawer state changes.
  page.get_by_role('button',name='Show banner 2',exact=True).click();page.evaluate('window.socialBannerNode=document.querySelector(".home-banner-carousel")');snapshot=geometry()
  page.get_by_role('button',name='Open Navigation Drawer',exact=True).click();drawer=page.get_by_role('dialog',name='Store navigation',exact=True);expect(drawer).to_be_visible()
  assert geometry()==snapshot,(width,'underlying banner shifted');assert page.evaluate('window.socialBannerNode===document.querySelector(".home-banner-carousel")')
  expect(page.locator('.home-banner-carousel [aria-roledescription=slide]')).to_have_attribute('aria-label','2 of 2')
  social=drawer.get_by_role('region',name='Follow Us',exact=True)
  if width<=1100:
   expect(social).to_be_visible();expect(social.get_by_role('link')).to_have_count(2)
   for label,host in [('Instagram','instagram.com'),('Facebook','facebook.com')]:
    link=social.get_by_role('link',name='Follow us on '+label,exact=True);assert host in link.get_attribute('href');assert link.get_attribute('target')=='_blank';assert link.get_attribute('rel')=='noopener noreferrer';assert link.bounding_box()['height']>=44
   social.scroll_into_view_if_needed();page.screenshot(path=str(out/f'after-drawer-{width}.png'))
   social.get_by_role('link').last.focus();page.keyboard.press('Tab');assert drawer.evaluate('el=>el.contains(document.activeElement)')
  else:expect(social).to_have_count(0)
  page.keyboard.press('Escape');expect(drawer).not_to_be_visible();expect(page.get_by_role('button',name='Open Navigation Drawer')).to_be_focused();assert geometry()==snapshot
  page.get_by_role('button',name='Open Navigation Drawer').click();page.get_by_role('button',name='Close Navigation Drawer',exact=True).click();expect(drawer).not_to_be_visible();assert geometry()==snapshot
  page.get_by_role('button',name='Open Navigation Drawer').click();page.locator('.storefront-drawer-backdrop').click(position={'x':width-1,'y':10},force=True);expect(drawer).not_to_be_visible()
 if not before:
  # Optional pre-change capture supports this handoff; a clean checkout must also run independently.
  if (out/'before-metrics.json').exists():
   previous=json.loads((out/'before-metrics.json').read_text())
   for w,m in metrics.items():
    assert m['header']==previous[w]['header'],(w,'header changed');assert m['banner']['width']==previous[w]['banner']['width'];assert m['banner']['height']==previous[w]['banner']['height'];assert m['fit']==previous[w]['fit'];assert m['position']==previous[w]['position'];assert m['duration']==previous[w]['duration']
  for mode,count in [('empty',0),('invalid',0),('one',1)]:
   settings['social']=mode
   for width in [390,1024,1440]:
    page.set_viewport_size({'width':width,'height':540});page.goto(origin+'/');expect(page.locator('.home-banner-slide img')).to_be_visible();page.get_by_role('button',name='Open Navigation Drawer').click();drawer=page.get_by_role('dialog',name='Store navigation')
    expect(drawer.locator('.storefront-drawer-social')).to_have_count(1 if count else 0)
    if count and width>1100:expect(drawer.locator('.storefront-drawer-social')).not_to_be_visible()
    # Deliberately malformed public payload tests these social consumers, beyond the server's normal sanitization.
    assert drawer.locator('a[href*="attacker.test"],a[href^="javascript:"]').count()==0
    assert page.locator('.public-floating-social a[href*="attacker.test"],.public-floating-social a[href^="javascript:"]').count()==0
    if count and width<=1100:expect(drawer.get_by_role('region',name='Follow Us').get_by_role('link')).to_have_count(count)
    page.keyboard.press('Escape')
  settings['social']='valid';page.set_viewport_size({'width':320,'height':420});page.goto(origin+'/');expect(page.locator('.home-banner-slide img')).to_be_visible();page.get_by_role('button',name='Open Navigation Drawer').click();drawer=page.get_by_role('dialog',name='Store navigation');drawer.get_by_role('link',name='Follow us on Facebook').focus();expect(drawer.get_by_role('link',name='Follow us on Facebook')).to_be_in_viewport();assert drawer.evaluate('el=>el.scrollHeight>el.clientHeight && el.scrollTop>0');page.screenshot(path=str(out/'after-drawer-short-320.png'));page.keyboard.press('Escape')
  for path in ['/login','/bag','/checkout']:
   page.goto(origin+path);expect(page.locator('.public-floating-social')).not_to_be_visible();expect(page.get_by_role('button',name='Follow Us',exact=True)).to_have_count(0)
 assert len(ctx.pages)==1;assert not errors,errors;(out/f'{phase}-metrics.json').write_text(json.dumps(metrics,indent=2));browser.close()
print('Social drawer '+phase+' passed at 320/390/430/768/1024/1440; no external navigation.')

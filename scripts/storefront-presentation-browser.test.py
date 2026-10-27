"""Focused customer typography and homepage dimensions; loopback fixtures only."""
import os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
out=Path('.cache/storefront-presentation');out.mkdir(parents=True,exist_ok=True)
def fixture(action):subprocess.run(['node','--import','tsx','scripts/homepage-fixture-control.ts',action],check=True,capture_output=True)
fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(reduced_motion='reduce',viewport={'width':390,'height':900})
  ctx.route('https://**/*',lambda route:route.abort())
  def media(route):
   name=route.request.url.rsplit('/',1)[1].replace('home-','').replace('.jpg','')
   asset=Path('.cache/home-assets/'+('bg-0' if name in ['mobile','desktop'] else name)+'.jpg')
   if asset.exists():route.fulfill(status=200,content_type='image/jpeg',body=asset.read_bytes())
   else:route.abort()
  ctx.route('https://res.cloudinary.com/parinaya-emulator/image/upload/home-*',media)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def check_fonts():
   page.evaluate("document.fonts.load('400 16px ParinayaLora')")
   assert page.evaluate("document.fonts.check('400 16px ParinayaLora')")
   bad=page.locator('.customer-storefront').evaluate("""root=>Array.from(root.querySelectorAll('*')).filter(el=>!el.closest('svg')&&!el.matches('.material-symbols-outlined')&&el.getBoundingClientRect().width&&el.getBoundingClientRect().height&&(el.matches('input,select,textarea,button')||Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))).filter(el=>!getComputedStyle(el).fontFamily.startsWith('ParinayaLora')).map(el=>({tag:el.tagName,font:getComputedStyle(el).fontFamily})).slice(0,5)""")
   assert not bad,bad
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),page.url
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});page.goto(origin+'/');expect(page.locator('[data-home-product]')).to_have_count(4)
   first=page.locator('.home-banner-slide');a=first.bounding_box();ratio=5/4 if width<768 else 3/8
   assert abs(a['height']/a['width']-ratio)<.005
   page.get_by_role('button',name='Show banner 2',exact=True).click();b=first.bounding_box();assert abs(a['height']-b['height'])<1
   assert first.locator('img').evaluate("el=>getComputedStyle(el).objectPosition")=='50% 50%'
   assert first.locator('img').evaluate("el=>getComputedStyle(el).objectFit")=='cover'
   expect(page.locator('.home-information-strip')).to_have_count(0)
   assert page.locator('.home-categories').evaluate("el=>el.nextElementSibling.classList.contains('home-arrivals')")
   check_fonts();page.get_by_role('button',name='Show banner 1',exact=True).click();page.evaluate('document.activeElement.blur()');page.screenshot(path=str(out/f'home-{width}.png'),full_page=True)
   for route in ['/shop','/shop?search=Silk','/product/home-saree-0','/wishlist','/bag','/login','/register','/forgot-password','/about','/contact','/shipping-policy']:
    page.goto(origin+route);expect(page.locator('.customer-storefront')).to_be_visible();page.wait_for_timeout(80);check_fonts()
   page.goto(origin+'/register');expect(page.locator('input[type=email]')).to_be_visible();check_fonts();page.screenshot(path=str(out/f'register-{width}.png'),full_page=True)
  page.goto(origin+'/login');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.wait_for_url('**/account')
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900})
   for route in ['/account','/account/orders','/account/addresses','/checkout']:
    page.goto(origin+route);expect(page.locator('.customer-storefront')).to_be_visible();page.wait_for_timeout(100);check_fonts()
  admin=browser.new_context(viewport={'width':1440,'height':900});admin_page=admin.new_page()
  admin_page.goto(origin+'/admin/banners');admin_page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');admin_page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);admin_page.get_by_role('button',name='Sign In',exact=True).click();expect(admin_page.get_by_role('heading',name='Homepage Banners',exact=False)).to_be_visible()
  expect(admin_page.locator('.customer-storefront')).to_have_count(0)
  assert 'ParinayaLora' in admin_page.locator('.parinaya-admin').evaluate('el=>getComputedStyle(el).fontFamily')
  admin_page.get_by_role('button',name='Add Banner',exact=True).click();editor=admin_page.get_by_role('dialog',name='Add Homepage Banner',exact=True)
  expect(editor.get_by_text('Recommended 1080 x 1350 px',exact=False)).to_be_visible()
  editor.get_by_role('button',name='Mobile',exact=True).click()
  for width in [390,1440]:
   admin_page.set_viewport_size({'width':width,'height':900});box=editor.locator('.home-banner-slide.preview-mobile').bounding_box();assert abs(box['height']/box['width']-1.25)<.005
  assert not errors,errors
  browser.close()
 print('Storefront presentation passed: 320/390/768/1440px, actual local Lora font on customer text and controls, public and signed-in routes, portrait carousel with stable heights/focal points, unchanged desktop ratio, removed strip, Admin isolation and mobile preview/guidance.')
finally:fixture('cleanup')

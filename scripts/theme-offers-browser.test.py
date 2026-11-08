"""Real loopback theme persistence and coupon discovery, without accepting orders."""
import os,subprocess,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action,script='theme-offers'):subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',action],check=True,capture_output=True)
fixture('cleanup','homepage');fixture('seed','homepage');fixture('seed')
origin='http://127.0.0.1:3100';out=Path('.cache/theme-offers');out.mkdir(parents=True,exist_ok=True)
def login(page,admin=False):
 page.get_by_label('Email' if admin else 'Email address',exact=True).fill('parinayasilks.in@gmail.com' if admin else 'customer@example.test')
 page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce',permissions=['clipboard-read','clipboard-write']);ctx.route('https://**/*',lambda r:r.abort());ctx.route('https://res.cloudinary.com/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  coupon_reads=[];page.on('request',lambda request:coupon_reads.append(request.url) if 'coupons=available' in request.url else None)
  page.goto(origin+'/shop');expect(page.get_by_label('Search products',exact=True)).to_be_visible();expect(page.locator('main article').first).to_be_visible();expect(page.get_by_role('region',name='Available Offers')).to_have_count(0);assert not coupon_reads
  page.goto(origin+'/bag');offers=page.get_by_role('region',name='Available Offers');expect(offers.locator('strong').filter(has_text=re.compile('^PUBLIC10$'))).to_be_visible();expect(offers.locator('article')).to_have_count(2);expect(offers.get_by_role('button',name='Apply PUBLIC10')).to_have_count(0)
  offers.get_by_role('button',name='Copy Code PUBLIC10').click();assert page.evaluate('navigator.clipboard.readText()')=='PUBLIC10'
  page.goto(origin+'/admin/settings');login(page,True);theme=page.get_by_role('region',name='Storefront Appearance');expect(theme.get_by_role('radio',name=re.compile('Classic Cream'))).to_be_checked()
  admin_colors=page.locator('.parinaya-admin').evaluate('e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})')
  theme.get_by_role('radio',name=re.compile('Light Maroon')).check();theme.get_by_role('button',name='Cancel theme changes').click();expect(theme.get_by_role('radio',name=re.compile('Classic Cream'))).to_be_checked();theme.get_by_role('radio',name=re.compile('Light Maroon')).check();assert ctx.request.get(origin+'/api/catalog?content=store').json()['storefrontAppearance']['theme']=='classic-cream'
  theme.get_by_role('button',name='Save Theme',exact=True).click();expect(theme.get_by_role('status')).to_contain_text('Colour theme saved');page.reload();expect(theme.get_by_role('radio',name=re.compile('Light Maroon'))).to_be_checked();assert page.locator('.parinaya-admin').evaluate('e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})')==admin_colors
  other=ctx.new_page();other.goto(origin+'/shop');expect(other.locator('.customer-storefront')).to_have_attribute('data-store-theme','light-maroon');other.close()
  for name,bg,primary in [('light-maroon','rgb(188, 134, 146)','rgb(120, 13, 36)'),('classic-cream','rgb(250, 247, 240)','rgb(107, 36, 53)')]:
   if name=='classic-cream':
    theme.get_by_role('radio',name=re.compile('Classic Cream')).check();theme.get_by_role('button',name='Save Theme',exact=True).click();expect(theme.get_by_role('status')).to_contain_text('Colour theme saved')
   display=ctx.new_page()
   for width in [320,390,768,1440]:
    display.set_viewport_size({'width':width,'height':900})
    for path in ['/','/shop','/product/home-saree-0','/login','/about','/contact','/policies/privacy']:
     display.goto(origin+path);expect(display.locator('.customer-storefront')).to_have_attribute('data-store-theme',name)
     expect(display.locator('.customer-storefront')).to_have_css('background-color',bg)
     assert display.locator('.storefront-header').evaluate('e=>getComputedStyle(e).backgroundColor')==primary
     assert display.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(name,path,width)
     if path=='/shop':
      expect(display.get_by_role('region',name='Available Offers')).to_have_count(0)
      expect(display.get_by_label('Search products',exact=True)).to_be_visible()
      expect(display.locator('main article').first).to_be_visible()
      display.screenshot(path=str(out/f'{name}-shop-{width}.png'),full_page=True)
     if path=='/':
      hero=display.locator('.home-banner-slide');expect(hero).to_be_visible();box=hero.bounding_box();assert abs(box['height']/box['width']-(1.25 if width<768 else .375))<.006
   display.close()
  # A separate customer context obtains its own verified token. No admin identity is used for eligibility.
  customer=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');customer.route('https://**/*',lambda r:r.abort());customer.route('https://res.cloudinary.com/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()));shop=customer.new_page();shop.on('pageerror',lambda e:errors.append(str(e)));shop.goto(origin+'/login?returnTo=%2Fshop');login(shop);shop.wait_for_url('**/shop')
  expect(shop.get_by_role('region',name='Available Offers')).to_have_count(0)
  shop.goto(origin+'/bag');offers=shop.get_by_role('region',name='Available Offers');expect(offers.get_by_text('Complete 1 more Delivered order to unlock this offer.',exact=True)).to_be_visible();expect(offers.get_by_role('button',name='Apply PUBLIC10')).to_be_enabled();offers.get_by_role('button',name='Apply PUBLIC10').click();shop.wait_for_url('**/checkout');expect(shop.get_by_role('heading',name='Where should we deliver?',exact=True)).to_be_visible()
  shop.get_by_role('button',name='Continue to Review',exact=False).first.click();shop.wait_for_url('**/checkout/summary');expect(shop.get_by_label('Coupon code',exact=True)).to_have_value('PUBLIC10');expect(shop.locator('.checkout-applied')).to_contain_text('100');shop.locator('.checkout-applied').get_by_role('button',name='Remove coupon').click();expect(shop.get_by_label('Coupon code',exact=True)).to_have_value('')
  selector=shop.get_by_role('region',name='Available Coupons');selector.get_by_role('button',name='View Available Coupons').click();selector.get_by_role('button',name='Apply Coupon PUBLIC10').click();expect(shop.get_by_label('Coupon code',exact=True)).to_have_value('PUBLIC10');expect(shop.locator('.checkout-applied')).to_contain_text('100')
  for path in ['/bag','/account','/checkout/summary']:
   shop.goto(origin+path);expect(shop.locator('.customer-storefront')).to_have_attribute('data-store-theme','classic-cream');assert shop.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  fixture('assert');assert not errors,errors;browser.close()
 print('Theme/offers browser passed: real Admin save/cancel/persistence, no Shop offers, guest Bag copy, UID-owned upcoming offers, Apply and Remove through checkout, both palettes and unchanged hero geometry at 320/390/768/1440, Admin unchanged.')
finally:fixture('cleanup');fixture('cleanup','homepage')

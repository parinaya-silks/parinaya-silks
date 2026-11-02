"""Real loopback API/authentication; no external navigation or live writes."""
import os,re,json,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/client-changes');screens.mkdir(parents=True,exist_ok=True)
def fixture(action,script='client-changes'):
 name=script+'-fixture-control.ts' if script!='client-changes' else 'client-changes-fixture.ts'
 result=subprocess.run(['node','--import','tsx','scripts/'+name,action],capture_output=True,text=True)
 assert result.returncode==0,result.stderr
fixture('seed','products');fixture('seed','campaigns');fixture('seed')
widths=[320,390,768,1440,1920]
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort())
 ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 def shots(prefix,scroll=None):
  for width in widths:
   page.set_viewport_size({'width':width,'height':900})
   if scroll:page.locator(scroll).first.scroll_into_view_if_needed()
   else:page.evaluate('scrollTo(0,0)')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(prefix,width)
   page.screenshot(path=str(screens/f'{prefix}-{width}.png'),full_page=True)
   if scroll:page.screenshot(path=str(screens/f'{prefix}-viewport-{width}.png'))
   if prefix=='admin-variant-hex':assert page.get_by_label('Colour 1 hex code',exact=True).bounding_box()['width']>=110,(prefix,width)
 page.goto(origin+'/shop');expect(page.locator('.shop-discount-badge').first).to_be_visible()
 expect(page.locator('.storefront-brand')).to_contain_text('PARINAYA SAREES')
 def check_badges():
  count=0
  for card in page.locator('article').all():
   badge=card.locator('.shop-discount-badge')
   if badge.count():
    text=card.inner_text();numbers=re.findall(r'\u20b9([\d,]+(?:\.\d+)?)',text)
    assert len(numbers)>=2,text
    sell=int(round(float(numbers[0].replace(',',''))*100));mrp=int(round(float(numbers[1].replace(',',''))*100))
    assert badge.inner_text()==str((mrp-sell)*100//mrp)+'% OFF';count+=1
    b=badge.bounding_box();heart=card.get_by_role('button',name=re.compile('wishlist',re.I)).bounding_box()
    assert b['x']+b['width']<=heart['x']+1
  assert count>0
 check_badges();shots('shop-discounts-social')
 social=page.get_by_role('navigation',name='Follow Parinaya Sarees',exact=True);expect(social).to_be_visible()
 for width in widths:
  page.set_viewport_size({'width':width,'height':900});page.evaluate('scrollTo(0,0)')
  toggle=social.get_by_role('button')
  if width<768:
   expect(toggle).to_have_attribute('aria-expanded','false');expect(social.get_by_role('link').first).not_to_be_visible();toggle.click()
  links=social.get_by_role('link');expect(links).to_have_count(2)
  for link in links.all():
   expect(link).to_be_visible();assert link.get_attribute('target')=='_blank';assert 'noopener' in link.get_attribute('rel');assert link.bounding_box()['height']>=44
  if width<768:
   assert social.bounding_box()['y']+social.bounding_box()['height']<=page.locator('main').first.bounding_box()['y']+1
  page.screenshot(path=str(screens/f'social-open-{width}.png'),full_page=True)
  if width<768:page.keyboard.press('Escape');expect(toggle).to_be_focused()
 for route in ['/collections/kanchipuram-silk','/shop?search=Crimson','/sale/fixture-campaign-0']:
  page.goto(origin+route);expect(page.locator('.shop-discount-badge').first).to_be_visible();check_badges()
 page.screenshot(path=str(screens/'campaign-actual-price.png'),full_page=True)
 page.goto(origin+'/');expect(page.get_by_role('heading',name='Recent Unveiled',exact=True)).to_be_visible();assert page.get_by_text('New Arrival',exact=True).count()==0;shots('recent-brand')
 page.goto(origin+'/product/fixture-saree-6');reel=page.get_by_role('link',name='Watch Product Reel',exact=True);expect(reel).to_be_visible();assert reel.get_attribute('href')=='https://www.youtube.com/watch?v=local-fixture';assert reel.get_attribute('target')=='_blank';assert 'noreferrer' in reel.get_attribute('rel');expect(page.locator('.public-floating-social')).to_have_count(0);shots('reel-brand','.product-reel-link')
 page.goto(origin+'/product/fixture-saree-1');expect(page.get_by_role('link',name='Watch Product Reel',exact=True)).to_have_count(0)
 for route in ['/login','/bag','/checkout','/account']:
  page.goto(origin+route);expect(page.locator('.public-floating-social')).to_have_count(0)
 page.goto(origin+'/admin/products/edit/p0000000000000000002');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();expect(page.get_by_label('Product name',exact=True)).to_be_visible()
 assert page.locator('input[type=color]').count()==0
 hexfield=page.get_by_label('Colour 1 hex code',exact=True);hexfield.fill('invalid');hexfield.blur();expect(hexfield).to_have_attribute('aria-invalid','true');hexfield.fill('#abc');hexfield.blur();expect(hexfield).to_have_value('#AABBCC')
 video=page.get_by_label('Product Reel / Video Link',exact=True);video.fill('https://www.instagram.com/reel/local-fixture/')
 def save():
  page.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first.click();expect(page.get_by_text('Product saved.',exact=True)).to_be_visible()
 save();page.reload();expect(video).to_have_value('https://www.instagram.com/reel/local-fixture/');expect(hexfield).to_have_value('#AABBCC');shots('admin-variant-hex','.product-hex-field')
 video.fill('');save();page.reload();expect(video).to_have_value('')
 page.goto(origin+'/admin/products/edit/p0000000000000000006');mainhex=page.get_by_label('Main colour hex',exact=True)
 # The optional detail group may start collapsed.
 page.locator('details').evaluate_all('(els)=>els.forEach(el=>el.open=true)');expect(mainhex).to_be_visible();mainhex.fill('');mainhex.blur();save();page.reload();page.locator('details').evaluate_all('(els)=>els.forEach(el=>el.open=true)');expect(mainhex).to_have_value('');shots('admin-main-hex','.product-hex-field')
 fixture('assert');fixture('empty-social');page.goto(origin+'/shop');expect(page.locator('.shop-product-art').first).to_be_visible();expect(page.locator('.public-floating-social')).to_have_count(0)
 assert len(ctx.pages)==1,'No external social/video app may be opened';assert not errors,errors;browser.close()
print('Client browser passed: canonical badges in Shop/category/search/campaign, hex/save/clear/identity, public reel, social empty/safety/keyboard/flow exclusion, branding and five responsive widths.')

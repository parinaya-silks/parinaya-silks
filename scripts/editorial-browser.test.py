"""Real public projection and isolated emulator enquiries; no external applications."""
import os,subprocess,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action):subprocess.run(['node','--import','tsx','scripts/editorial-fixture.ts',action],capture_output=True,check=True)
fixture('seed');origin='http://127.0.0.1:3100';out=Path('.cache/editorial-design');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000});errors=[];external=[];media=[]
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda r:r.abort())
 ctx.on('page',lambda page:page.on('popup',lambda w:external.append(w.url)))
 def photo(r):media.append(r.request.url);r.abort()
 ctx.route('https://res.cloudinary.com/parinaya-emulator/**',photo)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 for route,label in [('about','About Parinaya Silks'),('contact','We’re Here to Help')]:
  page.goto(origin+'/'+route);expect(page.get_by_role('heading',name=label,exact=True)).to_be_visible()
  for width in [320,390,768,1440,1920]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('document.fonts.ready');page.screenshot(path=str(out/f'{route}-{width}.png'),full_page=True)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(route,width)
   assert 'ParinayaLora' in page.locator('.editorial-page h1').evaluate('(e)=>getComputedStyle(e).fontFamily')
   assert page.get_by_role('navigation',name='Mobile Bottom Navigation').locator('[aria-current=page]').count()==0
   assert page.locator('.public-floating-contact').count()==0
  assert 'Private retained' not in page.locator('body').inner_text();assert not media
 page.goto(origin+'/contact');channels=page.get_by_role('region',name='Contact Channels');expect(channels).to_contain_text('Hyderabad');assert 'Banjara' not in channels.inner_text();expect(channels.get_by_role('link',name=re.compile('Phone'))).to_have_attribute('href','tel:+919876543210')
 channels.get_by_text('Have an order reference?',exact=True).click();page.get_by_label('Order reference (optional)').fill('PS / &?123');href=channels.get_by_role('link',name='Chat on WhatsApp').get_attribute('href');assert 'PS%20%2F%20%26%3F123' in href;assert page.locator('form input[name=order]').count()==0
 # Failed background refresh preserves saved contacts and the form draft.
 page.get_by_label('Full Name',exact=True).fill('Kept visitor')
 def unavailable(r):r.fulfill(status=503,json={'code':'unavailable'})
 page.route('**/api/catalog?content=store',unavailable);page.evaluate("window.dispatchEvent(new Event('focus'))");expect(page.get_by_role('alert')).to_contain_text('last loaded');expect(channels).to_contain_text('Hyderabad');expect(page.get_by_label('Full Name',exact=True)).to_have_value('Kept visitor');page.unroute('**/api/catalog?content=store',unavailable)
 # First-load failure must not masquerade as blank contacts/About fallback; form stays usable.
 first=ctx.new_page();first.route('**/api/catalog?content=store',unavailable);first.goto(origin+'/contact');expect(first.get_by_role('alert')).to_contain_text('Unable to load contact');expect(first.get_by_label('Message',exact=True)).to_be_visible();first.unroute('**/api/catalog?content=store',unavailable);first.get_by_role('button',name='Retry contact information').click();expect(first.get_by_role('region',name='Contact Channels')).to_contain_text('Hyderabad');first.close()
 fixture('hidden');page.goto(origin+'/about');expect(page.get_by_role('heading',name='Short About')).to_be_visible();assert page.locator('.about-story-sections,.about-public-founder').count()==0
 page.goto(origin+'/contact');expect(channels).to_contain_text('not currently available');assert not page.locator('a[href^="tel:"],a[href^="mailto:"],a[href^="https://wa.me"],a[href*="maps.app"]').count();assert 'Private retained' not in page.content();assert 'Hyderabad' not in channels.inner_text()
 # Founder comes only from public CMS; broken verified photo collapses independently.
 fixture('founder');page.goto(origin+'/about');expect(page.get_by_role('heading',name='Private retained founder')).to_be_visible();expect(page.locator('.about-founder img')).to_have_count(0);assert len(media)==1
 page.route('**/assets/about-saree-editorial.jpg',lambda r:r.abort());page.reload();expect(page.locator('.about-editorial-hero')).to_have_class(re.compile('without-image'));assert not page.locator('.about-editorial-hero figure').count();page.unroute('**/assets/about-saree-editorial.jpg')
 fixture('legacy');page.goto(origin+'/about');expect(page.get_by_role('heading',name='Our Collection',exact=True)).to_be_visible();expect(page.get_by_role('heading',name='Your Shopping Experience',exact=True)).to_be_visible()
 # Short keyboard viewport retains reachable controls. Submission delay blocks duplicate taps.
 page.goto(origin+'/contact');page.set_viewport_size({'width':320,'height':420});page.get_by_label('Full Name',exact=True).fill('Delayed visitor');page.get_by_label('Email Address',exact=True).fill('delayed@example.test');page.get_by_label('Message',exact=True).fill('A local delayed enquiry');calls=[];pending=[]
 def hold(r):
  if r.request.method=='POST' and r.request.post_data_json.get('action')=='enquiries:submit':calls.append(r.request.post_data_json);pending.append(r)
  else:r.continue_()
 page.route('**/api/catalog',hold);page.get_by_role('button',name='Send Message',exact=True).click();expect(page.get_by_role('button',name='Sending...',exact=True)).to_be_disabled();assert len(calls)==1;expect(page.get_by_label('Message',exact=True)).to_have_value('A local delayed enquiry');pending.pop().fulfill(status=200,json={'received':True});expect(page.get_by_text('Your message has been received.',exact=True)).to_be_visible();page.get_by_role('button',name='Send Another Message').click();expect(page.get_by_label('Full Name',exact=True)).to_be_focused();expect(page.get_by_label('Message',exact=True)).to_have_value('')
 assert not errors,errors;assert not external,external;browser.close()
print('Editorial browser passed: five widths, actual public CMS, hidden data, safe links, legacy/short/broken images, retained refresh state, initial failure Retry, keyboard viewport and submission states.')

"""Fixed-section content management and real storefront text, loopback fixtures only."""
import os,subprocess,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action):subprocess.run(['node','--import','tsx','scripts/website-content-fixture-control.ts',action],capture_output=True,check=True)
for script in ['products-fixture-control.ts','banners-fixture-control.ts']:subprocess.run(['node','--import','tsx','scripts/'+script,'seed'],capture_output=True,check=True)
fixture('seed');origin='http://127.0.0.1:3100';screens=Path('.cache/website-content-design');screens.mkdir(parents=True,exist_ok=True)
copy='తెలుగు పట్టు — café 👑\n\nSecond paragraph <script>window.fixtureExecuted=true</script>'
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000});errors=[];saves=[]
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda route:route.abort())
 ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:saves.append(r.post_data_json) if '/api/catalog' in r.url and r.method=='POST' and r.post_data_json.get('action')=='website:save' else None)
 failure={'once':True}
 def fail_read(route):
  if route.request.method=='POST' and route.request.post_data_json.get('action')=='website:list' and failure['once']:
   failure['once']=False;route.fulfill(status=503,json={'code':'unavailable'});return
  route.continue_()
 page.route('**/api/catalog',fail_read);page.goto(origin+'/admin/website-content');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('button',name='Retry content',exact=True).click();page.unroute('**/api/catalog',fail_read);overview=page.get_by_role('region',name='Website Content',exact=True);expect(overview.locator('.website-cards article')).to_have_count(8);expect(overview.locator('[data-section=privacy]')).to_contain_text('awaiting owner approval');expect(overview.locator('[data-section=home-categories]')).to_contain_text('Not Set');expect(overview.locator('[data-section=shipping]')).to_contain_text('Shared document updated')
 overview.get_by_label('Search sections or policies',exact=True).fill('not-present');expect(overview.get_by_text('No matching sections. Clear your search or choose All.',exact=True)).to_be_visible();overview.get_by_label('Search sections or policies',exact=True).fill('');overview.get_by_role('button',name='Policies',exact=True).click();expect(overview.locator('.website-cards article')).to_have_count(4);overview.get_by_role('button',name='All (8)',exact=True).click()
 for width in [320,390,768,1024,1440,1920]:
  page.set_viewport_size({'width':width,'height':1000});page.screenshot(path=str(screens/f'overview-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
 visitor=ctx.new_page();visitor.goto(origin+'/privacy-policy');expect(visitor.get_by_text('Final policy terms are pending. Please contact us with any questions.',exact=True)).to_be_visible();assert 'PRIVATE LEGACY POLICY' not in visitor.locator('body').inner_text()
 page.set_viewport_size({'width':1440,'height':1000});overview.locator('[data-section=shipping]').get_by_role('button',name='Edit Content',exact=True).click();expect(page).to_have_url(origin+'/admin/website-content/shipping');page.reload();page.get_by_label('Page heading',exact=True).wait_for();expect(page.get_by_label('Page heading',exact=True)).to_have_value('Saved Shipping Heading');page.get_by_label('Page heading',exact=True).fill('Edited Shipping Heading');page.get_by_label('Main policy text',exact=True).fill(copy);preview=page.get_by_role('complementary',name='Unsaved content preview',exact=True);expect(preview).to_contain_text('Preview — unsaved changes.');expect(preview).to_contain_text(copy);assert page.evaluate('window.fixtureExecuted') is None
 assert ctx.request.get(origin+'/api/catalog?content=store').json()['policies']['shipping']['text']=='Approved saved shipping fixture'
 for width in [320,390,768,1024,1440,1920]:
  page.set_viewport_size({'width':width,'height':1000});page.screenshot(path=str(screens/f'editor-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
 page.set_viewport_size({'width':390,'height':700});page.get_by_role('tab',name='Live Preview',exact=True).click();expect(preview).to_contain_text(copy);page.get_by_role('tab',name='Edit Content',exact=True).click();expect(page.get_by_label('Main policy text',exact=True)).to_have_value(copy);page.set_viewport_size({'width':390,'height':480});box=page.get_by_role('button',name='Save Changes',exact=True).bounding_box();assert box['y']+box['height']<=480
 page.set_viewport_size({'width':1440,'height':1000});page.evaluate("window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))");expect(page.get_by_label('Main policy text',exact=True)).to_have_value(copy)
 lost={'once':True}
 def lose_response(route):
  if route.request.method=='POST' and route.request.post_data_json.get('action')=='website:save' and lost['once']:
   lost['once']=False;response=route.fetch();assert response.status==200;route.fulfill(status=503,json={'code':'unavailable'});return
  route.continue_()
 page.route('**/api/catalog',lose_response);page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_role('alert').filter(has_text='Unable to save').wait_for();expect(page.get_by_label('Main policy text',exact=True)).to_have_value(copy);page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Website text saved.',exact=False).wait_for();assert saves[-1]==saves[-2];page.unroute('**/api/catalog',lose_response)
 visitor.goto(origin+'/shipping-policy');expect(visitor.get_by_role('heading',name='Edited Shipping Heading',exact=True)).to_be_visible();expect(visitor.locator('main').last).to_contain_text(copy);assert visitor.evaluate('window.fixtureExecuted') is None
 page.get_by_label('Main policy text',exact=True).fill('Kept after conflict');fixture('conflict');page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_role('button',name='Review latest saved version',exact=True).click();page.get_by_role('heading',name='Latest saved text — your input is still kept',exact=True).wait_for();expect(page.get_by_label('Main policy text',exact=True)).to_have_value('Kept after conflict');expect(page.locator('.website-latest')).to_contain_text('Concurrent saved policy text');page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Keep entered text against latest revision',exact=True).click();page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Website text saved.',exact=False).wait_for()
 page.get_by_label('Main policy text',exact=True).fill('Discard this edit');page.once('dialog',lambda d:d.dismiss());page.get_by_role('button',name='Cancel',exact=True).click();expect(page.get_by_label('Main policy text',exact=True)).to_have_value('Discard this edit');page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Cancel',exact=True).click();expect(page).to_have_url(origin+'/admin/website-content')
 # Save every supported section through the real UI/API and verify the actual public renderer.
 for section,path in [('home-featured','/'),('home-categories','/'),('returns','/returns-policy'),('privacy','/privacy-policy'),('terms','/terms-conditions'),('footer-brand','/'),('footer-support','/')]:
  page.goto(origin+'/admin/website-content/'+section);text='Saved fixture '+section+'\n\nతెలుగు <strong>plain text</strong>'
  if section.startswith('home-'):
   page.get_by_label('Section heading',exact=True).fill('Heading '+section);page.get_by_label('Supporting text',exact=True).fill('Intro '+section);page.get_by_label('Section description',exact=True).fill(text)
  elif section.startswith('footer-'):page.get_by_label('Footer text',exact=True).fill(text)
  else:
   page.get_by_label('Page heading',exact=True).fill('Heading '+section);page.get_by_label('Main policy text',exact=True).fill(text);page.get_by_label('I confirm this policy wording is approved by the business owner.',exact=True).check()
  page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Website text saved.',exact=False).wait_for();visitor.goto(origin+path);expect(visitor.locator('body')).to_contain_text(text);assert visitor.evaluate('window.fixtureExecuted') is None
 fixture('assert');public=ctx.request.get(origin+'/api/catalog?content=store').json();assert 'privateSetting' not in public and 'textSectionMeta' not in public;assert ctx.request.get(origin+'/api/catalog?content=store&preview=1').status==400
 page.goto(origin+'/admin/website-content/footer-brand');page.get_by_label('Footer text',exact=True).fill('');page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Website text saved.',exact=False).wait_for();page.get_by_role('button',name='Back to Website Content',exact=True).click();expect(page.locator('[data-section=footer-brand]')).to_contain_text('Not Set')
 assert not errors,errors;browser.close()
print('Website content browser passed: overview/search/groups, fixed routes, all section save/public rendering, Unicode/HTML safety, private preview, retry/conflict/discard, responsive editor and shared-field preservation.')

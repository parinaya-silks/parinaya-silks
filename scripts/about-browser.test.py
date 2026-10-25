"""About Us editor and public renderer; loopback fixtures and synthetic media only."""
import os,subprocess,re,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action):subprocess.run(['node','--import','tsx','scripts/about-fixture-control.ts',action],capture_output=True,check=True)
for name in ['products-fixture-control.ts','banners-fixture-control.ts','website-content-fixture-control.ts']:subprocess.run(['node','--import','tsx','scripts/'+name,'seed'],capture_output=True,check=True)
fixture('seed');origin='http://127.0.0.1:3100';screens=Path('.cache/about-design');screens.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000});errors=[];saves=[]
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda r:r.abort())
 ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));failure={'read':True,'verify':True,'lost':False}
 def api(route):
  req=route.request
  if req.method=='POST':
   body=req.post_data_json;action=body.get('action')
   if action=='about:get' and failure['read']:failure['read']=False;route.fulfill(status=503,json={'code':'unavailable'});return
   if action=='about:verify' and failure['verify']:failure['verify']=False;route.fulfill(status=503,json={'code':'unavailable'});return
   if action=='about:save':
    saves.append(body)
    if failure['lost']:failure['lost']=False;route.fetch();route.fulfill(status=503,json={'code':'unavailable'});return
  route.continue_()
 page.route('**/api/catalog',api)
 def upload(route):
  fields=route.request.post_data_buffer.decode('latin1');match=re.search(r'name="public_id"\r\n\r\n([^\r]+)',fields);assert match
  ctx.request.post('http://127.0.0.1:3200/test/upload',data={'publicId':match.group(1)})
  route.fulfill(status=200,json={})
 ctx.route('https://api.cloudinary.com/**',upload)
 page.goto(origin+'/admin/about');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('button',name='Retry About Us',exact=True).click();expect(page.get_by_label('Page Heading',exact=True)).to_have_value('Saved About Fixture');expect(page.get_by_text('Unsaved changes',exact=True)).to_have_count(0)
 save=lambda:page.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first.click()
 page.get_by_label('Page Heading',exact=True).fill('');save();expect(page.get_by_role('alert')).to_contain_text('Page heading');page.get_by_label('Page Heading',exact=True).fill('Fixture Heading');page.get_by_label('Brand Story',exact=True).fill('తెలుగు\n\n<script>window.aboutExecuted=true</script>');page.get_by_label('Show founder introduction',exact=True).check();save();expect(page.get_by_role('alert')).to_contain_text('Founder name');page.get_by_label('Founder / Owner Name',exact=True).fill('Fixture Owner');page.get_by_label('Role / Title (optional)',exact=True).fill('Fixture Role');page.get_by_label('Founder Introduction (optional)',exact=True).fill('Fixture introduction')
 preview=page.get_by_role('complementary',name='About Us preview',exact=True);expect(preview).to_contain_text('Fixture Heading');expect(preview).to_contain_text('Fixture Owner');assert not page.evaluate('window.aboutExecuted');assert len(saves)==0
 page.get_by_label('Founder photo file',exact=True).set_input_files('public/assets/customer-auth-portrait.jpg');expect(preview.locator('img')).to_have_count(1);expect(page.get_by_role('button',name='Save Changes',exact=True).first).to_be_disabled();page.get_by_role('button',name='Upload selected photo',exact=True).click();expect(page.get_by_role('alert')).to_contain_text('Upload or verification');expect(page.get_by_label('Brand Story',exact=True)).to_have_value('తెలుగు\n\n<script>window.aboutExecuted=true</script>');page.get_by_role('button',name='Retry verification',exact=True).click();page.get_by_label('Founder image alt text',exact=True).fill('Fixture owner portrait');page.get_by_label('focalX',exact=True).fill('35');expect(preview.locator('img')).to_have_attribute('alt','Fixture owner portrait')
 # Unsaved preview must not leak through public service.
 public=ctx.request.get(origin+'/api/catalog?content=store').json();assert public['about']['heading']=='Saved About Fixture';assert public['about']['founder'] is None
 page.screenshot(path=str(screens/'desktop-1440.png'),full_page=True)
 for width in [320,390,768,1024,1440,1920]:
  page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
 page.set_viewport_size({'width':390,'height':700});page.get_by_role('tab',name='Live Preview',exact=True).click();expect(preview).to_be_visible();page.get_by_role('tab',name='Edit Story',exact=True).click();page.evaluate("window.dispatchEvent(new Event('focus'))");expect(page.get_by_label('Page Heading',exact=True)).to_have_value('Fixture Heading');page.screenshot(path=str(screens/'mobile-390.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':480});assert page.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first.bounding_box()['y']<480
 failure['lost']=True;save();expect(page.get_by_role('alert')).to_contain_text('Your entries are kept');save();expect(page.get_by_text('About Us updated.',exact=True)).to_be_visible();assert saves[-1]==saves[-2]
 public=ctx.request.get(origin+'/api/catalog?content=store').json();assert public['about']['founder']['photo']['alt']=='Fixture owner portrait';assert 'mediaId' not in json.dumps(public['about']);assert 'PRIVATE' not in json.dumps(public)
 customer=ctx.new_page();customer.goto(origin+'/about');expect(customer.get_by_role('heading',name='Fixture Heading',exact=True)).to_be_visible();expect(customer.get_by_alt_text('Fixture owner portrait',exact=True)).to_be_visible();assert not customer.evaluate('window.aboutExecuted');customer.set_viewport_size({'width':320,'height':800});assert customer.evaluate('document.documentElement.scrollWidth<=innerWidth');customer.screenshot(path=str(screens/'public-320.png'),full_page=True)
 # Replacing an uploaded asset remains private until save; cancel retains saved media.
 page.get_by_label('Founder photo file',exact=True).set_input_files('public/assets/customer-auth-portrait.jpg');page.get_by_role('button',name='Upload selected photo',exact=True).click();expect(page.get_by_role('button',name='Upload selected photo',exact=True)).to_have_count(0)
 page.get_by_role('button',name='Cancel',exact=True).filter(visible=True).first.click();dialog=page.get_by_role('dialog',name='Discard your changes?',exact=True);expect(dialog).to_be_visible();page.get_by_role('button',name='Keep Editing',exact=True).focus();page.keyboard.press('Shift+Tab');assert dialog.evaluate('(d)=>d.contains(document.activeElement)');page.keyboard.press('Escape');expect(dialog).not_to_be_visible();page.get_by_role('button',name='Cancel',exact=True).filter(visible=True).first.click();page.get_by_role('button',name='Discard Changes',exact=True).click();expect(page.get_by_label('Founder image alt text',exact=True)).to_have_value('Fixture owner portrait')
 page.get_by_label('Page Heading',exact=True).fill('Keep my dirty heading');fixture('conflict');save();expect(page.get_by_role('alert')).to_contain_text('changed');expect(page.get_by_label('Page Heading',exact=True)).to_have_value('Keep my dirty heading');page.get_by_role('button',name='Review latest saved About Us',exact=True).click();expect(page.get_by_role('heading',name='Concurrent saved heading',exact=True)).to_be_visible();page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Keep entries against latest revision',exact=True).click();save();expect(page.get_by_text('About Us updated.',exact=True)).to_be_visible()
 page.get_by_label('Short Introduction (optional)',exact=True).fill('discard this');page.get_by_role('button',name='Cancel',exact=True).filter(visible=True).first.click();dialog=page.get_by_role('dialog',name='Discard your changes?',exact=True);expect(dialog).to_be_visible();page.get_by_role('button',name='Keep Editing',exact=True).click();expect(page.get_by_label('Short Introduction (optional)',exact=True)).to_have_value('discard this');page.get_by_role('button',name='Cancel',exact=True).filter(visible=True).first.click();page.get_by_role('button',name='Discard Changes',exact=True).click();expect(page.get_by_label('Short Introduction (optional)',exact=True)).not_to_have_value('discard this')
 page.get_by_label('Show founder introduction',exact=True).uncheck();save();expect(page.get_by_text('About Us updated.',exact=True)).to_be_visible();assert ctx.request.get(origin+'/api/catalog?content=store').json()['about']['founder'] is None;page.get_by_label('Show founder introduction',exact=True).check();expect(page.get_by_label('Founder / Owner Name',exact=True)).to_have_value('Fixture Owner');page.get_by_role('button',name='Remove Photo',exact=True).click();save();expect(page.get_by_text('About Us updated.',exact=True)).to_be_visible();assert ctx.request.get(origin+'/api/catalog?content=store').json()['about']['founder']['photo'] is None
 fixture('assert');assert not errors,errors;browser.close()
print('About browser passed: real save/public flow, private previews, Unicode, upload failure/retry, removal, visibility, dirty/conflict/discard, retry idempotency and responsive 320-1920.')

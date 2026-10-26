"""Store Settings with real loopback persistence and synthetic Cloudinary only."""
import os,subprocess,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action):subprocess.run(['node','--import','tsx','scripts/settings-fixture-control.ts',action],capture_output=True,check=True)
fixture('seed');origin='http://127.0.0.1:3100';screens=Path('.cache/settings-design');screens.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000});errors=[];saves=[];fail={'read':True,'verify':True,'lost':False}
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda r:r.abort())
 ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
 def upload(route):
  match=re.search(b'name="public_id"\r\n\r\n([^\r]+)',route.request.post_data_buffer);assert match;ctx.request.post('http://127.0.0.1:3200/test/upload',data={'publicId':match.group(1).decode()});route.fulfill(status=200,json={})
 ctx.route('https://api.cloudinary.com/**',upload)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 def api(route):
  if route.request.method=='POST':
   body=route.request.post_data_json;action=body.get('action')
   if action=='settings:get' and fail['read']:fail['read']=False;route.fulfill(status=503,json={'code':'unavailable'});return
   if action=='appearance:verify' and fail['verify']:fail['verify']=False;route.fulfill(status=503,json={'code':'unavailable'});return
   if action=='settings:save':
    saves.append(body)
    if fail['lost']:fail['lost']=False;route.fetch();route.fulfill(status=503,json={'code':'unavailable'});return
  route.continue_()
 page.route('**/api/catalog',api);page.goto(origin+'/admin/settings');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('button',name='Retry store settings',exact=True).click();expect(page.get_by_label('Standard Shipping Charge',exact=True)).to_have_value('250.00');expect(page.get_by_text('Unsaved changes',exact=True)).to_have_count(0)
 expect(page.get_by_text('Not integrated',exact=True)).to_be_visible();expect(page.get_by_text('Supported checkout method',exact=True)).to_be_visible();assert page.get_by_role('checkbox').count()==3
 save=lambda:page.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first.click()
 page.get_by_label('Standard Shipping Charge',exact=True).fill('1.001');save();expect(page.get_by_role('alert')).to_contain_text('two decimal places');page.get_by_label('Standard Shipping Charge',exact=True).fill('123.45');page.get_by_label('Free shipping threshold',exact=True).fill('5000');expect(page.get_by_text('Orders strictly above',exact=False)).to_contain_text('At or below')
 for device in ['desktop','mobile']:
  page.get_by_label(device+' login file',exact=True).set_input_files('public/assets/customer-auth-portrait.jpg');expect(page.get_by_role('button',name='Save Changes',exact=True).first).to_be_disabled();page.get_by_role('button',name='Upload selected '+device+' image',exact=True).click()
  if device=='desktop':expect(page.get_by_role('alert')).to_contain_text('Upload or verification');expect(page.get_by_label('Standard Shipping Charge',exact=True)).to_have_value('123.45');page.get_by_role('button',name='Retry desktop verification',exact=True).click()
  page.get_by_label(device+' login alt text',exact=True).fill(device+' fixture login');page.get_by_label(device+' focalY',exact=True).fill('25')
 assert ctx.request.get(origin+'/api/catalog?appearance=login').json()=={'desktop':None,'mobile':None};assert not saves
 page.set_viewport_size({'width':390,'height':700});page.get_by_role('tab',name='Login Preview',exact=True).click();preview=page.get_by_role('region',name='Login preview',exact=True);expect(preview).to_contain_text('Preview — unsaved changes.');expect(preview.get_by_alt_text('desktop fixture login',exact=True)).to_be_visible();preview.get_by_role('button',name='Mobile',exact=True).click();expect(preview.get_by_alt_text('mobile fixture login',exact=True)).to_be_visible();page.get_by_role('tab',name='Settings',exact=True).click();page.evaluate("window.dispatchEvent(new Event('focus'))");expect(page.get_by_label('Standard Shipping Charge',exact=True)).to_have_value('123.45');page.screenshot(path=str(screens/'mobile-390.png'),full_page=True)
 page.set_viewport_size({'width':390,'height':480});assert page.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first.bounding_box()['y']<480
 fail['lost']=True;save();expect(page.get_by_role('alert')).to_contain_text('Your entries are kept');save();expect(page.get_by_text('Store settings updated.',exact=True)).to_be_visible();assert saves[-1]==saves[-2];assert saves[-1]['shipping']['flatFeePaise']==12345;assert saves[-1]['appearance']['mobile']['alt']=='mobile fixture login'
 for width in [320,390,768,1024,1440,1920]:
  page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
 page.set_viewport_size({'width':1440,'height':1000});page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(screens/'desktop-1440.png'),full_page=True)
 page.get_by_label('Standard Shipping Charge',exact=True).fill('1');fixture('conflict');save();expect(page.get_by_role('alert')).to_contain_text('changed');expect(page.get_by_label('Standard Shipping Charge',exact=True)).to_have_value('1');page.get_by_role('button',name='Review latest saved settings',exact=True).click();expect(page.get_by_role('heading',name='Latest saved settings — your entries are kept',exact=True)).to_be_visible();page.once('dialog',lambda d:d.accept());page.get_by_role('button',name='Keep entries against latest revisions',exact=True).click();save();expect(page.get_by_text('Store settings updated.',exact=True)).to_be_visible()
 page.get_by_role('button',name='Remove desktop image',exact=True).click();page.get_by_role('button',name='Cancel',exact=True).filter(visible=True).first.click();dialog=page.get_by_role('dialog',name='Discard your changes?',exact=True);expect(dialog).to_be_visible();page.keyboard.press('Escape');expect(dialog).not_to_be_visible();page.get_by_role('button',name='Cancel',exact=True).filter(visible=True).first.click();page.get_by_role('button',name='Discard Changes',exact=True).click();expect(page.get_by_label('desktop login alt text',exact=True)).to_have_value('desktop fixture login')
 fixture('assert');assert not errors,errors;browser.close()
fixture('cleanup')
print('Store Settings browser passed: real atomic save/read, private login preview, truthful capabilities, media retry, conflict/retry/discard, responsive 320-1920 and source preservation.')

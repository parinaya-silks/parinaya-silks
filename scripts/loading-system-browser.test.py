"""Loading presentation in Chromium; loopback only, no production or payment writes."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';out=Path('.cache/loading-system');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce')
 ctx.route('https://**/*',lambda r:r.abort());boot=ctx.new_page()
 # A blocked application bundle must leave a usable boot/reload state. Abort
 # rather than hold the module: an open module also holds document.fonts.ready,
 # so Playwright cannot finish a screenshot of the otherwise painted page.
 boot.route('**/assets/*.js',lambda r:r.abort());boot.goto('http://127.0.0.1:4200/',wait_until='domcontentloaded')
 expect(boot.get_by_role('status')).to_have_text('Loading Parinaya Sarees…');expect(boot.get_by_role('link',name='reload this page')).to_have_count(1)
 assert boot.locator('.parinaya-boot path').evaluate('e=>getComputedStyle(e).animationName')=='none'
 boot.screenshot(path=str(out/'initial-bundle-390.png'))
 boot.close();page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(origin+'/login');image_requests=[]
 ctx.route('**/loading-preview-fixture.jpg',lambda r:image_requests.append(r))
 # Mount the actual shared components through Vite, without a test route in the app.
 page.evaluate('''async()=>{
 const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');const L=await import('/src/loading/Loading.tsx');
 const host=document.createElement('div');document.body.replaceChildren(host);const root=createRoot(host);window.loadingRoot=root;
 window.showLoading=(theme)=>root.render(React.createElement('main',{className:'customer-storefront','data-store-theme':theme},React.createElement('div',{style:{padding:16}},
 React.createElement(L.PageLoader,{label:'Loading account…'}),React.createElement(L.Loading,{kind:'products',label:'Loading products'}),React.createElement(L.Loading,{kind:'table',label:'Loading orders'}),React.createElement(L.Loading,{kind:'form',label:'Loading settings'}),React.createElement('button',{disabled:true},React.createElement(L.ButtonLoader,{label:'Saving…'})),React.createElement(L.ImageUploadLoader,{value:37,label:'Image upload progress'}),React.createElement(L.PaymentVerificationLoader,{label:'Checking payment…'}),React.createElement(L.PreviewImage,{src:'/loading-preview-fixture.jpg',alt:'Editor preview fixture',style:{width:180,height:240,objectFit:'cover'}}))));window.showLoading('classic-cream');
 }''')
 expect(page.get_by_role('status').filter(has_text='Loading account…')).to_be_visible()
 for theme in ['classic-cream','light-maroon']:
  page.evaluate('(theme)=>window.showLoading(theme)',theme)
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});page.screenshot(path=str(out/f'{theme}-{width}.png'),full_page=True)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(theme,width)
   assert page.locator('.loading-table-row').count()==5
   assert page.locator('.loading-table-row').first.bounding_box()['height']>=60
   expect(page.get_by_role('button',name='Saving…')).to_be_disabled()
   expect(page.get_by_role('progressbar',name='Image upload progress')).to_have_attribute('value','37')
   assert page.locator('.loading-spinner').first.evaluate('e=>getComputedStyle(e).animationName')=='none'
   assert page.locator('.store-skeleton').first.evaluate('e=>getComputedStyle(e,"::after").animationName')=='none'
   assert 'successful' not in page.locator('.loading-payment').inner_text().lower()
 # Reduced motion keeps infinity static; normal motion actually morphs it.
 shape=page.locator('.loading-infinity path').get_attribute('d');page.wait_for_timeout(180);assert shape==page.locator('.loading-infinity path').get_attribute('d')
 page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(100);shape=page.locator('.loading-infinity path').get_attribute('d');page.wait_for_timeout(300);assert shape!=page.locator('.loading-infinity path').get_attribute('d')
 assert page.locator('.loading-spinner').first.evaluate('e=>getComputedStyle(e).animationName')=='loading-turn'
 page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(100);shape=page.locator('.loading-infinity path').get_attribute('d');page.wait_for_timeout(300);assert shape==page.locator('.loading-infinity path').get_attribute('d')
 preview=page.get_by_alt_text('Editor preview fixture');expect(preview).to_have_attribute('aria-busy','true');before=preview.bounding_box()
 for route in image_requests:route.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes())
 expect(preview).to_have_attribute('aria-busy','false');after=preview.bounding_box();assert before['width']==after['width'] and before['height']==after['height'];assert preview.evaluate('e=>getComputedStyle(e).objectFit')=='cover'
 ctx.close()
 # A real authorised Admin read stays visible as a skeleton and can recover.
 ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort());page=ctx.new_page();held=[];mode={'hold':True}
 def api(route):
  if route.request.method=='POST' and (route.request.post_data_json or {}).get('action')=='settings:get' and mode['hold']:held.append(route);return
  route.continue_()
 page.route('**/api/catalog',api);page.goto(origin+'/admin/settings');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
 expect(page.locator('.store-loading-form')).to_be_visible(timeout=15000)
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900});page.screenshot(path=str(out/f'admin-settings-{width}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
 mode['hold']=False
 for route in held:route.continue_()
 expect(page.get_by_label('Standard Shipping Charge',exact=True)).to_be_visible(timeout=20000);expect(page.locator('.store-loading-form')).to_have_count(0)
 assert not errors,errors
 ctx.close();browser.close()
print('Loading system: both themes at 320/390/768/1440; normal/reduced motion, real progress, disabled actions, truthful payment state and authorised Admin read recovery passed.')

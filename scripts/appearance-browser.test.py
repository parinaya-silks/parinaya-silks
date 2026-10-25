"""Real administrator API and emulator data; synthetic image bytes, no owner photo."""
import base64,json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=')
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce')
    for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
        context.route(pattern,lambda route:route.abort())
    context.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.fulfill(status=200,content_type='image/png',body=png))
    failures={'upload':True,'save':True,'load':True}
    def upload(route):
        if route.request.method=='OPTIONS':
            route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'*'});return
        if failures['upload']:
            failures['upload']=False;route.fulfill(status=500,headers={'Access-Control-Allow-Origin':'*'},body='{}');return
        public_id=re.search(b'name="public_id"\r\n\r\n([^\r]+)',route.request.post_data_buffer).group(1).decode()
        context.request.post('http://127.0.0.1:3200/test/upload',data={'publicId':public_id})
        route.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*'},content_type='application/json',body='{}')
    context.route('https://api.cloudinary.com/v1_1/parinaya-emulator/image/upload',upload)
    def api(route):
        if route.request.method=='POST':
            action=route.request.post_data_json.get('action')
            if action=='settings:get' and failures['load']:
                failures['load']=False;route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable"}');return
            if action=='settings:save' and failures['save']:
                failures['save']=False;route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable"}');return
        route.continue_()
    context.route('**/api/catalog',api)
    page=context.new_page();errors=[];calls=[];
    page.on('response',lambda response:calls.append((response.request.post_data_json.get('action'),response.status)) if '/api/catalog' in response.url and response.request.method=='POST' else None)
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(origin+'/admin/settings')
    page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com')
    page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD'])
    page.get_by_role('button',name='Sign In',exact=True).click()
    page.get_by_role('alert').filter(has_text='Unable to load store settings').wait_for()
    page.get_by_role('button',name='Retry store settings',exact=True).click()
    page.get_by_role('alert').wait_for(state='hidden')
    desktop=page.get_by_role('region',name='Desktop login image',exact=True)
    mobile=page.get_by_role('region',name='Mobile login image',exact=True)
    def select(region,name):region.locator('input[type=file]').set_input_files({'name':name,'mimeType':'image/png','buffer':png})
    select(desktop,'synthetic-desktop.png')
    desktop.get_by_role('button',name='Upload selected desktop image',exact=True).click()
    try:desktop.get_by_role('alert').wait_for(timeout=45000)
    except Exception:
        print('Appearance action/status diagnostics:',calls)
        print('Appearance status:',page.get_by_role('status').all_text_contents())
        print('Appearance alerts:',page.get_by_role('alert').all_text_contents())
        print('Appearance buttons:',desktop.get_by_role('button').all_text_contents())
        raise
    desktop.get_by_role('button',name='Upload again',exact=True).click()
    desktop.get_by_label('desktop login alt text',exact=True).wait_for(timeout=45000)
    assert context.request.get(origin+'/api/catalog?appearance=login').json()=={'desktop':None,'mobile':None},'Upload must not publish'
    desktop.get_by_label('desktop login alt text',exact=True).fill('Desktop test portrait')
    desktop.locator('input[type=range]').nth(0).fill('35')
    desktop.locator('input[type=range]').nth(1).fill('25')
    select(mobile,'synthetic-mobile.png')
    mobile.get_by_role('button',name='Upload selected mobile image',exact=True).click()
    mobile.get_by_label('mobile login alt text',exact=True).wait_for()
    mobile.get_by_label('mobile login alt text',exact=True).fill('Mobile test portrait')
    mobile.locator('input[type=range]').nth(1).fill('15')
    save=page.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first
    save.click();page.get_by_role('alert').filter(has_text='Unable to save store settings').wait_for()
    assert desktop.get_by_label('desktop login alt text',exact=True).input_value()=='Desktop test portrait'
    save.click();page.get_by_role('status').filter(has_text='Store settings updated.').wait_for()
    published=context.request.get(origin+'/api/catalog?appearance=login').json()
    assert '/login/desktop/' in published['desktop']['url'] and '/login/mobile/' in published['mobile']['url']
    desktop.get_by_label('desktop login alt text',exact=True).fill('Unsaved change')
    page.get_by_role('button',name='Cancel',exact=True).filter(visible=True).first.click();page.get_by_role('button',name='Discard Changes',exact=True).click()
    page.get_by_role('heading',name='Login Page Appearance',exact=True).wait_for()
    expect(desktop.get_by_label('desktop login alt text',exact=True)).to_have_value('Desktop test portrait')
    page.reload();expect(desktop.get_by_label('desktop login alt text',exact=True)).to_have_value('Desktop test portrait')
    # Fresh mobile context must request the mobile asset, never the desktop one.
    visitor=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    downloads=[]
    def image(route):downloads.append(route.request.url);route.fulfill(status=200,content_type='image/png',body=png)
    visitor.route('https://res.cloudinary.com/parinaya-emulator/**',image)
    for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
        visitor.route(pattern,lambda route:route.abort())
    customer=visitor.new_page();customer.goto(origin+'/login')
    expect(customer.locator('.customer-auth-portrait img')).to_have_attribute('alt','Mobile test portrait')
    customer.wait_for_function('document.querySelector(".customer-auth-portrait img").complete')
    assert any('/login/mobile/' in item for item in downloads) and not any('/login/desktop/' in item for item in downloads)
    assert customer.locator('.customer-auth-portrait img').evaluate('(el)=>getComputedStyle(el).objectPosition')=='50% 15%'
    customer.get_by_label('Email address',exact=True).fill('preserved@example.test')
    for width in [320,375,390,768,1024,1440]:
        customer.set_viewport_size({'width':width,'height':900})
        expect(customer.locator('.customer-auth-portrait img')).to_have_attribute('alt','Desktop test portrait' if width>=1024 else 'Mobile test portrait')
        assert not customer.evaluate('document.documentElement.scrollWidth>innerWidth+1')
        assert customer.get_by_label('Email address',exact=True).input_value()=='preserved@example.test'
    # Failure of the chosen device-specific asset returns to the approved crop.
    visitor.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.abort())
    customer.reload()
    customer.wait_for_function('document.querySelector(".customer-auth-portrait img").currentSrc.includes("customer-auth-portrait.jpg")')
    assert customer.get_by_role('button',name='Sign In',exact=True).is_enabled()
    visitor.route('**/api/catalog?appearance=login',lambda route:route.fulfill(status=503,body='{}'))
    customer.reload();customer.get_by_role('heading',name='Welcome back',exact=True).wait_for()
    assert customer.locator('.customer-auth-portrait img').evaluate('(el)=>el.currentSrc.includes("customer-auth-portrait.jpg")')
    # Restore defaults, keeping all uploaded emulator records; no asset deletion.
    for region,device in [(desktop,'desktop'),(mobile,'mobile')]:region.get_by_role('button',name='Remove '+device+' image',exact=True).click()
    save.click();page.get_by_role('status').filter(has_text='Store settings updated.').wait_for()
    assert context.request.get(origin+'/api/catalog?appearance=login').json()=={'desktop':None,'mobile':None}
    assert not errors,errors
    print('Appearance browser: administrator load/upload/save retry, separate images, unpublished previews, cancel/persistence, responsive loading/focal points, fallback and six widths passed (Cloudinary fixtures only)')
    browser.close()

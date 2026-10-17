"""Real SDK/API against loopback emulators; Cloudinary uploads/metadata are fixtures."""
import base64,json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright

assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=')

with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844})
    for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
        context.route(pattern,lambda route:route.abort())
    context.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.fulfill(status=200,content_type='image/png',body=png))
    fail_upload={'value':True}
    def upload(route):
        if fail_upload['value'] and b'filename="first.png"' in route.request.post_data_buffer:
            fail_upload['value']=False
            route.fulfill(status=500,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{}')
            return
        match=re.search(b'name="public_id"\r\n\r\n([^\r]+)',route.request.post_data_buffer)
        assert match,'Signed upload must contain its server-selected public ID'
        context.request.post('http://127.0.0.1:3200/test/upload',data={'publicId':match.group(1).decode()})
        route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{}')
    context.route('https://api.cloudinary.com/v1_1/parinaya-emulator/image/upload',upload)
    page=context.new_page();errors=[];saves=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    def observe(request):
        if '/api/catalog' in request.url and request.method=='POST':
            data=request.post_data_json
            if data.get('action')=='save':saves.append(data)
    page.on('request',observe)
    page.goto(origin+'/admin/products/new')
    page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com')
    page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD'])
    page.get_by_role('button',name='Sign In',exact=True).click()
    page.get_by_role('heading',name='Add Product',exact=True).wait_for()
    page.get_by_label('Product name',exact=True).fill('Emulator Saree')
    page.locator('form').evaluate('(form)=>{form.requestSubmit();form.requestSubmit();}')
    page.get_by_role('heading',name='Edit Product',exact=True).wait_for()
    page.get_by_text('Product saved.',exact=True).wait_for()
    assert len(saves)==1,'Repeated submit must save one stable product'
    edit_url=page.url
    assert '/admin/products/edit/' in edit_url
    page.reload()
    page.get_by_label('Product name',exact=True).wait_for()
    assert page.get_by_label('Product name',exact=True).input_value()=='Emulator Saree'
    assert page.get_by_label('SKU',exact=True).input_value()==''
    page.get_by_label('Status',exact=True).select_option('Published')
    page.get_by_role('button',name='Save product',exact=True).click()
    page.get_by_role('alert').filter(has_text='Check the highlighted fields').wait_for()
    assert len(saves)==1,'Invalid publication must not call persistence'
    # Reset errors by editing status and submitting valid information below.
    page.get_by_label(re.compile('^SKU')).fill('PS-EMULATOR-UI')
    page.get_by_label(re.compile('^Description')).fill('Emulator-only saree description')
    page.get_by_label(re.compile('^Category')).select_option(label='Browser Beta')
    for label,value in [('Fabric','Silk'),('Weave / type','Handloom'),('Saree length','6 metres'),('Wash / care instructions','Dry clean only')]:
        page.get_by_label(re.compile('^'+re.escape(label))).fill(value)
    page.get_by_label(re.compile('^Selling price')).fill('1250.05')
    page.get_by_label(re.compile('^Original price')).fill('1500.00')
    page.get_by_label('Stock quantity',exact=True).fill('2')
    page.get_by_label('New Arrival',exact=True).check()
    page.get_by_label('Select images',exact=True).set_input_files([
        {'name':'first.png','mimeType':'image/png','buffer':png},
        {'name':'second.png','mimeType':'image/png','buffer':png}])
    page.get_by_role('button',name='Retry first.png',exact=True).wait_for()
    page.get_by_label('Image 1 alt text',exact=True).wait_for()
    page.get_by_role('button',name='Retry first.png',exact=True).click()
    page.get_by_label('Image 2 alt text',exact=True).wait_for()
    page.get_by_label('Image 1 alt text',exact=True).fill('Emulator full saree')
    page.get_by_label('Image 2 alt text',exact=True).fill('Emulator border detail')
    page.get_by_label('Cover image 2',exact=True).check()
    page.get_by_role('button',name='Move image 2 earlier',exact=True).click()
    assert page.get_by_label('Image 1 alt text',exact=True).input_value()=='Emulator border detail'
    page.get_by_role('button',name='Save product',exact=True).click()
    page.get_by_text('Product saved.',exact=True).wait_for()
    assert page.get_by_role('button',name='Delete unavailable',exact=True).is_disabled()
    page.reload()
    page.get_by_label('Image 2 alt text',exact=True).wait_for()
    assert page.get_by_label('Image 1 alt text',exact=True).input_value()=='Emulator border detail'
    assert page.get_by_label('Cover image 1',exact=True).is_checked()
    assert page.get_by_label('Selling price (₹)',exact=True).input_value()=='1250.05'

    public_context=browser.new_context(viewport={'width':390,'height':844})
    public_context.route('https://firestore.googleapis.com/**',lambda route:route.abort())
    public_context.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.fulfill(status=200,content_type='image/png',body=png))
    public=public_context.new_page();public.on('pageerror',lambda error:errors.append(str(error)))
    for route in ['/','/shop','/shop?search=PS-EMULATOR-UI']:
        public.goto(origin+route)
        public.get_by_role('heading',name='Emulator Saree',exact=True).wait_for()
    # Category reads here use real emulators, unlike the generic empty-content fixtures.
    public.goto(origin+'/collections/browser-beta')
    public.get_by_role('heading',name='Emulator Saree',exact=True).wait_for()
    public.goto(origin+'/product/emulator-saree')
    public.get_by_role('heading',name='Emulator Saree',exact=True).wait_for()
    public.reload()
    public.get_by_role('heading',name='Emulator Saree',exact=True).wait_for()
    assert '₹1,250.05' in public.locator('body').inner_text()
    assert public.get_by_role('button',name='Checkout unavailable',exact=False).is_disabled()
    assert public.locator('img').first.evaluate('(image)=>getComputedStyle(image).objectFit')=='contain'

    page.get_by_label('Product name',exact=True).fill('Emulator Renamed')
    # Re-verification hides protected UI without discarding the open editor.
    page.evaluate("window.dispatchEvent(new Event('focus'))")
    page.get_by_role('heading',name='Edit Product',exact=True).wait_for()
    assert page.get_by_label('Product name',exact=True).input_value()=='Emulator Renamed'
    page.get_by_role('button',name='Save product',exact=True).click()
    page.get_by_text('Product saved.',exact=True).wait_for()
    assert page.get_by_label('URL slug',exact=True).input_value()=='emulator-saree'
    public.reload();public.get_by_role('heading',name='Emulator Renamed',exact=True).wait_for()
    page.once('dialog',lambda dialog:dialog.accept())
    page.get_by_label('Inventory mode',exact=True).select_option('variants')
    for label,value in [('Variant 1 id','wine'),('Variant 1 sku','WINE-UI'),('Variant 1 name','Wine'),('Variant 1 quantity','2')]:page.get_by_label(label,exact=True).fill(value)
    page.get_by_role('button',name='Add colour variant',exact=True).click()
    for label,value in [('Variant 2 id','gold'),('Variant 2 sku','GOLD-UI'),('Variant 2 name','Gold'),('Variant 2 quantity','0')]:page.get_by_label(label,exact=True).fill(value)
    page.get_by_role('button',name='Save product',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    public.reload();public.get_by_role('button',name='Gold',exact=True).click();public.get_by_text('Out of stock',exact=True).wait_for()
    assert public.get_by_role('button',name='Increase quantity',exact=True).is_disabled()

    page.get_by_label('Description',exact=True).fill('Save retry description retained')
    def deny_save(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='save':route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Synthetic save failure"}')
        else:route.continue_()
    page.route('**/api/catalog',deny_save)
    page.get_by_role('button',name='Save product',exact=True).click()
    page.get_by_role('alert').filter(has_text='Synthetic save failure').wait_for()
    assert page.get_by_label('Description',exact=True).input_value()=='Save retry description retained'
    page.unroute('**/api/catalog',deny_save)
    page.get_by_role('button',name='Save product',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    page.get_by_role('button',name='Remove image 2',exact=True).click()
    page.get_by_role('button',name='Save product',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    page.get_by_label('Product name',exact=True).fill('Unsaved product name')
    page.once('dialog',lambda dialog:dialog.dismiss())
    page.get_by_role('button',name='Manage Categories',exact=True).click()
    assert page.url==edit_url
    assert page.get_by_label('Product name',exact=True).input_value()=='Unsaved product name'
    page.once('dialog',lambda dialog:dialog.accept())
    page.get_by_role('button',name='Back to Products',exact=True).click()
    page.get_by_role('heading',name='Products & Stock',exact=True).wait_for()
    page.get_by_role('heading',name='Emulator Renamed',exact=True).wait_for()
    assert page.get_by_text('Unsaved product name',exact=True).count()==0
    page.goto(edit_url)
    page.get_by_label('Status',exact=True).select_option('Archived')
    page.get_by_role('button',name='Save product',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    public.reload();public.get_by_role('heading',name='Product not found',exact=True).wait_for()
    page.get_by_label('Status',exact=True).select_option('Published')
    page.get_by_role('button',name='Save product',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    page.get_by_role('button',name='Manage Categories',exact=True).click()
    page.get_by_role('button',name='Edit Browser Beta',exact=True).click()
    dialog=page.get_by_role('dialog');dialog.get_by_label('Enabled on storefront',exact=True).uncheck()
    dialog.get_by_role('button',name='Save category',exact=True).click();page.get_by_text('Category saved.',exact=True).wait_for()
    public.reload();public.get_by_role('heading',name='Product not found',exact=True).wait_for()
    page.get_by_role('button',name='Edit Browser Beta',exact=True).click()
    dialog=page.get_by_role('dialog');dialog.get_by_label('Enabled on storefront',exact=True).check()
    dialog.get_by_role('button',name='Save category',exact=True).click();page.get_by_text('Category saved.',exact=True).wait_for()
    page.goto(edit_url);page.get_by_label('Product name',exact=True).wait_for()
    public.reload();public.get_by_role('heading',name='Emulator Renamed',exact=True).wait_for()
    Path('.cache/products').mkdir(parents=True,exist_ok=True)
    for width in [360,390,430,768,1024,1440]:
        for target in [page,public]:
            target.set_viewport_size({'width':width,'height':900})
            assert not target.evaluate('document.documentElement.scrollWidth > innerWidth + 1'),width
        assert page.get_by_label('Product name',exact=True).bounding_box()['height']>=44
        if width in [390,1440]:
            page.evaluate('window.scrollTo(0,0)');public.evaluate('window.scrollTo(0,0)')
            page.screenshot(path=f'.cache/products/editor-{width}.png',full_page=True)
            public.screenshot(path=f'.cache/products/detail-{width}.png',full_page=True)
    assert not errors,errors
    assert context.request.post(origin+'/api/catalog',data={'action':'sign'}).status==401
    print('Product browser draft/create/reload/edit, paise display, uploads/retry/reorder/cover/remove, variants, failed save/retry, unsaved/focus guard, category visibility, archive, direct URLs and six widths passed (Cloudinary fixtures only)')
    browser.close()

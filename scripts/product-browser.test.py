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
    # A failed function response must stay an error; retry must perform a new
    # authenticated list request and render the actual empty catalogue.
    list_attempts={'count':0}
    def fail_first_list(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='list':
            list_attempts['count']+=1
            if list_attempts['count']==1:
                route.fulfill(status=500,content_type='text/plain',body='FUNCTION_INVOCATION_FAILED')
                return
        route.continue_()
    page.route('**/api/catalog',fail_first_list)
    page.goto(origin+'/admin/products')
    page.get_by_role('alert').filter(has_text='Catalog API is unavailable').wait_for()
    page.get_by_role('button',name='Reload products',exact=True).click()
    page.get_by_role('heading',name='Products & Stock',exact=True).wait_for()
    page.get_by_role('alert').wait_for(state='hidden')
    assert list_attempts['count']==2,'Retry must issue a new list request'
    page.unroute('**/api/catalog',fail_first_list)
    page.goto(origin+'/admin/products/new')
    page.get_by_role('heading',name='Add Product',exact=True).wait_for()
    page.get_by_label('Product name',exact=True).fill('Emulator Saree')
    page.locator('form').evaluate('(form)=>{form.requestSubmit();form.requestSubmit();}')
    page.get_by_role('heading',name='Edit Product',exact=True).wait_for()
    page.get_by_text('Product saved.',exact=True).wait_for()
    assert len(saves)==1,'Repeated submit must save one stable product'
    edit_url=page.url
    assert '/admin/products/edit/' in edit_url
    slug=saves[-1]['product']['slug']
    assert saves[-1]['product']['inventory']=={'mode':'simple','quantity':0}
    page.reload()
    page.get_by_label('Product name',exact=True).wait_for()
    assert page.get_by_label('Product name',exact=True).input_value()=='Emulator Saree'
    assert page.get_by_label('Product code (optional)',exact=True).input_value().startswith('PS-')
    page.get_by_role('button',name='Publish Product',exact=True).click()
    page.get_by_role('alert').filter(has_text='Check the highlighted fields').wait_for()
    assert len(saves)==1,'Invalid publication must not call persistence'
    # Reset errors by editing status and submitting valid information below.
    page.get_by_text('Product code & link',exact=True).click()
    page.get_by_label('Product code (optional)',exact=True).fill('PS-EMULATOR-UI')
    page.get_by_label(re.compile('^Description')).fill('Emulator-only saree description')
    page.get_by_label(re.compile('^Category')).select_option(label='Browser Beta')
    page.get_by_text('More saree details',exact=True).click()
    for label,value in [('Fabric (optional)','Silk'),('Weave (optional)','Handloom'),('Saree length (optional)','6 metres'),('Care instructions (optional)','Dry clean only')]:
        page.get_by_label(re.compile('^'+re.escape(label))).fill(value)
    page.get_by_label(re.compile('^Selling price')).fill('1250.05')
    page.get_by_label(re.compile('^Original price')).fill('1500.00')
    page.get_by_label('Stock quantity',exact=True).fill('2')
    page.get_by_text('Storefront options',exact=True).click()
    page.get_by_label('Status',exact=True).select_option('Published')
    page.get_by_label('New Arrival',exact=True).check()
    page.get_by_label('Add photos',exact=True).set_input_files([
        {'name':'first.png','mimeType':'image/png','buffer':png},
        {'name':'second.png','mimeType':'image/png','buffer':png}])
    page.get_by_role('button',name='Retry first.png',exact=True).wait_for()
    page.get_by_label('Photo 1 description',exact=True).wait_for()
    page.get_by_role('button',name='Retry first.png',exact=True).click()
    page.get_by_label('Photo 2 description',exact=True).wait_for()
    page.get_by_label('Photo 1 description',exact=True).fill('Emulator full saree')
    page.get_by_label('Photo 2 description',exact=True).fill('Emulator border detail')
    page.get_by_label('Cover image 2',exact=True).check()
    page.get_by_role('button',name='Move image 2 earlier',exact=True).click()
    assert page.get_by_label('Photo 1 description',exact=True).input_value()=='Emulator border detail'
    page.get_by_role('button',name='Save Changes',exact=True).click()
    page.get_by_text('Product saved.',exact=True).wait_for()
    assert page.get_by_role('button',name='Delete unavailable',exact=True).is_disabled()
    page.reload()
    page.get_by_label('Photo 2 description',exact=True).wait_for()
    assert page.get_by_label('Photo 1 description',exact=True).input_value()=='Emulator border detail'
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
    public.goto(origin+'/product/'+slug)
    public.get_by_role('heading',name='Emulator Saree',exact=True).wait_for()
    public.reload()
    public.get_by_role('heading',name='Emulator Saree',exact=True).wait_for()
    assert '₹1,250.05' in public.locator('body').inner_text()
    assert public.get_by_role('button',name='Checkout unavailable',exact=False).is_disabled()
    assert public.locator('img').first.evaluate('(image)=>getComputedStyle(image).objectFit')=='contain'

    page.get_by_label('Product name',exact=True).fill('Emulator Renamed')
    # Background checks preserve the same visible focused DOM node.
    page.get_by_label('Product name',exact=True).focus()
    page.evaluate("window.__editorInput=document.activeElement;window.__editorScroll=scrollY;for(let i=0;i<12;i++){window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));}")
    assert page.evaluate("document.activeElement===window.__editorInput && window.__editorInput.isConnected && !window.__editorInput.closest('[hidden],[inert],[aria-hidden=true]') && scrollY===window.__editorScroll")
    page.get_by_role('heading',name='Edit Product',exact=True).wait_for()
    assert page.get_by_label('Product name',exact=True).input_value()=='Emulator Renamed'
    page.get_by_role('button',name='Save Changes',exact=True).click()
    page.get_by_text('Product saved.',exact=True).wait_for()
    assert saves[-1]['product']['slug']==slug
    public.reload();public.get_by_role('heading',name='Emulator Renamed',exact=True).wait_for()
    page.get_by_label('Stock type',exact=True).select_option('variants')
    for label,value in [('Colour 1 name','Wine'),('Colour 1 stock','2')]:page.get_by_label(label,exact=True).fill(value)
    page.get_by_role('button',name='Add colour',exact=True).click()
    for label,value in [('Colour 2 name','Gold'),('Colour 2 stock','0')]:page.get_by_label(label,exact=True).fill(value)
    page.get_by_label('Stock type',exact=True).select_option('simple')
    assert page.get_by_label('Stock quantity',exact=True).input_value()=='2'
    page.get_by_label('Stock type',exact=True).select_option('variants')
    assert page.get_by_label('Colour 1 name',exact=True).input_value()=='Wine'
    assert page.get_by_label('Colour 1 stock',exact=True).input_value()=='2'
    page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    assert 'quantity' not in saves[-1]['product']['inventory']
    public.reload();public.get_by_role('button',name='Gold',exact=True).click();public.get_by_text('Out of stock',exact=True).wait_for()
    assert public.get_by_role('button',name='Increase quantity',exact=True).is_disabled()

    page.get_by_label('Description',exact=True).fill('Save retry description retained')
    def deny_save(route):
        if route.request.method=='POST' and route.request.post_data_json.get('action')=='save':route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Synthetic save failure"}')
        else:route.continue_()
    page.route('**/api/catalog',deny_save)
    page.get_by_role('button',name='Save Changes',exact=True).click()
    page.get_by_role('alert').filter(has_text='Synthetic save failure').wait_for()
    assert page.get_by_label('Description',exact=True).input_value()=='Save retry description retained'
    page.unroute('**/api/catalog',deny_save)
    page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    page.get_by_label('Replace photo 2',exact=True).set_input_files({'name':'replacement.png','mimeType':'image/png','buffer':png})
    page.get_by_text('Photos are uploading. Please wait before saving.',exact=True).wait_for(state='hidden')
    page.get_by_label('Photo 2 description',exact=True).wait_for()
    page.get_by_role('button',name='Remove image 2',exact=True).click()
    page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    page.get_by_label('Product name',exact=True).fill('Unsaved product name')
    page.get_by_role('button',name='Manage Categories',exact=True).last.click()
    page.get_by_role('button',name='Back to product',exact=True).click()
    assert page.url==edit_url
    assert page.get_by_label('Product name',exact=True).input_value()=='Unsaved product name'
    page.once('dialog',lambda dialog:dialog.dismiss())
    page.get_by_role('button',name='Back to Products',exact=True).click()
    assert page.url==edit_url
    page.once('dialog',lambda dialog:dialog.accept())
    page.get_by_role('button',name='Back to Products',exact=True).click()
    page.get_by_role('heading',name='Products & Stock',exact=True).wait_for()
    page.get_by_role('heading',name='Emulator Renamed',exact=True).wait_for()
    assert page.get_by_text('Unsaved product name',exact=True).count()==0
    page.goto(edit_url)
    page.get_by_text('Storefront options',exact=True).click()
    page.get_by_label('Status',exact=True).select_option('Archived')
    page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    public.reload();public.get_by_role('heading',name='Product not found',exact=True).wait_for()
    page.get_by_label('Status',exact=True).select_option('Published')
    page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    page.get_by_role('button',name='Manage Categories',exact=True).last.click()
    page.get_by_role('button',name='Edit Browser Beta',exact=True).click()
    dialog=page.get_by_role('dialog',name='Edit category',exact=True);dialog.get_by_label('Enabled on storefront',exact=True).uncheck()
    dialog.get_by_role('button',name='Save category',exact=True).click();page.get_by_text('Category saved.',exact=True).wait_for()
    public.reload();public.get_by_role('heading',name='Product not found',exact=True).wait_for()
    page.get_by_role('button',name='Edit Browser Beta',exact=True).click()
    dialog=page.get_by_role('dialog',name='Edit category',exact=True);dialog.get_by_label('Enabled on storefront',exact=True).check()
    dialog.get_by_role('button',name='Save category',exact=True).click();page.get_by_text('Category saved.',exact=True).wait_for()
    page.get_by_role('button',name='Back to product',exact=True).click();page.get_by_label('Product name',exact=True).wait_for()
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

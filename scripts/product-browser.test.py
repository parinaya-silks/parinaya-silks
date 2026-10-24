"""Real SDK/API against loopback emulators; Cloudinary uploads/metadata are fixtures."""
import base64,json,os,re,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
def fixture(action,*args):subprocess.run(['node','--import','tsx','scripts/products-fixture-control.ts',action,*args],capture_output=True,check=True)
fixture('seed')
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=')

with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844})
    for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
        context.route(pattern,lambda route:route.abort())
    context.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.fulfill(status=200,content_type='image/png',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
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
    page.goto(origin+'/admin/products')
    page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
    page.set_viewport_size({'width':1440,'height':1000})
    listing=page.get_by_role('region',name='Products catalogue',exact=True);expect(listing.get_by_text('63 sarees found',exact=True)).to_be_visible()
    expect(listing.locator('table tbody tr')).to_have_count(10)
    listing.get_by_label('Search products',exact=True).fill('PS-FIXTURE-62');expect(listing.get_by_text('1 sarees found',exact=True)).to_be_visible();expect(listing.locator('table tbody tr')).to_have_count(1)
    listing.get_by_role('button',name='Edit Details',exact=True).first.click();page.get_by_label('Product name',exact=True).wait_for();page.go_back();expect(listing.get_by_label('Search products',exact=True)).to_have_value('PS-FIXTURE-62');page.go_forward();page.get_by_label('Product name',exact=True).wait_for();page.get_by_role('button',name='Back to Products',exact=True).click();expect(listing.get_by_label('Search products',exact=True)).to_have_value('PS-FIXTURE-62')
    listing.get_by_role('button',name='Clear filters',exact=True).click();listing.get_by_role('button',name='Next',exact=True).click();expect(listing.get_by_text('Page 2 of 7',exact=True)).to_be_visible()
    listing.get_by_label('Sort products',exact=True).select_option('price-high');expect(listing.locator('table tbody tr').first).to_contain_text('PS-FIXTURE-62')
    listing.get_by_label('Stock filter',exact=True).select_option('out');expect(listing.locator('table tbody tr').first).to_contain_text('Out of stock');listing.get_by_role('button',name='Clear filters',exact=True).click()
    screens=Path('.cache/products-design');screens.mkdir(parents=True,exist_ok=True)
    for width in [320,390,768,1024,1440,1920]:
        page.set_viewport_size({'width':width,'height':1000});page.screenshot(path=str(screens/f'list-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
    page.set_viewport_size({'width':390,'height':900});listing.get_by_role('button',name=re.compile('^Filters')).click();sheet=page.get_by_role('dialog',name='Filter Products',exact=True);sheet.get_by_label('Kanchipuram Silk',exact=True).check();sheet.get_by_label('In Stock (Available Now)',exact=True).check();page.screenshot(path=str(screens/'filters-mobile.png'));sheet.get_by_role('button',name=re.compile('^Apply Filters')).click();expect(sheet).not_to_be_visible();expect(listing.locator('.product-chips').get_by_role('button',name='In stock',exact=True)).to_be_visible()
    listing.get_by_role('button',name='Clear filters',exact=True).click();page.set_viewport_size({'width':1440,'height':1000});listing.get_by_label('Search products',exact=True).fill('PS-FIXTURE-62')
    with page.expect_download() as downloaded:listing.get_by_role('button',name='Export CSV',exact=True).click()
    data=Path(downloaded.value.path()).read_text(encoding='utf-8-sig');assert 'PS-FIXTURE-62' in data and 'PS-FIXTURE-61' not in data
    listing.get_by_role('button',name='Clear filters',exact=True).click()
    # A failed page remains a failure, not a successful empty/partial catalogue.
    failures={'on':True}
    def failed_list(route):
        body=route.request.post_data_json if route.request.method=='POST' else {}
        if body.get('action')=='list' and failures['on']:route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Catalogue fixture unavailable"}')
        else:route.continue_()
    page.route('**/api/catalog',failed_list);page.reload();page.get_by_role('alert').filter(has_text='Catalogue fixture unavailable').wait_for();assert page.get_by_text('No products yet',exact=True).count()==0;failures['on']=False;page.get_by_role('button',name='Reload products',exact=True).click();listing.wait_for();page.unroute('**/api/catalog',failed_list)
    listing.get_by_role('button',name='Add Product',exact=True).click();page.get_by_role('heading',name='Add Product',exact=True).wait_for()
    accept={'value':True};page.on('dialog',lambda d:d.accept() if accept['value'] else d.dismiss())
    lost={'on':True}
    def lose_save_reply(route):
        body=route.request.post_data_json if route.request.method=='POST' else {}
        if body.get('action')=='save' and lost['on']:
            result=route.fetch();assert result.status==200;lost['on']=False;route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Save reply could not be confirmed"}')
        else:route.continue_()
    page.route('**/api/catalog',lose_save_reply)
    page.get_by_label('Product name',exact=True).fill('Emulator Saree');page.locator('#product-editor').evaluate('(form)=>{form.requestSubmit();form.requestSubmit();}')
    page.get_by_role('alert').filter(has_text='Save reply could not be confirmed').wait_for();assert len(saves)==1;expect(page.get_by_label('Product name',exact=True)).to_have_value('Emulator Saree');page.get_by_role('button',name='Save Draft',exact=True).click()

    page.get_by_role('heading',name='Edit Product',exact=True).wait_for();page.get_by_text('Product saved.',exact=True).wait_for();assert len(saves)==2;assert saves[0]['id']==saves[1]['id'] and saves[0]['operationId']==saves[1]['operationId'];page.unroute('**/api/catalog',lose_save_reply)
    edit_url=page.url;product_id=edit_url.split('/')[-1];sku=saves[-1]['product']['sku'];slug=saves[-1]['product']['slug'];page.reload();expect(page.get_by_label('Product code',exact=True)).to_have_value(sku);assert page.get_by_label('Product code',exact=True).get_attribute('readonly') is not None
    page.get_by_role('button',name='Publish Product',exact=True).click();page.get_by_role('alert').filter(has_text='Check the highlighted fields').wait_for();assert len(saves)==2
    page.get_by_label('Description',exact=True).fill('Emulator-only saree description');page.get_by_role('button',name='Create Category',exact=True).click();category=page.get_by_role('dialog',name='Add category',exact=True)
    category.get_by_label('Name',exact=True).fill('Kanchipuram Silk');category.get_by_role('button',name='Create Category',exact=True).click();expect(category.get_by_role('alert')).to_contain_text('already in use')
    category.get_by_label('Name',exact=True).fill('New Local Sarees');category.get_by_label('Enabled on storefront',exact=True).check();category.get_by_role('button',name='Create Category',exact=True).click();category.wait_for(state='hidden');expect(page.get_by_label('Description',exact=True)).to_have_value('Emulator-only saree description');expect(page.get_by_label('Category',exact=True)).to_contain_text('New Local Sarees')
    page.get_by_label('Selling price (₹)',exact=True).fill('1250.05');page.get_by_label('Original price (₹, optional)',exact=True).fill('1500.00');page.get_by_label('Stock quantity',exact=True).fill('2')
    page.get_by_label('Add photos',exact=True).set_input_files([{'name':'first.png','mimeType':'image/png','buffer':png},{'name':'second.png','mimeType':'image/png','buffer':png}]);page.get_by_role('button',name='Retry first.png',exact=True).wait_for();page.get_by_role('button',name='Publish Product',exact=True).click();page.get_by_role('alert').filter(has_text='Resolve or dismiss').wait_for();page.get_by_role('button',name='Retry first.png',exact=True).click();page.get_by_label('Photo 2 description',exact=True).wait_for()
    page.get_by_label('Photo 1 description',exact=True).fill('Full saree');page.get_by_label('Photo 2 description',exact=True).fill('Border detail');page.get_by_label('Cover image 2',exact=True).check();page.get_by_role('button',name='Move image 2 earlier',exact=True).click();expect(page.get_by_label('Photo 1 description',exact=True)).to_have_value('Border detail')
    page.get_by_label('Featured',exact=True).check();page.get_by_label('New Arrival',exact=True).check();page.get_by_role('button',name='Publish Product',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();assert saves[-1]['product']['featured'] and saves[-1]['product']['newArrival'];assert saves[-1]['product']['pricePaise']==125005;assert saves[-1]['product']['sku']==sku and saves[-1]['product']['slug']==slug
    public_context=browser.new_context();public_context.route('https://res.cloudinary.com/parinaya-emulator/**',lambda r:r.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()));public=public_context.new_page();public.goto(origin+'/product/'+slug);public.get_by_role('heading',name='Emulator Saree',exact=True).wait_for()
    for storefront_route in ['/', '/shop?search='+sku, '/collections/new-local-sarees', '/product/'+slug]:
        public.goto(origin+storefront_route);public.get_by_role('heading',name='Emulator Saree',exact=True).first.wait_for()
    page.get_by_role('heading',name='More Saree Details (Optional)',exact=True).click();page.get_by_label('Fabric (optional)',exact=True).fill('Owner entered fabric');page.get_by_label('Care instructions (optional)',exact=True).fill('Owner entered care');page.get_by_role('heading',name='More Saree Details (Optional)',exact=True).click()
    page.get_by_label('Replace photo 2',exact=True).set_input_files({'name':'replacement.png','mimeType':'image/png','buffer':png});expect(page.get_by_label('Replace photo 2',exact=True)).to_be_enabled();page.get_by_role('button',name='Remove image 2',exact=True).click();page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();assert len(saves[-1]['product']['images'])==1;assert saves[-1]['product']['fabric']=='Owner entered fabric' and saves[-1]['product']['careInstructions']=='Owner entered care'
    page.get_by_label('Description',exact=True).fill('Price and photo edits stay safe during stock change');fixture('stock-race',product_id);page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_role('alert').filter(has_text='another session').wait_for();page.get_by_role('button',name='Load latest stock and keep edits',exact=True).click();expect(page.get_by_label('Stock quantity',exact=True)).to_have_value('1');expect(page.get_by_label('Description',exact=True)).to_have_value('Price and photo edits stay safe during stock change');page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();assert saves[-1]['product']['inventory']['quantity']==1
    page.get_by_label('Original price (₹, optional)',exact=True).fill('1250.05');page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();assert saves[-1]['product']['pricePaise']==125005
    page.get_by_label('Original price (₹, optional)',exact=True).fill('');page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();assert saves[-1]['product']['originalPricePaise'] is None
    # Stable variants, confirmation on stock-mode changes, no stock multiplication.
    accept['value']=False;page.get_by_role('button',name='Stock by colour',exact=True).click();expect(page.get_by_role('button',name='One stock count',exact=True)).to_have_attribute('aria-pressed','true');accept['value']=True;page.get_by_role('button',name='Stock by colour',exact=True).click();page.get_by_label('Colour 1 name',exact=True).fill('Wine');page.get_by_label('Colour 1 stock',exact=True).fill('1');page.get_by_role('button',name='Increase colour 1 stock',exact=True).click();expect(page.get_by_label('Colour 1 stock',exact=True)).to_have_value('2');page.get_by_role('button',name='Add colour',exact=True).click();page.get_by_label('Colour 2 name',exact=True).fill('Gold');page.get_by_label('Colour 2 stock',exact=True).fill('0');page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();variant_ids=[v['id'] for v in saves[-1]['product']['inventory']['variants']];page.get_by_role('button',name='Move colour 2 earlier',exact=True).click();page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();assert [v['id'] for v in saves[-1]['product']['inventory']['variants']]==list(reversed(variant_ids))
    public.reload();public.get_by_role('button',name='Gold',exact=True).click();public.get_by_text('Out of stock',exact=True).wait_for()
    page.get_by_label('Product name',exact=True).fill('Unsaved product name');page.get_by_label('Product name',exact=True).focus();page.evaluate("window.__field=document.activeElement;window.__scroll=scrollY;for(let i=0;i<8;i++){dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));}");assert page.evaluate('document.activeElement===window.__field && window.__field.isConnected && scrollY===window.__scroll')
    accept['value']=False;page.get_by_role('button',name='Back to Products',exact=True).click();assert page.url==edit_url;accept['value']=True
    for width in [320,390,768,1024,1440,1920]:
        page.set_viewport_size({'width':width,'height':1000});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(screens/f'editor-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
        if width<768:
            assert page.locator('.product-editor-mobile-actions').evaluate('(bar)=>[...bar.children].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth})'),width
            if width==390:page.screenshot(path=str(screens/'editor-mobile-viewport.png'))
    page.set_viewport_size({'width':390,'height':900});page.get_by_role('button',name='Save Changes',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();page.reload();expect(page.get_by_label('Photo 1 description',exact=True)).to_have_value('Border detail')
    page.get_by_role('button',name='Archive product',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();assert saves[-1]['product']['status']=='Archived';public.reload();public.get_by_role('heading',name='Product not found',exact=True).wait_for()
    page.get_by_role('button',name='Back to Products',exact=True).click();listing.wait_for();listing.get_by_label('Search products',exact=True).fill(sku)
    page.set_viewport_size({'width':1440,'height':1000});listing.get_by_role('button',name=re.compile('^Actions for')).first.click();listing.get_by_role('button',name='Publish Product',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();listing.get_by_role('button',name=re.compile('^Actions for')).first.click();listing.get_by_role('button',name='Unpublish',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for();listing.get_by_role('button',name=re.compile('^Actions for')).first.click();listing.get_by_role('button',name='Archive',exact=True).click();page.get_by_role('dialog',name='Archive product',exact=True).get_by_role('button',name='Confirm Archive',exact=True).click();page.get_by_text('Product saved.',exact=True).wait_for()
    assert '(?)' not in page.locator('body').inner_text();assert not errors,errors;assert context.request.post(origin+'/api/catalog',data={'action':'list'}).status==401
    print('Products Stitch browser passed: complete catalogue, filters/sort/pages/context/CSV, retry, category creation/duplicates, stable identifiers, pricing, photo retry/cover/order, stock conflicts/modes/variants, lifecycle, unsaved/focus, storefront and six widths')
    browser.close()

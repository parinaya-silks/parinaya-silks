"""Administrator coupons/content and public projections with local API/media fixtures."""
import base64,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/business-browser');screens.mkdir(parents=True,exist_ok=True)
png=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII=')
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce')
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda route:route.abort())
 ctx.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.fulfill(status=200,content_type='image/png',body=png))
 def upload(route):
  if route.request.method=='OPTIONS':route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'*'});return
  public_id=re.search(b'name="public_id"\r\n\r\n([^\r]+)',route.request.post_data_buffer).group(1).decode();ctx.request.post('http://127.0.0.1:3200/test/upload',data={'publicId':public_id});route.fulfill(status=200,headers={'Access-Control-Allow-Origin':'*'},content_type='application/json',body='{}')
 ctx.route('https://api.cloudinary.com/v1_1/parinaya-emulator/image/upload',upload)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)));page.goto(origin+'/admin/coupons');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
 page.get_by_label('Code',exact=True).fill('BROWSER10');page.get_by_label(re.compile(r'Percentage \(1')).fill('10');page.get_by_label('Enabled',exact=True).check();page.get_by_role('button',name='Save coupon',exact=True).click();page.get_by_text('Coupon saved.',exact=True).wait_for();page.reload();page.get_by_role('button',name=re.compile('BROWSER10')).click();expect(page.get_by_label('Code',exact=True)).to_have_value('BROWSER10')
 for width in [320,375,390,768,1024,1440]:
  page.set_viewport_size({'width':width,'height':900});page.screenshot(path=str(screens/f'coupons-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
 page.goto(origin+'/admin/settings');section=page.get_by_role('heading',name='Homepage and store content',exact=True).locator('xpath=ancestor::section[1]');section.get_by_role('button',name='Add banner',exact=True).click();section.get_by_label('Banner title',exact=True).fill('Approved emulator banner');section.get_by_label('Destination (internal shop/product/category or HTTPS)',exact=True).fill('/shop');section.get_by_label('Choose desktop image',exact=True).set_input_files({'name':'home-test.png','mimeType':'image/png','buffer':png});section.get_by_role('button',name='Upload selected image',exact=True).click();section.get_by_label('Alt text',exact=True).wait_for();section.get_by_label('Alt text',exact=True).fill('Emulator desktop banner');section.get_by_label('Visible after Save',exact=True).check()
 assert ctx.request.get(origin+'/api/catalog?content=store').json()['banners']==[],'Upload must not publish a banner'
 section.get_by_label('privacy policy',exact=True).fill('Unapproved private emulator draft');section.get_by_role('button',name='Save store content',exact=True).click();section.get_by_text('Store content saved.',exact=False).wait_for();value=ctx.request.get(origin+'/api/catalog?content=store').json();assert len(value['banners'])==1 and value['policies']['privacy']['text']==''
 section.get_by_label('Banner title',exact=True).fill('Unsaved change');section.get_by_role('button',name='Cancel store content',exact=True).click();expect(section.get_by_label('Banner title',exact=True)).to_have_value('Approved emulator banner')
 visitor=ctx.new_page();visitor.goto(origin+'/');visitor.get_by_text('Approved emulator banner',exact=True).wait_for();visitor.goto(origin+'/privacy-policy');assert 'Unapproved private emulator draft' not in visitor.locator('body').inner_text()
 for width in [320,375,390,768,1024,1440]:
  for route in ['/admin/customers','/admin/dashboard']:
   page.goto(origin+route);page.get_by_role('heading',name='Customers' if route.endswith('customers') else 'Dashboard',exact=True).wait_for();page.set_viewport_size({'width':width,'height':900});page.screenshot(path=str(screens/f'{route.rsplit(chr(47),1)[-1]}-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(route,width)
 assert not errors,errors
 browser.close();print('Business browser passed: coupon persistence, verified unpublished banner upload, Save/Cancel, private policy drafts, customer/report screens and six widths (Cloudinary fixtures only).')

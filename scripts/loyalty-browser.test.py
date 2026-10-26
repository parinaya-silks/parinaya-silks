"""Loyalty UI backed by loopback API/Auth/Firestore. No production requests."""
import os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action,script='loyalty'):
 subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',action],check=True)
origin='http://127.0.0.1:3100';screens=Path('.cache/loyalty-design');screens.mkdir(parents=True,exist_ok=True)
fixture('seed','shopping');fixture('seed','cod')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();admin=browser.new_context(viewport={'width':1440,'height':1000});customer=browser.new_context(viewport={'width':390,'height':900});errors=[]
  for ctx in [admin,customer]:ctx.route('https://**/*',lambda r:r.abort())
  a=admin.new_page();a.on('pageerror',lambda e:errors.append(str(e)));a.goto(origin+'/admin/settings');a.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');a.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);a.get_by_role('button',name='Sign In',exact=True).click();card=a.get_by_role('region',name='Loyalty Points settings');expect(card).to_be_visible();expect(a.get_by_label('Enable loyalty',exact=True)).not_to_be_checked()
  a.get_by_label('Enable loyalty',exact=True).check();a.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first.click();expect(a.get_by_role('alert')).to_contain_text('positive whole-number')
  for label,value in [('Spend amount to earn (₹)','100'),('Points earned for this spend','10'),('Rupee value per point','1'),('Minimum points to redeem','10'),('Maximum merchandise percentage','50')]:a.get_by_label(label,exact=True).fill(value)
  expect(card).to_contain_text('Spend ₹100 to earn 10 points');a.evaluate("window.dispatchEvent(new Event('focus'))");expect(a.get_by_label('Minimum points to redeem',exact=True)).to_have_value('10');a.get_by_role('button',name='Save Changes',exact=True).filter(visible=True).first.click();expect(a.get_by_text('Store settings updated.',exact=True)).to_be_visible();a.reload();expect(a.get_by_label('Enable loyalty',exact=True)).to_be_checked()
  fixture('earn')
  page=customer.new_page();page.on('pageerror',lambda e:errors.append(str(e)));fail={'account':True}
  def api(route):
   if route.request.method=='POST' and route.request.post_data_json.get('action')=='loyalty:account' and fail['account']:fail['account']=False;route.fulfill(status=503,json={'code':'unavailable'});return
   route.continue_()
  page.route('**/api/catalog',api);page.goto(origin+'/account');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();panel=page.get_by_role('region',name='Loyalty Points',exact=True);expect(panel).to_contain_text('Unable to load points');panel.get_by_role('button',name='Refresh points',exact=True).click();expect(panel).to_contain_text('123 available points');expect(panel).to_contain_text('Earned: +123')
  def widths(page,name):
   for width in [320,390,768,1024,1440,1920]:
    page.set_viewport_size({'width':width,'height':900});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(name,width)
    if width in [320,1440]:page.screenshot(path=str(screens/f'{name}-{width}.png'),full_page=True)
  widths(page,'account');widths(a,'settings')
  page.goto(origin+'/checkout');points=page.get_by_role('region',name='Loyalty points',exact=True);expect(points).to_contain_text('123 available points');points.get_by_label('Points to use',exact=True).fill('20');points.get_by_role('button',name='Apply Points',exact=True).click();expect(points).to_contain_text('₹20');points.get_by_role('button',name='Remove Points',exact=True).click();expect(points).to_contain_text('(0 points)');points.get_by_label('Points to use',exact=True).fill('20');points.get_by_role('button',name='Apply Points',exact=True).click();expect(points).to_contain_text('(20 points)');widths(page,'checkout');page.get_by_role('button',name='Continue to Summary',exact=True).click();page.get_by_role('button',name='Continue to Payment',exact=True).click();expect(page.get_by_role('region',name='Loyalty points',exact=True)).to_contain_text('(20 points)');page.get_by_role('button',name='Place COD Order',exact=True).click();page.wait_for_url('**/order-confirmed/*');oid=page.url.rsplit('/',1)[1];expect(page.get_by_role('region',name='Order loyalty points',exact=True)).to_contain_text('reserved');widths(page,'customer-order')
  fixture('prepare-refund');a.goto(origin+'/admin/orders/'+oid);expect(a.get_by_role('region',name='Order loyalty points',exact=True)).to_contain_text('121 points earned');a.get_by_label('Action',exact=True).select_option('manual-refund');a.get_by_label('External reference',exact=True).fill('BROWSER-LOYALTY-REFUND');a.get_by_label('External refund method',exact=True).fill('External fixture');a.get_by_label('Amount (INR)',exact=True).fill('1214.05');a.get_by_label('Returned basis line 1',exact=True).fill('1234.05');widths(a,'refund');a.get_by_role('button',name='Save action',exact=True).click();a.wait_for_timeout(500);assert a.get_by_role('dialog').count(),a.get_by_role('alert').all_text_contents();a.get_by_role('button',name='Confirm action',exact=True).click();expect(a.get_by_role('region',name='Order loyalty points',exact=True)).to_contain_text('20 redeemed points restored');fixture('assert')
  a.goto(origin+'/admin/customers/test-customer');expect(a.get_by_role('region',name='Loyalty Points',exact=True)).to_contain_text('123 available points');widths(a,'admin-customer');page.goto(origin+'/account');expect(page.get_by_role('region',name='Loyalty Points',exact=True)).to_contain_text('123 available points');page.get_by_role('button',name='Sign out',exact=True).click();expect(page.get_by_role('region',name='Loyalty Points',exact=True)).to_have_count(0);assert not errors,errors;browser.close()
 print('Loyalty browser passed: saved/invalid settings, account retry, Apply/Remove, staged quote, order placement and refund, admin/customer summaries, sign-out cleanup and 320-1920px overflow checks.')
finally:
 fixture('cleanup');fixture('cleanup','cod');fixture('cleanup','shopping')

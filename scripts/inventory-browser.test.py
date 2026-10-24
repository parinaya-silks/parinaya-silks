"""Real local SDK/API inventory workflow; only isolated loopback fixtures mutate."""
import csv,io,json,os,re,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(action,*args):subprocess.run(['node','--import','tsx','scripts/products-fixture-control.ts',action,*args],capture_output=True,check=True)
fixture('seed')
origin='http://127.0.0.1:3100'
screens=Path('.cache/inventory-design');screens.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();context=browser.new_context(viewport={'width':1440,'height':1000})
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:context.route(pattern,lambda route:route.abort())
 context.route('https://res.cloudinary.com/parinaya-emulator/**',lambda route:route.fulfill(status=200,content_type='image/jpeg',body=Path('public/assets/customer-auth-portrait.jpg').read_bytes()))
 page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:requests.append(r.post_data_json) if '/api/catalog' in r.url and r.method=='POST' else None)
 page.goto(origin+'/admin/inventory');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
 overview=page.get_by_role('region',name='Inventory overview',exact=True);expect(overview.get_by_text('63 of 63 products',exact=True)).to_be_visible();expect(overview.locator('table tbody tr')).to_have_count(10)
 other=context.new_page();stock_reads=[];other.on('request',lambda r:stock_reads.append(1) if '/api/catalog' in r.url and r.method=='POST' and r.post_data_json.get('action')=='inventory:low' else None);other.goto(origin+'/admin/dashboard');other.get_by_role('region',name='Low Stock',exact=True).get_by_role('heading',name='Low Stock',exact=True).wait_for();other.wait_for_timeout(500);before_stock_reads=len(stock_reads)
 overview.get_by_role('button',name='Next',exact=True).click();expect(overview.get_by_text('Page 2 of 7',exact=True)).to_be_visible()
 overview.get_by_label('Search inventory',exact=True).fill('PS-FIXTURE-61');expect(overview.get_by_text('1 of 63 products',exact=True)).to_be_visible()
 overview.get_by_role('button',name='Adjust Stock',exact=True).filter(visible=True).first.click();drawer=page.get_by_role('dialog',name='Adjust Stock',exact=True);expect(drawer).to_be_visible()
 drawer.get_by_label('Adjustment quantity',exact=True).fill('3');drawer.get_by_label('Adjustment reason',exact=True).select_option('Physical count correction');drawer.get_by_label('Audit notes',exact=True).fill('Keep these entered values')
 page.evaluate("window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'))");expect(drawer.get_by_label('Adjustment quantity',exact=True)).to_have_value('3')
 drawer.get_by_role('button',name='Review Adjustment',exact=True).click();expect(drawer.get_by_text('Review before saving',exact=True)).to_be_visible()
 fixture('stock-race','p'+str(61).zfill(19));drawer.get_by_role('button',name='Confirm & Update Stock',exact=True).click();drawer.get_by_role('button',name='Load latest stock and keep adjustment',exact=True).wait_for();expect(drawer.get_by_label('Audit notes',exact=True)).to_have_value('Keep these entered values')
 drawer.get_by_role('button',name='Load latest stock and keep adjustment',exact=True).click();expect(drawer.get_by_role('alert')).to_contain_text('Latest quantities loaded')
 drawer.get_by_role('button',name='Review Adjustment',exact=True).click();drawer.get_by_role('button',name='Confirm & Update Stock',exact=True).click();expect(drawer).not_to_be_visible();expect(overview.get_by_text('1 of 63 products',exact=True)).to_be_visible();expect(overview.locator('table tbody tr').first.locator('td').nth(4)).to_contain_text('4')
 for _ in range(30):
  if len(stock_reads)>before_stock_reads:break
  other.wait_for_timeout(100)
 assert len(stock_reads)>before_stock_reads,'Inventory success must refresh dashboard stock in another tab'
 other.close()
 # A committed request with a lost response must retry the exact operation once.
 overview.get_by_role('button',name='Adjust Stock',exact=True).filter(visible=True).first.click();drawer.get_by_label('Adjustment quantity',exact=True).fill('1');drawer.get_by_label('Adjustment reason',exact=True).select_option('New stock received')
 lost={'pending':True}
 def lose_response(route):
  if route.request.method=='POST' and route.request.post_data_json.get('action')=='inventory:adjust' and lost['pending']:
   lost['pending']=False;route.fetch();route.fulfill(status=503,content_type='application/json',body=json.dumps({'code':'unavailable','message':'Response interrupted. Retry this adjustment.'}));return
  route.continue_()
 page.route('**/api/catalog',lose_response);drawer.get_by_role('button',name='Review Adjustment',exact=True).click();drawer.get_by_role('button',name='Confirm & Update Stock',exact=True).click();drawer.get_by_role('alert').wait_for();drawer.get_by_role('button',name='Confirm & Update Stock',exact=True).click();expect(drawer).not_to_be_visible();page.unroute('**/api/catalog',lose_response)
 last=[r for r in requests if r.get('action')=='inventory:adjust'];assert last[-1]==last[-2]
 expect(overview.get_by_text('1 of 63 products',exact=True)).to_be_visible();expect(overview.locator('table tbody tr').first.locator('td').nth(4)).to_contain_text('5')
 # A threshold-only adjustment records a real threshold event, with no quantity delta.
 overview.get_by_role('button',name='Adjust Stock',exact=True).filter(visible=True).first.click();drawer.get_by_label('Adjustment quantity',exact=True).fill('0');drawer.get_by_label('Product-wide low stock threshold',exact=True).fill('8');drawer.get_by_label('Adjustment reason',exact=True).select_option('Other administrative adjustment');drawer.get_by_role('button',name='Review Adjustment',exact=True).click();drawer.get_by_role('button',name='Confirm & Update Stock',exact=True).click();expect(drawer).not_to_be_visible();expect(overview.get_by_text('1 of 63 products',exact=True)).to_be_visible()
 overview.get_by_role('button',name=re.compile('^History for')).filter(visible=True).first.click();history=page.get_by_role('dialog',name='Stock Audit History',exact=True);expect(history.get_by_text('3 recorded events',exact=False)).to_be_visible();expect(history.get_by_text('Threshold update',exact=True)).to_be_visible();history.get_by_label('History source',exact=True).select_option('order');expect(history.get_by_text('No recorded changes match this scope.',exact=True)).to_be_visible();history.get_by_label('History source',exact=True).select_option('all')
 for width in [390,1440]:page.set_viewport_size({'width':width,'height':900});page.screenshot(path=str(screens/f'history-{width}.png'),full_page=False)
 history.get_by_role('button',name='Close History',exact=True).click()
 subprocess.run(['node','--import','tsx','scripts/inventory-fixture-control.ts','p'+str(61).zfill(19)],capture_output=True,check=True)
 overview.get_by_role('button',name=re.compile('^History for')).filter(visible=True).first.click();expect(history.get_by_text('29 recorded events',exact=False)).to_be_visible();expect(history.locator('ol li')).to_have_count(10);history.get_by_role('button',name='Older changes',exact=True).click();expect(history.get_by_text('2 / 3',exact=True)).to_be_visible();history.get_by_label('History source',exact=True).select_option('order');expect(history.get_by_text('13 recorded events',exact=False)).to_be_visible();expect(history.get_by_role('button',name=re.compile('^View Order PS-')).first).to_be_visible();history.get_by_role('button',name='Older changes',exact=True).click();expect(history.locator('ol li')).to_have_count(3);history.get_by_role('button',name='Close History',exact=True).click();overview.get_by_role('button',name='Clear Filters',exact=True).click()
 # All 63 products, including 21 colour products with 2 colours each: 84 CSV rows.
 overview.get_by_role('button',name='Export Inventory',exact=True).click();export=page.get_by_role('dialog',name='Export Inventory',exact=True)
 with page.expect_download() as download:export.get_by_role('button',name='Generate & Download CSV',exact=True).click()
 rows=list(csv.reader(io.StringIO(Path(download.value.path()).read_text(encoding='utf-8-sig'))));assert len(rows)==85,len(rows)
 overview.get_by_label('Search inventory',exact=True).fill('nothing-match');expect(overview.get_by_text('No stock items match these filters',exact=True)).to_be_visible();overview.get_by_role('button',name='Clear Filters',exact=True).click()
 # A zero colour stays separate from the product total; all colour identities remain stable.
 overview.get_by_label('Search inventory',exact=True).fill('PS-FIXTURE-62');page.set_viewport_size({'width':1440,'height':1000});overview.get_by_role('button',name='2 colourways',exact=True).click();expect(overview.locator('table tbody tr')).to_have_count(3);overview.locator('table tbody tr').nth(1).get_by_role('button',name='Adjust Stock',exact=True).click();drawer.get_by_role('button',name='Set Final Quantity',exact=True).click();drawer.get_by_label('Adjustment quantity',exact=True).fill('0');drawer.get_by_label('Adjustment reason',exact=True).select_option('Damaged stock removed');drawer.get_by_role('button',name='Review Adjustment',exact=True).click();drawer.get_by_role('button',name='Confirm & Update Stock',exact=True).click();expect(drawer).not_to_be_visible();expect(overview.get_by_text('1 of 63 products',exact=True)).to_be_visible();expect(overview.locator('table tbody tr').nth(1)).to_contain_text('Out of stock');expect(overview.locator('table tbody tr').nth(2)).to_contain_text('3')
 overview.get_by_role('button',name='Clear Filters',exact=True).click()
 for width in [320,390,768,1024,1440,1920]:
  page.set_viewport_size({'width':width,'height':1000});page.screenshot(path=str(screens/f'overview-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
 page.set_viewport_size({'width':390,'height':844});overview.get_by_role('button',name=re.compile('^Filters')).click();filters=page.get_by_role('dialog',name='Filter Inventory',exact=True);filters.get_by_label('Inventory stock',exact=True).select_option('out');filters.get_by_role('button',name=re.compile('^Apply Filters')).click();expect(overview.get_by_text('1 active filters',exact=True)).to_be_visible()
 overview.get_by_role('button',name='Clear Filters',exact=True).click();overview.get_by_label('Search inventory',exact=True).fill('PS-FIXTURE-61');overview.get_by_role('button',name='Adjust Stock',exact=True).filter(visible=True).first.click();drawer.get_by_label('Adjustment quantity',exact=True).fill('2');drawer.get_by_label('Adjustment reason',exact=True).select_option('New stock received')
 for width,height in [(320,844),(390,480),(768,1000),(1440,1000)]:
  page.set_viewport_size({'width':width,'height':height});page.screenshot(path=str(screens/f'adjust-{width}-{height}.png'),full_page=False);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1');box=drawer.get_by_role('button',name='Review Adjustment',exact=True).bounding_box();assert box['y']+box['height']<=height
 page.set_viewport_size({'width':390,'height':844});drawer.get_by_role('button',name='Close Adjust Stock',exact=True).focus();page.keyboard.press('Shift+Tab');expect(drawer.get_by_role('button',name='Review Adjustment',exact=True)).to_be_focused();page.keyboard.press('Tab');expect(drawer.get_by_role('button',name='Close Adjust Stock',exact=True)).to_be_focused();dismiss=lambda d:d.dismiss();page.on('dialog',dismiss);drawer.press('Escape');expect(drawer).to_be_visible();expect(drawer.get_by_label('Adjustment quantity',exact=True)).to_have_value('2')
 # Close via a deliberate accepted discard, not window/tab focus.
 page.remove_listener('dialog',dismiss);page.on('dialog',lambda d:d.accept());drawer.press('Escape');expect(drawer).not_to_be_visible()
 # Read failure is distinct from a genuine empty catalogue and can be retried.
 def fail_read(route):
  if route.request.method=='POST' and route.request.post_data_json.get('action')=='list':route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable"}')
  else:route.continue_()
 page.route('**/api/catalog',fail_read);overview.get_by_role('button',name='Refresh',exact=True).click();expect(overview.get_by_text('Unable to load complete inventory. Please try again.',exact=True)).to_be_visible();expect(overview.get_by_text('No inventory yet',exact=True)).not_to_be_visible();page.unroute('**/api/catalog',fail_read);overview.get_by_role('button',name='Retry inventory',exact=True).click();expect(overview.get_by_text('1 of 63 products',exact=True)).to_be_visible()

 # A successful genuinely empty response is rendered distinctly from a failed read.
 def empty_read(route):
  if route.request.method=='POST' and route.request.post_data_json.get('action')=='list':route.fulfill(status=200,content_type='application/json',body='{"items":[],"nextCursor":null}')
  else:route.continue_()
 page.route('**/api/catalog',empty_read);overview.get_by_role('button',name='Refresh',exact=True).click();expect(overview.get_by_text('No inventory yet',exact=True)).to_be_visible();page.unroute('**/api/catalog',empty_read)
 assert not errors,errors;assert context.request.post(origin+'/api/catalog',data={'action':'inventory:history','productId':'p'+str(61).zfill(19)}).status==401
 print('Inventory browser passed: full catalogue, filters/pagination, simple/colour adjustments, conflict/review, lost-response exact retry, threshold-only audit, history scopes, CSV, dirty state, failures/retry and six viewport widths')
 browser.close()

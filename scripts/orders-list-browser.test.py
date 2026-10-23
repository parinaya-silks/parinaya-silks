"""Orders redesign: isolated loopback records, real APIs and responsive UI."""
import os,subprocess,re,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/orders-list-browser');screens.mkdir(parents=True,exist_ok=True)
def fixture(action):subprocess.run(['node','--import','tsx','scripts/orders-list-fixture-control.ts',action],check=True,capture_output=True)
def reference(n):return 'PS-'+format(n,'032X')
fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
  for pattern in ['https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**','https://firestore.googleapis.com/**','https://res.cloudinary.com/**']:ctx.route(pattern,lambda route:route.abort())
  page=ctx.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(origin+'/admin/orders');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click()
  listing=page.get_by_role('region',name='Orders list',exact=True);listing.wait_for()
  def filters():listing.get_by_role('button',name=re.compile('^Filters')).click();return page.get_by_role('dialog',name='Filter orders')
  sheet=filters();sheet.get_by_label('Date range',exact=True).select_option('custom');sheet.get_by_label('From',exact=True).fill('2026-09-11');sheet.get_by_label('Through',exact=True).fill('2026-09-11');sheet.get_by_role('button',name='Apply filters',exact=True).click()
  expect(listing.locator('table tbody tr')).to_have_count(10);expect(listing.locator('.orders-pagination')).to_contain_text('1–10');assert 'Private list note' not in listing.inner_text()
  listing.get_by_role('button',name='Next',exact=True).click();expect(listing.locator('.orders-pagination')).to_contain_text('11–20');listing.get_by_role('button',name='Next',exact=True).click();expect(listing.locator('.orders-pagination')).to_contain_text('21–25');expect(listing.get_by_role('button',name='Next',exact=True)).to_be_disabled();listing.get_by_role('button',name='Previous',exact=True).click();expect(listing.locator('.orders-pagination')).to_contain_text('11–20')
  # One-page CSV, escaped snapshot values, no private address or account data.
  listing.get_by_role('button',name='Previous',exact=True).click();expect(listing.locator('.orders-pagination')).to_contain_text('1–10')
  with page.expect_download() as download:listing.get_by_role('button',name='Export current page',exact=True).click()
  csv=Path(download.value.path()).read_text(encoding='utf-8-sig');assert len(csv.splitlines())==11;assert "'=List Customer" in csv;assert "'+919876543210" in csv;assert 'private-list@example.test' not in csv and 'Private fixture street' not in csv
  expect(listing.locator('table')).to_contain_text('COD — Part collected')
  # Filter sheet traps focus and Escape restores it. Cancel does not apply drafts.
  sheet=filters();sheet.get_by_role('button',name='Close order filters',exact=True).focus();page.keyboard.press('Shift+Tab');expect(sheet.get_by_role('button',name='Apply filters',exact=True)).to_be_focused();page.keyboard.press('Tab');expect(sheet.get_by_role('button',name='Close order filters',exact=True)).to_be_focused();sheet.get_by_label('Placed',exact=True).check();sheet.press('Escape');expect(sheet).not_to_be_visible();expect(listing.get_by_role('button',name=re.compile('^Filters'))).to_be_focused();expect(listing.locator('.orders-chip').filter(has_text='Status:')).to_have_count(0)
  sheet=filters();sheet.get_by_label('Placed',exact=True).check();sheet.get_by_label('Confirmed',exact=True).check();sheet.get_by_label('Payment / collection status',exact=True).select_option('due');sheet.get_by_role('button',name='Apply filters',exact=True).click();expect(listing.locator('.orders-chip').filter(has_text='Status:')).to_contain_text('Placed, Confirmed')
  expect(listing.locator('table tbody tr')).to_have_count(10)
  # A two-order plan reports a real partial revision failure, removing only
  # the successful row from selection.
  for n in [5020,5015]:listing.locator('table').get_by_label('Select '+reference(n),exact=True).check()
  listing.get_by_label('Bulk action',exact=True).select_option('Confirmed');fixture('conflict');listing.get_by_role('button',name='Apply',exact=True).click();page.get_by_role('dialog',name='Confirm order changes').get_by_role('button',name='Confirm & Apply',exact=True).click();expect(listing.get_by_role('status').filter(has_text='1 orders updated')).to_contain_text('1 failed');expect(listing.get_by_role('region',name='Bulk order actions')).to_contain_text('1 selected');listing.get_by_role('button',name='Clear selection',exact=True).click()
  target=reference(5020);search=listing.get_by_label('Exact order reference',exact=True);search.fill(target.lower());listing.get_by_role('button',name='Search',exact=True).click();expect(listing.locator('table tbody tr')).to_have_count(1)
  listing.locator('table').get_by_role('button',name='View Order',exact=True).click();page.get_by_role('heading',name='Order details',exact=True).wait_for();page.get_by_role('button',name='Back to Orders',exact=True).click();listing.wait_for();expect(listing.get_by_label('Exact order reference',exact=True)).to_have_value(target.lower());expect(listing.locator('table tbody tr')).to_have_count(1);expect(listing.locator('.orders-chip').filter(has_text='Status:')).to_contain_text('Confirmed')
  # Revision conflict is reported and retained; refreshed confirmation succeeds.
  listing.locator('table').get_by_label('Select '+target,exact=True).check();listing.get_by_label('Bulk action',exact=True).select_option('Confirmed');fixture('conflict');listing.get_by_role('button',name='Apply',exact=True).click();page.get_by_role('dialog',name='Confirm order changes').get_by_role('button',name='Confirm & Apply',exact=True).click();expect(listing.get_by_role('status').filter(has_text='0 orders updated')).to_contain_text('1 failed');expect(listing.get_by_role('region',name='Bulk order actions')).to_contain_text('1 selected')
  listing.get_by_role('button',name='Apply',exact=True).click();page.get_by_role('dialog',name='Confirm order changes').get_by_role('button',name='Confirm & Apply',exact=True).click();expect(listing.get_by_role('status').filter(has_text='1 orders updated')).to_be_visible();expect(listing.get_by_role('region',name='Bulk order actions')).to_have_count(0)
  # Remove the status predicate so a successful Processing transition stays
  # on this page and its uncertain receipt can be retried safely.
  listing.locator('.orders-chip').filter(has_text='Status:').click();expect(listing.locator('table tbody tr')).to_have_count(1)
  # Lost success response retries the identical operation; audit occurs once.
  mode={'lost':False};requests=[]
  def lose(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='adminOrders:update' and body.get('command')=='Processing':
    requests.append(body)
    if not mode['lost']:mode['lost']=True;route.fetch();route.abort();return
   route.continue_()
  page.route('**/api/catalog',lose)
  listing.locator('table').get_by_label('Select '+target,exact=True).check();listing.get_by_label('Bulk action',exact=True).select_option('Processing');listing.get_by_role('button',name='Apply',exact=True).click();page.get_by_role('dialog',name='Confirm order changes').get_by_role('button',name='Confirm & Apply',exact=True).click();expect(listing.get_by_role('button',name='Retry uncertain actions safely')).to_be_visible()
  listing.get_by_role('button',name='Retry uncertain actions safely').click();expect(listing.get_by_role('status').filter(has_text='1 orders updated')).to_be_visible();assert len(requests)==2 and requests[0]==requests[1];fixture('assert-once');page.unroute('**/api/catalog',lose)
  # Failure stays an error, retry works, stale reads cannot replace a new query.
  listing.get_by_role('button',name='Clear filters',exact=True).click();expect(listing.locator('table tbody tr')).to_have_count(10)
  mode={'fail':True}
  def fail(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='adminOrders:list' and mode['fail']:route.fulfill(status=503,content_type='application/json',body='{"code":"unavailable","message":"Synthetic failure"}')
   else:route.continue_()
  page.route('**/api/catalog',fail);listing.get_by_label('Exact order reference',exact=True).fill('PS-NOTFOUND');listing.get_by_role('button',name='Search',exact=True).click();expect(listing.get_by_role('alert')).to_contain_text('Unable to load orders');expect(listing.get_by_text('No orders match these criteria',exact=True)).to_have_count(0);mode['fail']=False;listing.get_by_role('button',name='Retry orders',exact=True).click();expect(listing.get_by_text('No orders match these criteria',exact=True)).to_be_visible();page.unroute('**/api/catalog',fail)
  listing.get_by_role('button',name='Clear filters and show all orders').click();expect(listing.locator('table tbody tr')).to_have_count(10)
  # Hold an old response, issue a new exact query, then release the old
  # response. The new query must remain visible.
  held=[]
  def hold(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='adminOrders:list' and body.get('search')==reference(5020):held.append((route,route.fetch()))
   else:route.continue_()
  page.route('**/api/catalog',hold);listing.get_by_label('Exact order reference',exact=True).fill(reference(5020));listing.get_by_role('button',name='Search',exact=True).click()
  for _ in range(50):
   if held:break
   page.wait_for_timeout(100)
  assert held
  listing.get_by_label('Exact order reference',exact=True).fill(reference(5021));listing.get_by_role('button',name='Search',exact=True).click();expect(listing.locator('table tbody tr')).to_have_count(1);expect(listing.locator('table')).to_contain_text(reference(5021))
  for route,response in held:
   try:route.fulfill(response=response)
   except Exception:pass
  page.unroute('**/api/catalog',hold);expect(listing.locator('table')).to_contain_text(reference(5021))
  # A real mutation in another same-account tab refreshes this filtered page,
  # preserving search and clearing selection when the row becomes ineligible.
  listing.locator('table').get_by_label('Select '+reference(5021),exact=True).check()
  other=ctx.new_page();other.goto(origin+'/admin/orders/'+format(5021,'032x'));other.get_by_label('Action',exact=True).select_option('Processing');other.get_by_role('button',name='Save action',exact=True).click();other.get_by_role('dialog',name='Confirm order action',exact=True).get_by_role('button',name='Confirm action',exact=True).click();expect(other.get_by_label('Action',exact=True)).to_have_value('');expect(listing.locator('table .orders-badge[data-status=Processing]')).to_have_count(1,timeout=15000);expect(listing.get_by_role('region',name='Bulk order actions')).to_have_count(0);expect(listing.get_by_label('Exact order reference',exact=True)).to_have_value(reference(5021));other.close()
  listing.get_by_role('button',name='Clear filters',exact=True).click();expect(listing.locator('table tbody tr')).to_have_count(10)
  for width in [320,390,768,1024,1440,1920]:
   page.set_viewport_size({'width':width,'height':1000});page.screenshot(path=str(screens/f'orders-{width}.png'),full_page=True);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
   assert page.locator('.admin-sidebar').evaluate('(e)=>getComputedStyle(e).width')=='192px'
   if width==390:
    page.screenshot(path=str(screens/'orders-mobile-viewport.png'))
    sheet=filters();sheet.get_by_label('Placed',exact=True).check();sheet.get_by_role('button',name='Reset filters',exact=True).click();expect(sheet.get_by_label('Placed',exact=True)).not_to_be_checked();sheet.get_by_role('button',name='Cancel',exact=True).click();expect(sheet).not_to_be_visible()
  assert not errors,errors
  # Empty store is distinct after deleting only this suite's fixtures.
  fixture('cleanup');listing.get_by_label('Exact order reference',exact=True).fill(reference(5020));listing.get_by_role('button',name='Search',exact=True).click();expect(listing.get_by_text('No orders match these criteria',exact=True)).to_be_visible()
  # Sign-out unmounts all private list state; a customer cannot reopen it.
  page.get_by_role('button',name='Sign Out',exact=True).click();page.get_by_role('heading',name='Administrator Sign In',exact=True).wait_for();page.get_by_label('Email',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('heading',name='Access Restricted',exact=True).wait_for();expect(page.get_by_role('region',name='Orders list',exact=True)).to_have_count(0)
  browser.close();print('Orders list browser passed: real filters, pagination, scoped CSV, return context, conflicts, uncertain response safety and six responsive widths.')
except Exception:
 try:
  if 'page' in globals() and page.get_by_role('region',name='Orders list',exact=True).count():page.screenshot(path=str(screens/'failure.png'),full_page=True)
 except Exception:pass
 raise
finally:fixture('cleanup')

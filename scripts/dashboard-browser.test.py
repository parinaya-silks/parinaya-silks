"""Real local dashboard aggregates, actions, synchronization and responsive shell."""
import os,subprocess,re,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100';screens=Path('.cache/dashboard-browser');screens.mkdir(parents=True,exist_ok=True)
def fixture(command,script='dashboard'):
 subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',command],check=True,capture_output=True)
fixture('seed','shopping');fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');ctx.route('https://**/*',lambda route:route.abort())
  page=ctx.new_page();errors=[];requests=[];page.on('pageerror',lambda error:errors.append(str(error)));page.on('request',lambda request:requests.append(request.post_data_json['action']) if '/api/catalog' in request.url and request.method=='POST' else None)
  page.goto(origin+'/admin/dashboard');page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('heading',name='Dashboard',exact=True).wait_for()
  metric=lambda label:page.locator('[data-metric="'+label+'"]')
  expect(metric('New Orders')).to_have_text('2');expect(metric('To Pack')).to_have_text('1');expect(metric('Processing')).to_have_text('1');expect(metric('COD to Collect')).to_contain_text('7,998.30')
  expect(page.locator('.dashboard-metric')).to_have_count(4);expect(page.get_by_role('region',name='Notifications',exact=True)).to_have_count(0)
  assert page.evaluate('getComputedStyle(document.querySelector(".parinaya-admin")).fontFamily.includes("ParinayaLora")');page.evaluate('document.fonts.ready');assert page.evaluate('document.fonts.check("14px ParinayaLora")')
  recent=page.get_by_role('region',name='Recent Orders',exact=True);stock=page.get_by_role('region',name='Low Stock',exact=True)
  expect(recent.locator('table tbody tr')).to_have_count(5);stock.get_by_text('Gold',exact=True).first.wait_for();assert 3<=stock.locator('table tbody tr').count()<=5;expect(stock.locator('table tbody tr').filter(has_text='Shopping Simple')).to_have_count(1);expect(stock.locator('table tbody tr').filter(has_text='Shopping Colours')).to_have_count(2);assert 'Private emulator note' not in page.locator('body').inner_text()
  page.screenshot(path=str(screens/'dashboard-initial-1440.png'),full_page=True)
  # Independent failure keeps successful sections and never fabricates zero.
  mode={'fail':'dashboard:period'}
  def fail_one(route):
   if route.request.method=='POST' and route.request.post_data_json.get('action')==mode['fail']:route.fulfill(status=503,json={'code':'index-required','message':'Synthetic unavailable'})
   else:route.continue_()
  page.route('**/api/catalog',fail_one);page.reload();page.get_by_text('Unable to load new orders. Please try again.',exact=True).wait_for();expect(metric('New Orders')).to_have_text('—');expect(metric('To Pack')).to_have_text('1');mode['fail']='';page.get_by_role('button',name='Retry new orders',exact=True).click();expect(metric('New Orders')).to_have_text('2');page.unroute('**/api/catalog',fail_one)
  # Date controls use explicit IST ranges and preserve current backlog.
  page.get_by_label('Dashboard period',exact=True).select_option('custom');dates=page.get_by_role('dialog',name='Custom date range',exact=True);dates.get_by_label('From',exact=True).fill('2020-01-01');dates.get_by_label('Through',exact=True).fill('2020-01-02');dates.get_by_role('button',name='Apply dates',exact=True).click();expect(metric('New Orders')).to_have_text('0');recent.get_by_text('No matching orders in this period.',exact=True).wait_for();expect(metric('To Pack')).to_have_text('1');page.get_by_role('button',name='Edit custom date range',exact=True).click();expect(dates.get_by_label('From',exact=True)).to_have_value('2020-01-01');dates.get_by_role('button',name='Cancel',exact=True).click();page.get_by_label('Dashboard period',exact=True).select_option('month');expect(metric('New Orders')).to_have_text('2')
  # A second real tab shares the authenticated session and receives debounced changes.
  other=ctx.new_page();other.goto(origin+'/admin/dashboard');expect(other.locator('[data-metric="New Orders"]')).to_have_text('2')
  recent.get_by_role('button',name='New',exact=True).click();expect(recent.locator('table tbody tr')).to_have_count(2);recent.get_by_role('checkbox',name='Select all eligible orders on this page',exact=True).check();recent.get_by_label('Bulk action',exact=True).select_option('Confirmed');recent.get_by_role('button',name='Review action',exact=True).click();fixture('conflict');page.get_by_role('dialog',name='Confirm order changes',exact=True).get_by_role('button',name='Confirm changes',exact=True).click();recent.get_by_text('1 succeeded; 1 failed.',exact=True).wait_for();expect(recent.get_by_role('region',name='Bulk order actions',exact=True)).to_contain_text('1 selected')
  recent.get_by_label('Bulk action',exact=True).select_option('Confirmed');recent.get_by_role('button',name='Review action',exact=True).click();page.get_by_role('dialog',name='Confirm order changes',exact=True).get_by_role('button',name='Confirm changes',exact=True).click();recent.get_by_text('1 succeeded; 0 failed.',exact=True).wait_for();expect(other.locator('[data-metric="New Orders"]')).to_have_text('0',timeout=15000)
  # Lost response: retry the same accepted operation, without repeating audit.
  recent.get_by_role('button',name='To Pack',exact=True).click();expect(recent.locator('table tbody tr')).to_have_count(3);recent.locator('table tbody tr').filter(has_text='PS-'+format(2001,'032X')).get_by_role('checkbox').check();recent.get_by_label('Bulk action',exact=True).select_option('Processing');recent.get_by_role('button',name='Review action',exact=True).click();lost={'once':True};operations=[]
  def lose(route):
   if route.request.method=='POST' and route.request.post_data_json.get('action')=='adminOrders:update':
    operations.append(route.request.post_data_json['operationId'])
    if lost['once']:lost['once']=False;response=route.fetch();assert response.status==200;route.abort();return
   route.continue_()
  page.route('**/api/catalog',lose);page.get_by_role('dialog',name='Confirm order changes',exact=True).get_by_role('button',name='Confirm changes',exact=True).click();recent.get_by_role('button',name='Retry uncertain actions safely',exact=True).click();recent.get_by_text('1 succeeded; 0 failed.',exact=True).wait_for();assert len(operations)==2 and operations[0]==operations[1];fixture('assert-once');page.unroute('**/api/catalog',lose);expect(other.locator('[data-metric="Processing"]')).to_have_text('2',timeout=15000)
  # Inventory editor and collection mutations refresh the other dashboard tab.
  other.goto(origin+'/admin/products/edit/'+'s'*20);other.get_by_label('Quantity change (positive to add, negative to remove)',exact=True).fill('1');other.get_by_label('Reason',exact=True).fill('Local dashboard stock count');other.get_by_role('button',name='Save stock adjustment',exact=True).click();other.get_by_text('Local dashboard stock count',exact=True).wait_for();expect(stock.locator('table tbody tr').filter(has_text='Shopping Simple')).to_contain_text('2 left',timeout=15000)
  other.goto(origin+'/admin/orders/'+format(2005,'032x'));other.get_by_label('Action',exact=True).select_option('Delivered');other.get_by_role('button',name='Save action',exact=True).click();expect(other.get_by_label('Action',exact=True)).to_have_value('');expect(metric('COD to Collect')).to_contain_text('7,998.30');other.get_by_label('Action',exact=True).select_option('collect');other.get_by_label('External reference',exact=True).fill('LOCAL COLLECTION');other.get_by_role('button',name='Save action',exact=True).click();expect(other.get_by_label('Action',exact=True)).to_have_value('');expect(metric('COD to Collect')).to_contain_text('6,665.25',timeout=15000)
  page.get_by_role('button',name='Administrator notifications',exact=True).click();panel=page.get_by_role('region',name='Notifications',exact=True);panel.get_by_text('Dashboard fixture order received',exact=True).wait_for();page.keyboard.press('Escape');expect(panel).to_have_count(0);page.evaluate("window.dispatchEvent(new Event('focus'))");expect(panel).to_have_count(0)
  recent.get_by_role('button',name='All',exact=True).click()
  # An aborted older filter response must not replace the newer visible filter.
  held=[]
  def hold_old(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='dashboard:orders' and body.get('status')=='Placed' and not held:held.append((route,route.fetch()));return
   route.continue_()
  page.route('**/api/catalog',hold_old);recent.get_by_role('button',name='New',exact=True).click();page.wait_for_timeout(250);assert len(held)==1;recent.get_by_role('button',name='To Pack',exact=True).click();expect(recent.locator('table tbody tr')).to_have_count(2)
  try:held[0][0].fulfill(response=held[0][1])
  except Exception:pass # The old browser request is deliberately aborted.
  expect(recent.get_by_role('button',name='To Pack',exact=True)).to_have_attribute('aria-pressed','true');expect(recent.locator('table tbody tr')).to_have_count(2);page.unroute('**/api/catalog',hold_old);recent.get_by_role('button',name='All',exact=True).click()
  # Changes arriving during a slow aggregate coalesce into one subsequent read.
  pending=[]
  def hold_backlog(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='dashboard:backlog' and not pending:pending.append((route,route.fetch()));return
   route.continue_()
  page.route('**/api/catalog',hold_backlog);page.evaluate("window.dispatchEvent(new CustomEvent('parinaya:admin-data-changed',{detail:'test-approved-admin'}))");page.wait_for_timeout(800);assert len(pending)==1;fixture('add-new');page.evaluate("window.dispatchEvent(new CustomEvent('parinaya:admin-data-changed',{detail:'test-approved-admin'}))");page.wait_for_timeout(350);pending[0][0].fulfill(response=pending[0][1]);expect(metric('COD to Collect')).to_contain_text('7,998.30',timeout=15000);page.unroute('**/api/catalog',hold_backlog)
  # Hidden pages defer refreshes and pick them up upon returning to visibility.
  page.wait_for_timeout(400);before_hidden=len(requests);page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});window.dispatchEvent(new CustomEvent('parinaya:admin-data-changed',{detail:'test-approved-admin'}))");page.wait_for_timeout(400);assert len(requests)==before_hidden;page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))");page.wait_for_timeout(800);assert len(requests)>before_hidden
  for width in [320,390,768,1024,1440,1920]:
   page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(250);assert page.evaluate('visualViewport.scale')==1
   if page.evaluate('document.documentElement.scrollWidth>innerWidth+1'):
    print('Dashboard overflow:',width,page.locator('.parinaya-admin *').evaluate_all('(nodes)=>nodes.map(el=>({tag:el.tagName,classes:el.className,right:el.getBoundingClientRect().right})).filter(el=>el.right>innerWidth+1).slice(-12)'),flush=True);raise AssertionError(width)
   page.screenshot(path=str(screens/f'dashboard-{width}.png'),full_page=True)
   if width<1024:
    menu=page.get_by_role('button',name='Open admin menu',exact=True);menu.click();drawer=page.get_by_role('dialog',name='Admin menu',exact=True);expect(drawer).to_be_visible();expect(page.get_by_role('button',name='Close admin menu',exact=True)).to_be_focused();assert page.evaluate('document.body.style.overflow')=='hidden';page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.closest("dialog")!==null');page.keyboard.press('Escape');expect(drawer).to_have_count(0);expect(menu).to_be_focused();assert page.evaluate('document.body.style.overflow')!='hidden'
  # Last successful data stays visible when a background refresh fails.
  page.set_viewport_size({'width':1440,'height':1000});mode['fail']='dashboard:backlog';page.route('**/api/catalog',fail_one);page.evaluate("window.dispatchEvent(new CustomEvent('parinaya:admin-data-changed',{detail:'test-approved-admin'}))");page.get_by_text('Unable to load current backlog and COD amounts. Please try again.',exact=False).wait_for();expect(metric('COD to Collect')).to_contain_text('7,998.30');mode['fail']='';page.get_by_role('button',name='Retry current backlog',exact=True).click();page.unroute('**/api/catalog',fail_one)
  fixture('empty');page.evaluate("window.dispatchEvent(new CustomEvent('parinaya:admin-data-changed',{detail:'test-approved-admin'}))");expect(metric('New Orders')).to_have_text('0');expect(metric('COD to Collect')).to_contain_text('0.00');recent.get_by_text('No matching orders in this period.',exact=True).wait_for()
  other.close();page.get_by_role('button',name='Sign Out',exact=True).filter(visible=True).click();page.get_by_role('button',name='Sign In',exact=True).wait_for();assert page.locator('[data-metric]').count()==0
  before=len(requests);page.evaluate("window.dispatchEvent(new CustomEvent('parinaya:admin-data-changed',{detail:'test-approved-admin'}));window.dispatchEvent(new Event('focus'))");page.wait_for_timeout(500);assert len(requests)==before,'Dashboard listeners must stop after sign-out'
  page.get_by_label('Email',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('heading',name='Access Restricted',exact=True).wait_for();assert page.locator('[data-metric]').count()==0;assert 'Dashboard Fixture' not in page.locator('body').inner_text()
  assert not errors,errors;browser.close();print('Dashboard browser passed: real metrics, IST dates, independent/stale errors, bulk conflict/partial/lost-response retries, audited stock, collection updates across tabs, notifications, accessible drawer, cleanup and six normal-zoom widths.')
finally:
 fixture('cleanup');fixture('cleanup','shopping')

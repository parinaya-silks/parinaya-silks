"""Delayed order acknowledgement must not redirect a newer checkout context."""
import os,re,subprocess
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
def fixture(action,script='cod'):subprocess.run(['node','--import','tsx',f'scripts/{script}-fixture-control.ts',action],check=True,capture_output=True)
fixture('seed','shopping');fixture('seed')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':390,'height':900},reduced_motion='reduce');ctx.route('https://**/*',lambda r:r.abort());page=ctx.new_page();page.goto(origin+'/login?returnTo=%2Fcheckout');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();page.get_by_role('button',name='Continue to Review',exact=True).click();page.get_by_role('button',name='Continue to Payment',exact=True).click()
  held=[];writes=[]
  def hold(route):
   body=route.request.post_data_json if route.request.method=='POST' else {}
   if body.get('action')=='orders:place':
    writes.append(body);response=route.fetch();assert response.status==200;held.append((route,response));return
   route.continue_()
  page.route('**/api/catalog',hold);page.get_by_role('button',name=re.compile('^Place Order')).click()
  for attempt in range(100):
   if held:break
   page.wait_for_timeout(100)
  assert held;page.evaluate("history.pushState(null,'','/bag');dispatchEvent(new PopStateEvent('popstate'))")
  page.wait_for_url('**/bag');held[0][0].fulfill(response=held[0][1]);page.wait_for_timeout(400);assert page.url.endswith('/bag'),'Late acknowledgement redirected an unmounted checkout'
  assert page.evaluate('localStorage.getItem("parinaya:cod-pending:test-customer")') is not None
  page.goto(origin+'/checkout');page.wait_for_url('**/order-confirmed/*');expect(page.get_by_role('heading',name='Thank you for choosing Parinaya.',exact=True)).to_be_visible();assert len(writes)==1;fixture('assert-single');browser.close()
 print('Checkout context browser passed: late accepted response ignored after unmount, durable recovery confirmed the same order without resubmission, exactly one stock deduction.')
finally:fixture('cleanup');fixture('cleanup','shopping')

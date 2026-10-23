"""Local authenticated history: server/network failures, retry, empty and loading states."""
import os,json
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
with sync_playwright() as p:
 browser=p.chromium.launch()
 context=browser.new_context(viewport={'width':390,'height':900})
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
  context.route(pattern,lambda route:route.abort())
 page=context.new_page();state={'mode':'index','calls':0}
 def history(route):
  if route.request.method!='POST' or route.request.post_data_json.get('action')!='orders:list':route.continue_();return
  state['calls']+=1
  if state['mode']=='index':route.fulfill(status=503,content_type='application/json',body=json.dumps({'code':'index-required','message':'Technical fixture must never reach customer'}))
  elif state['mode']=='network':route.abort()
  elif state['mode']=='hold':state['held']=route
  else:route.continue_()
 page.route('**/api/catalog',history)
 page.goto('http://127.0.0.1:3100/login?returnTo=%2Faccount%2Forders')
 page.get_by_label('Email address',exact=True).fill('customer@example.test')
 page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD'])
 page.get_by_role('button',name='Sign In',exact=True).click()
 message='We couldn’t load your orders. Please try again.'
 expect(page.get_by_role('alert')).to_contain_text(message)
 expect(page.get_by_text('You have no orders yet.',exact=True)).to_have_count(0)
 assert 'Technical fixture' not in page.locator('body').inner_text()
 state['mode']='network';before=state['calls'];page.get_by_role('button',name='Retry',exact=True).click()
 expect(page.get_by_role('alert')).to_contain_text(message)
 # Wait for a new failed request before testing another retry.
 for _ in range(100):
  if state['calls']>before and page.get_by_role('alert').count():break
  page.wait_for_timeout(50)
 assert state['calls']>before
 expect(page.get_by_role('alert')).to_contain_text(message)
 state['mode']='hold';page.get_by_role('button',name='Retry',exact=True).click()
 expect(page.get_by_role('status').filter(has_text='Loading...')).to_be_visible()
 expect(page.get_by_text('You have no orders yet.',exact=True)).to_have_count(0)
 for _ in range(100):
  if 'held' in state:break
  page.wait_for_timeout(50)
 # Let the actual authenticated handler return the genuinely empty history.
 state['mode']='live';state.pop('held').continue_()
 expect(page.get_by_text('You have no orders yet.',exact=True)).to_be_visible()
 expect(page.get_by_role('alert')).to_have_count(0)
 for width in [320,390,768,1440]:
  page.set_viewport_size({'width':width,'height':900})
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
 browser.close()
 print('Customer history browser passed: index/network errors, loading, retry, real empty result and four responsive widths.')

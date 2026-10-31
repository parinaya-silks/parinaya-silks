"""Public projection fixtures only; never opens apps or writes production content."""
import os,re,json,copy
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
out=Path('.cache/policy-design');out.mkdir(parents=True,exist_ok=True)
paths={'privacy':'/privacy-policy','terms':'/terms-conditions','shipping':'/shipping-policy','returns':'/returns-policy'}
labels={'privacy':'Privacy Policy','terms':'Terms & Conditions','shipping':'Shipping Policy','returns':'Returns & Exchanges'}
def payload():return {'banners':[],'featuredProductIds':[],'featuredCategoryIds':[],'contact':{'email':'','mobile':'','address':'','instagram':''},'policies':{k:{'text':'','approved':False} for k in paths},'returnsEnabled':False,'returnKinds':[]}
with sync_playwright() as p:
 browser=p.chromium.launch();ctx=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce');errors=[];popups=[];requests=[];held=[]
 state={'body':payload(),'fail':False,'hold':False}
 for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:ctx.route(pattern,lambda r:r.abort())
 def content(r):
  requests.append(r.request.url)
  if state['hold']:held.append(r);return
  r.fulfill(status=503 if state['fail'] else 200,json={'code':'unavailable'} if state['fail'] else state['body'])
 ctx.route('**/api/catalog?content=store',content)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('popup',lambda w:popups.append(w.url))
 for key,path in paths.items():
  page.goto('http://127.0.0.1:3100'+path+'?preview=policy');expect(page.locator('[data-policy-state=sample]')).to_be_visible();expect(page.get_by_role('heading',name=labels[key],exact=True)).to_be_visible()
  expect(page.get_by_text('Sample content for design review. Final policy wording will be provided by Parinaya Silks.',exact=True)).to_be_visible()
  for width in [320,390,768,1440,1920]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('document.fonts.ready');
   if width<768 and page.locator('.policy-mobile-index').evaluate('(e)=>e.open')!=(key!='privacy'):page.locator('.policy-mobile-index summary').click()
   page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'{key}-{width}.png'),full_page=True)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(key,width)
   assert 'ParinayaLora' in page.locator('.policy-page h1').evaluate('(e)=>getComputedStyle(e).fontFamily')
   assert page.get_by_role('navigation',name='Mobile Bottom Navigation').locator('[aria-current=page]').count()==0
   assert not page.locator('.public-floating-contact').count()
   if width<768:
    expect(page.get_by_label('Select policy document',exact=True)).to_have_value(key)
    index=page.locator('.policy-mobile-index');summary=index.locator('summary');before=index.evaluate('(e)=>e.open');summary.click();assert index.evaluate('(e)=>e.open')!=before
    if not index.evaluate('(e)=>e.open'):summary.click()
    index.get_by_role('link').last.click();target=page.locator('.policy-sections h2').last;expect(target).to_be_focused();assert target.bounding_box()['y']>=page.locator('.storefront-header').bounding_box()['height']-1
    
    if width==390:
     page.reload();expect(page.locator('.policy-sections h2').last).to_be_focused()
    page.get_by_role('button',name='Back to Top').click();expect(page.locator('#policy-top')).to_be_focused();assert page.evaluate('scrollY')==0
  page.set_viewport_size({'width':1440,'height':1000});assert page.locator('.policy-reading').bounding_box()['width']<=830
 # Selector changes real routes; refresh, Back/Forward, legacy footer URLs and metadata agree.
 page.set_viewport_size({'width':390,'height':900});page.get_by_label('Select policy document',exact=True).select_option('privacy');expect(page).to_have_url(re.compile('/privacy-policy\\?preview=policy$'));page.get_by_label('Select policy document',exact=True).select_option('shipping');page.go_back();expect(page.locator('.policy-page h1')).to_have_text('Privacy Policy');page.go_forward();expect(page.locator('.policy-page h1')).to_have_text('Shipping Policy');page.reload();expect(page.locator('.policy-page h1')).to_have_text('Shipping Policy');assert page.title()=='Shipping policy | PARINAYA SILKS'
 page.goto('http://127.0.0.1:3100/policies?tab=terms');expect(page.locator('.policy-page h1')).to_have_text('Terms & Conditions');expect(page.locator('[data-policy-state=unavailable]')).to_be_visible()
 # Explicit samples must never win over approved plain text, even with the preview flag.
 body=payload();literal='First paragraph\n\n- Literal list item\n<script>window.policyExecuted=true</script>\nhttps://example.test/'+('a'*600)
 for key in paths:body['policies'][key]={'approved':True,'heading':'Saved '+labels[key],'text':literal if key=='privacy' else 'Short saved '+key+' policy.'}
 state['body']=body
 for key,path in paths.items():
  page.goto('http://127.0.0.1:3100'+path+'?preview=policy');expect(page.locator('.policy-page h1')).to_have_text('Saved '+labels[key]);expect(page.locator('[data-policy-state=published]')).to_have_text(body['policies'][key]['text']);assert not page.locator('[data-policy-state=sample],.policy-mobile-index,.policy-desktop-index').count()
  assert page.evaluate('window.policyExecuted') is None
 # Long text and heading wrap, without invented dates, links or section headings.
 body['policies']['privacy']['heading']='LongHeading'+('X'*89);state['body']=body
 page.goto('http://127.0.0.1:3100/privacy-policy')
 for width in [320,390,768,1440,1920]:
  page.set_viewport_size({'width':width,'height':900});expect(page.locator('[data-policy-state=published]')).to_have_text(literal);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not page.locator('.policy-page time,.policy-real-copy a,.policy-real-copy script').count()
 page.screenshot(path=str(out/'published-long-1920.png'),full_page=True)
 # Last loaded real content survives background errors. First-load errors never show samples.
 state['fail']=True;page.evaluate("window.dispatchEvent(new Event('focus'))");expect(page.get_by_role('alert')).to_contain_text('last successfully loaded');expect(page.locator('[data-policy-state=published]')).to_have_text(literal)
 first=ctx.new_page();first.goto('http://127.0.0.1:3100/privacy-policy?preview=policy');expect(first.get_by_role('alert')).to_contain_text('Unable to load this policy');assert not first.locator('[data-policy-state=sample],[data-policy-state=unavailable]').count();state['fail']=False;first.get_by_role('button',name='Retry policy').click();expect(first.locator('[data-policy-state=published]')).to_have_text(literal);first.close()
 # Reject even a malformed public fixture containing unapproved private text and heading.
 state['body']=payload();state['body']['policies']['privacy']={'approved':False,'text':'PRIVATE DRAFT','heading':'PRIVATE TITLE'}
 page.goto('http://127.0.0.1:3100/privacy-policy');expect(page.locator('[data-policy-state=unavailable]')).to_be_visible();assert 'PRIVATE' not in page.locator('body').inner_text()
 # A delayed shared snapshot cannot apply stale data after a newer refresh or select the wrong policy.
 state['hold']=True;page.set_viewport_size({'width':1440,'height':1000});page.goto('http://127.0.0.1:3100/privacy-policy');expect(page.get_by_role('status').filter(has_text='Loading policy')).to_be_visible();page.get_by_role('navigation',name='Policy Centre').get_by_role('link',name='Shipping Policy',exact=True).click();expect(page.locator('.policy-page h1')).to_have_text('Shipping Policy');page.evaluate("window.dispatchEvent(new Event('focus'))")
 page.wait_for_function('document.querySelector(".policy-loading")!==null');page.wait_for_timeout(100);assert len(held)>=2
 fresh=payload();fresh['policies']['shipping']={'approved':True,'text':'Newest shipping snapshot'};held[-1].fulfill(status=200,json=fresh);expect(page.locator('[data-policy-state=published]')).to_have_text('Newest shipping snapshot');old=payload();old['policies']['shipping']={'approved':True,'text':'STALE shipping snapshot'}
 for r in held[:-1]:r.fulfill(status=200,json=old)
 page.wait_for_timeout(150);expect(page.locator('[data-policy-state=published]')).to_have_text('Newest shipping snapshot');state['hold']=False
 # Normal production build never loads fixture code or renders samples, including a crafted preview URL.
 state['body']=payload();prod=ctx.new_page();fixture_requests=[];prod.on('request',lambda r:fixture_requests.append(r.url) if 'PolicySample' in r.url else None)
 for key,path in paths.items():
  prod.goto('http://127.0.0.1:4200'+path+'?preview=policy');expect(prod.locator('[data-policy-state=unavailable]')).to_be_visible();assert not prod.locator('[data-policy-state=sample]').count()
 state['body']=payload();state['body']['policies']['privacy']={'approved':True,'text':'Published production fixture'};prod.goto('http://127.0.0.1:4200/privacy-policy?preview=policy');expect(prod.locator('[data-policy-state=published]')).to_have_text('Published production fixture');assert not prod.locator('[data-policy-state=sample]').count()
 assert not fixture_requests;assert not errors,errors;assert not popups,popups
 for file in Path('dist/assets').glob('*.js'):
  assert 'LOCAL_POLICY_SAMPLE_ONLY' not in file.read_text(encoding='utf-8'),file
 browser.close()
print('Policy browser passed: four pages at five widths, local samples versus production, exact saved/private mapping, route/history/selector, anchors/focus, short/long text, refresh/initial Retry, stale responses and no external actions.')

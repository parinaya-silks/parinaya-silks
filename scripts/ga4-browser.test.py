"""Actual production SPA bundles on intercepted hosts. No Google/Firebase traffic escapes."""
import json,mimetypes,urllib.parse
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ID='G-R785L2F0K0';HOST='https://www.parinayasarees.com';KEY='parinaya:analytics-consent:v1'
fixture=json.loads(Path('.cache/ga4/fixtures.json').read_text());out=Path('.cache/ga4')
stub='''(()=>{const push=dataLayer.push.bind(dataLayer);dataLayer.push=function(command){const a=Array.from(command);(window.__ga_commands??=[]).push(a);if(a[0]==='event'&&!window['ga-disable-G-R785L2F0K0']){const p=a[2];fetch('https://www.google-analytics.com/g/collect?tid=G-R785L2F0K0',{method:'POST',body:new URLSearchParams({en:a[1],dl:p.page_location,dt:p.page_title,dr:p.page_referrer})});}return push(command);};})();'''
with sync_playwright() as p:
 browser=p.chromium.launch()
 def context(host=HOST,deployment='production',automation=False,preference=None,blocked=False,privacy=False,path='/',strict=False):
  ctx=browser.new_context(viewport={'width':390,'height':844});hits=[];scripts=[];requests=[]
  if not automation:ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false})")
  if privacy:ctx.add_init_script("Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true})")
  if preference:ctx.add_init_script('localStorage.setItem('+json.dumps(KEY)+','+json.dumps(preference)+')')
  def route(r):
   u=urllib.parse.urlparse(r.request.url);requests.append(r.request.url)
   if u.hostname=='www.googletagmanager.com':
    assert '@' not in r.request.headers.get('referer','') and '?' not in r.request.headers.get('referer','')
    scripts.append(r.request.url)
    if blocked:r.abort()
    else:r.fulfill(status=200,content_type='application/javascript',body=stub)
   elif u.hostname=='www.google-analytics.com':hits.append(dict(urllib.parse.parse_qsl(r.request.post_data or '',keep_blank_values=True)));r.fulfill(status=204)
   elif u.netloc==urllib.parse.urlparse(host).netloc:
    if u.path=='/api/catalog':
     query=urllib.parse.parse_qs(u.query);value=fixture['content'] if query.get('content')==['store'] else fixture['product'] if query.get('slug')==['local-cotton-saree'] else {'items':[],'nextCursor':None,'total':0}
     r.fulfill(status=200,json=value)
    else:
     if strict and u.path=='/':r.fulfill(status=200,content_type='text/html',body='<div id="root"></div><script type="module" src="/strict.js"></script>');return
     root=out/deployment;relative=u.path.lstrip('/');f=root/relative
     if not relative or not f.is_file() or root.resolve() not in f.resolve().parents:f=root/'index.html'
     r.fulfill(status=200,content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream',body=f.read_bytes())
   else:r.abort()
  ctx.route('**/*',route);return ctx,hits,scripts,requests
 def go(page,path):page.evaluate("path=>{history.pushState(null,'',path);dispatchEvent(new PopStateEvent('popstate'))}",path)
 ctx,hits,scripts,requests=context();page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(HOST+'/')
 consent=page.get_by_role('region',name='Analytics preferences',exact=True);expect(consent).to_be_visible();assert not scripts and not hits
 # No analytics on form edits or before an explicit choice.
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':844});box=consent.bounding_box();assert box['x']>=0 and box['x']+box['width']<=width and box['y']>=0 and box['y']+box['height']<844-(140 if width<1024 else 0);page.screenshot(path=str(out/f'consent-{width}.png'))
 consent.get_by_role('button',name='Allow analytics').click();expect(consent).not_to_be_visible();page.wait_for_function("(window.__ga_commands||[]).some(a=>a[0]==='event')");page.wait_for_timeout(100);assert len(hits)==1 and hits[0]['dl']==HOST+'/' and hits[0]['dt']=='Sarees | PARINAYA SAREES'
 for path,title in [('/shop?search=private@example.test&phone=9876543210','Shop sarees | PARINAYA SAREES'),('/contact','Contact | PARINAYA SAREES'),('/product/local-cotton-saree?token=private-token','Local cotton saree | PARINAYA SAREES')]:
  before=len(hits);go(page,path);page.wait_for_function('count=>(window.__ga_commands||[]).filter(a=>a[0]===\'event\').length===count',arg=before+1);page.wait_for_timeout(150);assert len(hits)==before+1 and hits[-1]['dt']==title
 # Ordinary component updates, focus and duplicate router notifications are not visits.
 before=len(hits);page.evaluate("dispatchEvent(new PopStateEvent('popstate'));dispatchEvent(new Event('focus'))");page.wait_for_timeout(200);assert len(hits)==before
 page.go_back();page.wait_for_timeout(250);assert len(hits)==before+1 and hits[-1]['dl']==HOST+'/contact'
 for field,value in [('Full Name','Private Person'),('Email Address','private@example.test'),('Phone Number','9876543210'),('Message','Private form contents')]:
  page.get_by_label(field,exact=True).fill(value)
 page.wait_for_timeout(100);assert len(hits)==before+1
 before=len(hits);go(page,'/admin/customers?token=private-token');page.wait_for_timeout(250);assert len(hits)==before;assert page.evaluate("window['ga-disable-G-R785L2F0K0']")
 go(page,'/shop');page.wait_for_timeout(200);assert len(hits)==before+1 and len(scripts)==1
 # Withdrawal blocks all subsequent hits and is changeable from the footer.
 page.get_by_role('button',name='Analytics preferences',exact=True).click();page.get_by_role('button',name='No thanks',exact=True).click();go(page,'/about');page.wait_for_timeout(200);assert len(hits)==before+1
 page.get_by_role('button',name='Analytics preferences',exact=True).click();page.get_by_role('button',name='Allow analytics',exact=True).click();page.wait_for_timeout(150);assert len(hits)==before+2
 raw=json.dumps(hits);assert not any(secret in raw for secret in ['Private Person','Private form contents','private@example.test','private-token','9876543210','returnTo','?','#','/admin']);commands=page.evaluate('window.__ga_commands');config=[a for a in commands if a[0]=='config'];assert len(config)==1 and config[0][2]['send_page_view'] is False and config[0][2]['currency']=='INR'
 assert all(hit['en']=='page_view' for hit in hits);assert not errors,errors;ctx.close()
 for options in [dict(host='https://parinayasarees.com',preference='granted'),dict(host=HOST,preference='denied'),dict(host=HOST,privacy=True),dict(host=HOST,automation=True,preference='granted'),dict(host=HOST,path='/admin/customers',preference='granted'),dict(host='https://preview.vercel.app',preference='granted'),dict(host='http://localhost:3000',preference='granted'),dict(host=HOST,deployment='preview',preference='granted')]:
  c,h,s,_=context(**options);v=c.new_page();v.goto(options.get('host',HOST)+options.get('path','/'));v.wait_for_timeout(250)
  if options.get('host')=='https://parinayasarees.com':assert len(h)==1 and len(s)==1
  else:assert not h and not s,options
  c.close()
 c,h,s,_=context(preference='granted');v=c.new_page();v.goto(HOST+'/shop?email=private@example.test&token=private-token');v.wait_for_function("(window.__ga_commands||[]).some(a=>a[0]==='event')");v.wait_for_timeout(150);assert len(h)==1 and h[0]['dl']==HOST+'/shop' and h[0]['dr']=='';c.close()
 c,h,s,_=context(strict=True,preference='granted');v=c.new_page();v.goto(HOST+'/');v.wait_for_function("(window.__ga_commands||[]).some(a=>a[0]==='event')");v.evaluate('window.probeRender()');v.wait_for_timeout(150);assert len(h)==1 and len(s)==1;go(v,'/shop');v.evaluate('window.probeRender()');v.wait_for_timeout(150);assert len(h)==2 and len(s)==1;c.close()
 c,h,s,_=context(preference='granted');v=c.new_page();v.goto(HOST+'/');v.wait_for_function("(window.__ga_commands||[]).some(a=>a[0]==='event')");v.evaluate("()=>{Storage.prototype.setItem=()=>{throw new Error('Synthetic blocked storage')}}");v.get_by_role('button',name='Analytics preferences',exact=True).click();v.get_by_role('button',name='No thanks',exact=True).click();go(v,'/shop');v.wait_for_timeout(150);assert len(h)==1 and v.evaluate("window['ga-disable-G-R785L2F0K0']");c.close()
 c,h,s,_=context(preference='granted',blocked=True);v=c.new_page();v.goto(HOST+'/');v.wait_for_timeout(150);go(v,'/shop');expect(v.get_by_role('heading',name='Shop All Sarees',exact=True)).to_be_visible();assert not h and len(s)==1;c.close()
 browser.close();print('GA4 actual SPA browser passed: opt-in, initial/navigation/product/back views, Strict Mode, sanitized intercepted payloads, form privacy, withdrawal with blocked storage, exact hosts, preview/automation/privacy exclusions, responsive consent and blocked-script navigation.')

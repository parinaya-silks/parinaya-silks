"""Production-preview layout and pre-Auth validation; all backend requests intercepted."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
origin='http://127.0.0.1:4173'
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':320,'height':850},reduced_motion='reduce')
    auth_requests=[]
    for pattern in ['https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
        context.route(pattern,lambda route:(auth_requests.append(route.request.method),route.abort()))
    context.route('https://firestore.googleapis.com/**',lambda route:route.abort())
    context.route('**/api/catalog*',lambda route:route.fulfill(status=503 if 'appearance=' in route.request.url else 200,content_type='application/json',body='{}' if 'appearance=' in route.request.url else '{"items":[],"nextCursor":null}'))
    page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(origin+'/register');page.get_by_label('Mobile number',exact=True).wait_for()
    page.get_by_label('Name',exact=True).fill('Layout Fixture')
    page.get_by_label('Email address',exact=True).fill('layout@example.test')
    page.get_by_label('Password',exact=True).fill('Layout password 9!')
    page.get_by_label('Confirm password',exact=True).fill('Layout password 9!')
    page.get_by_label('Mobile number',exact=True).fill('98765 43210')
    Path('.cache/customer-auth').mkdir(parents=True,exist_ok=True)
    for width in [320,375,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':850})
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
        assert page.get_by_label('Mobile number',exact=True).input_value()=='98765 43210'
        assert page.get_by_label('Country code',exact=True).input_value()=='IN'
        assert page.get_by_label('Country code',exact=True).locator('option:checked').inner_text().startswith('+91')
        assert page.get_by_label('Mobile number',exact=True).evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)')>=16
        assert page.get_by_role('form',name='Create customer account',exact=True).count()==1
        assert page.evaluate('new Set([...document.querySelectorAll("[id]")].map(el=>el.id)).size===document.querySelectorAll("[id]").length')
        control=page.get_by_role('button',name='Create account',exact=True)
        control.evaluate('(el)=>el.scrollIntoView({block:"center",behavior:"instant"})')
        bounds=control.bounding_box();assert bounds['y']>=56 and bounds['y']+bounds['height']<=850-(64 if width<1024 else 0)
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=f'.cache/customer-auth/register-mobile-{width}.png',full_page=True)
    for value in ['', '12345']:
        page.get_by_label('Mobile number',exact=True).fill(value)
        page.get_by_role('button',name='Create account',exact=True).click()
        page.get_by_role('alert').filter(has_text='Please check your mobile number').wait_for()
        expect(page.get_by_label('Mobile number',exact=True)).to_be_focused()
    assert not auth_requests,'Invalid mobile input must not reach Auth, including policy lookup'
    assert not errors,errors
    print('Production-preview registration: six widths, +91 presentation, form preservation, reachable submit, safe fallback and validation before all Auth requests passed')
    browser.close()

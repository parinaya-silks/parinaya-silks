"""Customer auth against real loopback Auth/Firestore; no production accounts."""
import json,os,subprocess,uuid
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'
screens=Path('.cache/customer-auth');screens.mkdir(parents=True,exist_ok=True)

def inspect_fixture(email):
    result=subprocess.run(['node','--import','tsx','scripts/customer-fixture-control.ts',email],capture_output=True,text=True,check=True)
    return json.loads(result.stdout.strip().splitlines()[-1])

with sync_playwright() as p:
    browser=p.chromium.launch()
    def context(**kwargs):
        ctx=browser.new_context(reduced_motion='reduce',**kwargs)
        for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
            ctx.route(pattern,lambda route:route.abort())
        # Firebase CLI 15.34.0 does not implement getPasswordPolicy. Exercise
        # the real SDK validator with an explicit, loopback-only policy fixture.
        ctx.route('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v2/passwordPolicy*',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({'schemaVersion':1,'enforcementState':'ENFORCE','customStrengthOptions':{'minPasswordLength':12,'containsUppercaseCharacter':True,'containsLowercaseCharacter':True,'containsNumericCharacter':True,'containsNonAlphanumericCharacter':True},'allowedNonAlphanumericCharacters':['!','-',' ']})))
        return ctx
    visual=context(viewport={'width':390,'height':844})
    page=visual.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(origin+'/login');page.get_by_role('heading',name='Welcome back',exact=True).wait_for()
    page.get_by_label('Email address',exact=True).fill('visual@example.test')
    original_password='  Password 12!  '
    page.get_by_label('Password',exact=True).fill(original_password)
    page.get_by_role('button',name='Show password',exact=True).click()
    assert page.get_by_label('Password',exact=True).get_attribute('type')=='text'
    page.get_by_label('Remember me',exact=True).check()
    page.evaluate('document.fonts.ready')
    for width in [320,375,390,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert page.get_by_label('Email address',exact=True).input_value()=='visual@example.test'
        assert page.get_by_label('Password',exact=True).input_value()==original_password
        assert page.get_by_label('Remember me',exact=True).is_checked()
        assert page.get_by_role('form',name='Customer sign in',exact=True).count()==1
        assert page.evaluate('new Set([...document.querySelectorAll("[id]")].map(e=>e.id)).size===document.querySelectorAll("[id]").length')
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),width
        nav=page.get_by_role('navigation',name='Mobile Bottom Navigation')
        assert nav.is_visible()==(width<1024)
        if width<1024:
            assert nav.get_by_role('button').count()==5
            assert nav.get_by_role('button',name='person Account',exact=False).get_attribute('aria-current')=='page'
        assert page.get_by_label('Email address',exact=True).evaluate('(input)=>parseFloat(getComputedStyle(input).fontSize)')>=16
        assert page.get_by_role('button',name='Sign In',exact=True).bounding_box()['height']>=44
        page.screenshot(path=str(screens/f'login-{width}.png'),full_page=True)
    # Short/zoom-equivalent reflow and natural scrolling; no fixed submit bar.
    page.set_viewport_size({'width':720,'height':450})
    page.get_by_role('button',name='Sign In',exact=True).scroll_into_view_if_needed()
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
    page.set_viewport_size({'width':320,'height':420})
    for label,role in [('Sign In','button'),('Privacy Policy','link'),('Terms & Conditions','link'),('Continue browsing','link')]:
        control=page.get_by_role(role,name=label,exact=True)
        control.evaluate('(el)=>el.scrollIntoView({block:"center",behavior:"instant"})')
        bounds=control.bounding_box()
        assert bounds['y']>=56 and bounds['y']+bounds['height']<=356,(label,bounds)
    email_field=page.get_by_label('Email address',exact=True);email_field.focus()
    assert email_field.evaluate('(el)=>getComputedStyle(el).outlineStyle')!='none'
    email_field.press('Tab');expect(page.get_by_label('Password',exact=True)).to_be_focused()
    page.keyboard.press('Tab');expect(page.get_by_role('button',name='Hide password',exact=True)).to_be_focused()
    page.get_by_role('button',name='Open Navigation Drawer').click()
    expect(page.get_by_role('button',name='Close Navigation Drawer',exact=True)).to_be_focused()
    page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.closest("[role=dialog]")!==null')
    page.keyboard.press('Escape');expect(page.get_by_role('button',name='Open Navigation Drawer')).to_be_focused()
    page.get_by_role('link',name='Privacy Policy',exact=True).click();assert page.url.endswith('/privacy-policy')
    page.goto(origin+'/login');page.get_by_role('button',name='Open Navigation Drawer').click()
    assert page.get_by_role('button',name='Close Navigation Drawer',exact=True).is_visible()
    page.get_by_role('button',name='Close Navigation Drawer',exact=True).click()
    page.get_by_role('button',name='Search Catalog').click()
    page.get_by_placeholder('Search pure silk sarees, Kanjeevaram, Brocade, zari...').fill('silk')
    page.get_by_role('button',name='Search',exact=True).click();assert '/shop?search=silk' in page.url
    assert not errors,errors
    page.get_by_role('navigation',name='Mobile Bottom Navigation').get_by_role('button',name='person Account',exact=False).click()
    page.wait_for_url(origin+'/login?returnTo=%2Fshop%3Fsearch%3Dsilk')
    visual.close()

    ctx=context(viewport={'width':390,'height':844})
    page=ctx.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
    page.clock.install()
    email='customer-ui-'+uuid.uuid4().hex[:10]+'@example.test'
    password='Saree-'+uuid.uuid4().hex+'9!  '
    signups=[]
    page.on('request',lambda request:signups.append(1) if '/accounts:signUp' in request.url else None)
    page.goto(origin+'/register');page.get_by_role('heading',name='Create an account',exact=True).wait_for()
    page.get_by_label('Name',exact=True).fill('Customer Fixture')
    page.get_by_label('Email address',exact=True).fill(email)
    page.get_by_label('Password',exact=True).fill(password)
    page.get_by_label('Confirm password',exact=True).fill('different')
    page.get_by_role('button',name='Create account',exact=True).click()
    page.get_by_role('alert').filter(has_text='The passwords do not match.').wait_for()
    assert signups==[]
    expect(page.get_by_label('Confirm password',exact=True)).to_be_focused()
    page.get_by_label('Password',exact=True).fill('short')
    page.get_by_label('Confirm password',exact=True).fill('short')
    page.get_by_role('button',name='Create account',exact=True).click()
    page.get_by_role('alert').filter(has_text='at least 12 characters').wait_for()
    assert signups==[],'Weak passwords must fail the configured SDK policy before account creation'
    page.get_by_label('Password',exact=True).fill(password)
    page.get_by_label('Confirm password',exact=True).fill(password)
    def deny_profile(route):route.fulfill(status=403,content_type='application/json',body='{"error":{"code":403,"status":"PERMISSION_DENIED","message":"Synthetic profile denial"}}')
    page.route('**/documents:commit*',deny_profile)
    page.get_by_role('form',name='Create customer account',exact=True).evaluate('(form)=>{form.requestSubmit();form.requestSubmit();}')
    page.get_by_role('heading',name='Your account is ready',exact=True).wait_for(timeout=25000)
    assert len(signups)==1,'Auth creation must not repeat after a profile failure'
    page.get_by_role('alert').filter(has_text='Your account already exists').wait_for()
    assert page.get_by_role('button',name='Retry profile setup',exact=True).is_visible()
    page.unroute('**/documents:commit*',deny_profile)
    page.get_by_role('button',name='Retry profile setup',exact=True).click()
    page.get_by_role('button',name='Retry profile setup',exact=True).wait_for(state='hidden')
    page.get_by_role('status').filter(has_text='Loading your profile').wait_for(state='hidden')
    before=inspect_fixture(email);assert before['profileExists'] and not before['adminClaim'] and not before['adminAccessExists']
    resend=page.get_by_role('button',name='Resend email in',exact=False)
    assert resend.is_disabled()
    page.clock.fast_forward(61000)
    page.get_by_role('button',name='Resend verification email',exact=True).click()
    page.get_by_role('status').filter(has_text='A verification email has been sent').wait_for()
    oob=ctx.request.get('http://127.0.0.1:9099/emulator/v1/projects/parinaya-silks/oobCodes').json()
    codes=[item for item in oob['oobCodes'] if item.get('email')==email and item.get('requestType')=='VERIFY_EMAIL']
    assert codes,'Emulator must generate a real verification action'
    verified=ctx.request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:update?key=synthetic',data={'oobCode':codes[-1]['oobCode']})
    assert verified.status==200
    page.get_by_role('button',name='I’ve verified my email',exact=True).click()
    page.get_by_text('Verified',exact=True).wait_for()
    page.get_by_role('button',name='Sign out',exact=True).click()
    page.get_by_role('heading',name='Create an account',exact=True).wait_for()
    assert page.get_by_label('Email address',exact=True).input_value()==''
    assert page.get_by_label('Password',exact=True).input_value()==''

    page.goto(origin+'/login?returnTo=https%3A%2F%2Fevil.example')
    page.get_by_label('Email address',exact=True).fill(email)
    page.get_by_label('Password',exact=True).fill('wrong-password')
    page.get_by_role('button',name='Sign In',exact=True).click()
    page.get_by_role('alert').filter(has_text='Unable to sign in with those details').wait_for()
    assert page.get_by_label('Email address',exact=True).input_value()==email
    page.get_by_label('Password',exact=True).fill(password)
    def deny_login(route):route.abort()
    page.route('**/accounts:signInWithPassword*',deny_login)
    page.get_by_role('button',name='Sign In',exact=True).click()
    page.get_by_role('alert').filter(has_text='Unable to connect').wait_for(timeout=25000)
    assert page.get_by_label('Email address',exact=True).input_value()==email
    page.unroute('**/accounts:signInWithPassword*',deny_login)
    page.get_by_label('Password',exact=True).press('Enter')
    page.get_by_role('heading',name='Your account',exact=True).wait_for()
    assert page.url==origin+'/account','Unsafe return must use the account default'
    assert page.get_by_text('Verified',exact=True).is_visible()
    storage=page.evaluate('({local:Object.keys(localStorage).filter(k=>k.startsWith("firebase:authUser:")).length,session:Object.keys(sessionStorage).filter(k=>k.startsWith("firebase:authUser:")).length})')
    assert storage=={'local':0,'session':1}
    page.add_init_script('new MutationObserver(()=>{if([...document.querySelectorAll("h1")].some(e=>e.textContent==="Welcome back"))window.__loginFlash=true;}).observe(document,{subtree:true,childList:true});')
    page.reload();page.get_by_role('heading',name='Your account',exact=True).wait_for()
    assert not page.evaluate('Boolean(window.__loginFlash)')
    other=ctx.new_page();other.goto(origin+'/account');other.get_by_role('heading',name='Welcome back',exact=True).wait_for();other.close()
    page.get_by_role('button',name='Sign out',exact=True).click()
    page.get_by_role('heading',name='Welcome back',exact=True).wait_for()

    page.goto(origin+'/login?returnTo=%2Fshop%3Fsearch%3Dsilk')
    page.get_by_label('Email address',exact=True).fill(email)
    page.get_by_label('Password',exact=True).fill(password)
    page.get_by_label('Remember me',exact=True).check()
    page.get_by_role('button',name='Sign In',exact=True).click()
    page.wait_for_url(origin+'/shop?search=silk')
    page.goto(origin+'/login');page.wait_for_url(origin+'/account')
    page.get_by_role('button',name='Sign out',exact=True).wait_for()
    assert page.url==origin+'/account'
    storage=page.evaluate('({local:Object.keys(localStorage).filter(k=>k.startsWith("firebase:authUser:")).length,session:Object.keys(sessionStorage).filter(k=>k.startsWith("firebase:authUser:")).length})')
    assert storage=={'local':1,'session':0}
    other=ctx.new_page();other.goto(origin+'/account');other.get_by_role('button',name='Sign out',exact=True).wait_for();other.close()
    # Real shared Firebase session must not confer administrator access.
    page.goto(origin+'/admin/products');page.get_by_role('heading',name='Access Restricted',exact=True).wait_for()
    page.goto(origin+'/account');page.get_by_role('heading',name='Your account',exact=True).wait_for()
    after=inspect_fixture(email);assert after==before,'Repeated sign-in must not overwrite the private profile or grant admin'
    page.get_by_role('button',name='Sign out',exact=True).click()
    page.get_by_role('heading',name='Welcome back',exact=True).wait_for()
    page.goto(origin+'/forgot-password')
    for target in [email,'missing-'+uuid.uuid4().hex+'@example.test']:
        page.get_by_label('Email address',exact=True).fill(target)
        page.get_by_role('button',name='Send reset instructions',exact=True).click()
        page.get_by_role('status').filter(has_text='If an account can receive email at this address').wait_for()
    assert not errors,errors
    print('Customer browser: responsive approved layouts, resize/input preservation, validation, real registration/sign-in/reset/verification, profile failure/recovery/idempotence, persistence, safe returns, shared session and admin denial passed (emulators only)')
    ctx.close();browser.close()

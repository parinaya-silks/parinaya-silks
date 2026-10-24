"""Category mutations through the real browser SDK, loopback emulators only."""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
origin='http://127.0.0.1:3100'

with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844})
    for pattern in ['https://firestore.googleapis.com/**','https://identitytoolkit.googleapis.com/**','https://securetoken.googleapis.com/**']:
        context.route(pattern,lambda route:route.abort())
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(origin+'/admin/products')
    page.get_by_label('Email',exact=True).fill('parinayasilks.in@gmail.com')
    page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD'])
    page.get_by_role('button',name='Sign In',exact=True).click()
    page.get_by_role('heading',name='Products',exact=True).wait_for()
    page.goto(origin+'/admin/categories')
    page.get_by_text('No categories yet.',exact=True).wait_for()

    def create(name,order,enabled):
        page.get_by_role('button',name='Add category',exact=True).click()
        dialog=page.get_by_role('dialog')
        dialog.get_by_label('Name',exact=True).fill(name)
        dialog.get_by_label('Description (optional)',exact=True).fill('Emulator-only category description')
        dialog.get_by_label('Display order',exact=True).fill(str(order))
        if enabled:dialog.get_by_label('Enabled on storefront',exact=True).check()
        dialog.locator('form').evaluate('(form)=>{form.requestSubmit();form.requestSubmit();}')
        page.get_by_text('Category saved.',exact=True).wait_for()
        assert page.get_by_role('dialog').count()==0
        page.get_by_role('heading',name=name,exact=True).wait_for()

    create('Browser Alpha',20,True)
    assert page.get_by_role('heading',name='Browser Alpha',exact=True).count()==1
    page.reload()
    page.get_by_role('heading',name='Browser Alpha',exact=True).wait_for()
    create('Browser Beta',10,True)
    create('Browser Hidden',30,False)
    assert page.locator('li h2').all_text_contents()==['Browser Beta','Browser Alpha','Browser Hidden']

    # Client validation and server-enforced duplicate slug errors stay in dialog.
    page.get_by_role('button',name='Add category',exact=True).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_label('Name',exact=True).fill('Different display name')
    dialog.get_by_label('URL slug',exact=True).fill('Bad-Slug')
    dialog.get_by_role('button',name='Save category',exact=True).click()
    dialog.get_by_role('alert').filter(has_text='Use a slug').wait_for()
    dialog.get_by_label('URL slug',exact=True).fill('browser-alpha')
    dialog.get_by_role('button',name='Save category',exact=True).click()
    dialog.get_by_role('alert').filter(has_text='already in use').wait_for()
    dialog.get_by_role('button',name='Cancel',exact=True).click()
    assert page.locator('li h2').count()==3

    page.get_by_role('button',name='Edit Browser Alpha',exact=True).click()
    dialog=page.get_by_role('dialog')
    assert dialog.get_by_label('URL slug',exact=True).input_value()=='browser-alpha'
    assert dialog.get_by_label('URL slug',exact=True).get_attribute('readonly') is not None
    assert dialog.get_by_role('button',name='Delete unavailable',exact=True).is_disabled()
    dialog.get_by_label('Name',exact=True).fill('Browser Renamed')
    dialog.get_by_label('Display order',exact=True).fill('0')
    Path('.cache/categories').mkdir(parents=True,exist_ok=True)
    page.screenshot(path='.cache/categories/editor-390.png')
    dialog.get_by_role('button',name='Save category',exact=True).click()
    page.get_by_text('Category saved.',exact=True).wait_for()
    page.get_by_role('heading',name='Browser Renamed',exact=True).wait_for()
    assert page.locator('li h2').all_text_contents()==['Browser Renamed','Browser Beta','Browser Hidden']

    public_context=browser.new_context(viewport={'width':390,'height':844})
    public_context.route('https://firestore.googleapis.com/**',lambda route:route.abort())
    public=public_context.new_page()
    public.goto(origin+'/collections')
    public.get_by_role('button',name='Browser Renamed',exact=True).wait_for()
    assert public.get_by_role('button',name='Browser Hidden',exact=True).count()==0
    names=public.locator('section button').all_text_contents()
    assert names.index('Browser Renamed')<names.index('Browser Beta')
    public.get_by_role('button',name='Browser Renamed',exact=True).click()
    assert public.url==origin+'/collections/browser-alpha'
    public.get_by_role('heading',name='Browser Renamed',exact=True).wait_for()
    public.get_by_role('heading',name='No products available yet.',exact=True).wait_for()
    public.reload()
    public.get_by_role('heading',name='Browser Renamed',exact=True).wait_for()

    page.get_by_role('button',name='Edit Browser Renamed',exact=True).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_label('Enabled on storefront',exact=True).uncheck()
    dialog.get_by_role('button',name='Save category',exact=True).click()
    page.get_by_text('Category saved.',exact=True).wait_for()
    public.get_by_role('heading',name='Category not found.',exact=True).wait_for()
    public.goto(origin+'/collections/browser-hidden')
    public.get_by_role('heading',name='Category not found.',exact=True).wait_for()
    assert public.get_by_text('Browser Hidden',exact=True).count()==0

    # Exercise a real persistence failure/retry without changing emulator rules.
    page.get_by_role('button',name='Add category',exact=True).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_label('Name',exact=True).fill('Browser Retry')
    def deny_commit(route):route.fulfill(status=403,content_type='application/json',body='{"error":{"code":403,"status":"PERMISSION_DENIED","message":"Synthetic test denial"}}')
    page.route('**/documents:commit*',deny_commit)
    dialog.get_by_role('button',name='Save category',exact=True).click()
    dialog.get_by_role('alert').filter(has_text='Permission denied').wait_for()
    assert page.get_by_text('Category saved.',exact=True).count()==0
    page.unroute('**/documents:commit*',deny_commit)
    dialog.get_by_role('button',name='Save category',exact=True).click()
    page.get_by_text('Category saved.',exact=True).wait_for()
    assert page.get_by_role('heading',name='Browser Retry',exact=True).count()==1

    for width in [360,390,430,768,1024,1440]:
        page.set_viewport_size({'width':width,'height':900})
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
        page.get_by_role('button',name='Edit Browser Beta',exact=True).click()
        dialog=page.get_by_role('dialog')
        assert dialog.bounding_box()['width']<=width
        assert dialog.get_by_label('Name',exact=True).bounding_box()['height']>=(40 if width<768 else 38)
        if width==1440:page.screenshot(path='.cache/categories/editor-1440.png')
        dialog.get_by_role('button',name='Cancel',exact=True).click()
    assert not errors,errors
    print('Category browser persistence, duplicate submissions/slugs, validation, immutable URLs, ordering, visibility, failure/retry, deletion lock and six widths passed')
    browser.close()

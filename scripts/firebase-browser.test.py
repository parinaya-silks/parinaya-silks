"""Optional Playwright test: all Firestore reads are intercepted, never sent live.
Start npm run dev (3000) and npm run preview (4173) after a production build.
"""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context()
    context.route('**/api/catalog*', lambda route: route.fulfill(status=200,content_type='application/json',body='{"items":[],"nextCursor":null}'))
    # The production client must ignore SDK ambient emulator defaults as well.
    context.add_init_script("globalThis.__FIREBASE_DEFAULTS__ = { emulatorHosts: { firestore: '127.0.0.1:8080' } };")
    page = context.new_page()
    requests = []
    fixture = {'status': 'found'}
    resource = 'projects/parinaya-silks/databases/(default)/documents/connection_checks/status'

    def intercept(route):
        request = route.request
        requests.append(request)
        assert request.method == 'POST'
        assert '/projects/parinaya-silks/databases/(default)/documents:batchGet' in request.url
        payload = json.loads(request.post_data)
        assert payload['documents'] == [resource], 'Only the exact fixture document may be read'
        if fixture['status'] == 'denied':
            body = {'error': {'code': 403, 'status': 'PERMISSION_DENIED', 'message': 'Fixture rule denial'}}
            route.fulfill(status=403, json=body, headers={'Access-Control-Allow-Origin': '*'})
        else:
            result = {'found': {'name': resource, 'fields': {'privateFixtureValue': {'stringValue': 'DO_NOT_RETURN_CONTENTS'}}, 'createTime': '2026-01-01T00:00:00Z', 'updateTime': '2026-01-01T00:00:00Z'}} if fixture['status'] == 'found' else {'missing': resource}
            route.fulfill(status=200, json=[{**result, 'readTime': '2026-01-01T00:00:00Z'}], headers={'Access-Control-Allow-Origin': '*'})

    context.route('https://firestore.googleapis.com/**', intercept)
    page.goto('http://127.0.0.1:3000/')
    page.wait_for_function('Boolean(window.parinayaFirebase)')
    status = page.evaluate('window.parinayaFirebase.status()')
    assert status['status'] == 'database-initialized'
    assert status['databaseReadVerified'] is False
    assert requests == [], 'Startup must never read Firestore'
    missing_path = page.evaluate('window.parinayaFirebase.check()')
    assert missing_path['status'] == 'check-path-missing'
    assert requests == []
    for fixture_state, expected in [('found', 'read-succeeded'), ('missing', 'read-empty'), ('denied', 'permission-denied')]:
        fixture['status'] = fixture_state
        before = len(requests)
        result = page.evaluate("window.parinayaFirebase.check('connection_checks/status')")
        assert result['status'] == expected, result
        assert result['databaseReadVerified'] == (fixture_state != 'denied')
        assert 'DO_NOT_RETURN_CONTENTS' not in json.dumps(result)
        assert len(requests) == before + 1
    assert page.evaluate('''async () => {
      const one = await import('/src/services/firebase/app.ts?hmr-test-one');
      const two = await import('/src/services/firebase/app.ts?hmr-test-two');
      return one.getFirebaseApp().app === two.getFirebaseApp().app;
    }''') is True
    print('Browser SDK fixtures: no startup reads; exact-document success, missing data, denial, hosted endpoint and HMR reuse passed')

    production_context = browser.new_context()
    production_requests = []
    production_context.route('https://firestore.googleapis.com/**', lambda route: (production_requests.append(route.request), route.abort()))
    production = production_context.new_page()
    production.goto('http://127.0.0.1:4173/#/admin')
    production.get_by_role('heading', name='Administrator Sign In').wait_for()
    assert production.evaluate('typeof window.parinayaFirebase') == 'undefined'
    assert production_requests == []
    assert production.get_by_role('textbox', name='Email', exact=True).count() == 1
    assert production.get_by_label('Password', exact=True).count() == 1
    print('Production preview: admin authentication gate preserved; no debug global or automatic Firestore reads')
    browser.close()

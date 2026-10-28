"""Final scoped-layout smoke, after functional acceptance; isolated emulator fixtures."""
import os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
assert os.environ.get('FIRESTORE_EMULATOR_HOST')=='127.0.0.1:8080'
assert os.environ.get('FIREBASE_AUTH_EMULATOR_HOST')=='127.0.0.1:9099'
def fixture(command):
 result=subprocess.run(['node','--import','tsx','scripts/profile-fixture-control.ts',command],capture_output=True)
 assert result.returncode==0,'Local fixture failed'
fixture('seed');out=Path('.cache/profile-design');out.mkdir(parents=True,exist_ok=True)
try:
 with sync_playwright() as p:
  browser=p.chromium.launch();context=browser.new_context(viewport={'width':390,'height':900});context.route('https://**/*',lambda route:route.abort());page=context.new_page();page.goto('http://127.0.0.1:3100/account');page.get_by_label('Email address',exact=True).fill('customer@example.test');page.get_by_label('Password',exact=True).fill(os.environ['PARINAYA_ADMIN_TEST_PASSWORD']);page.get_by_role('button',name='Sign In',exact=True).click();expect(page.locator('.profile-avatar')).to_have_text('AR');expect(page.locator('.profile-address-count')).to_have_text('2 of 3 saved');expect(page.locator('.profile-points-value')).to_contain_text('4,000')
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
   if width<768:
    grid=page.locator('.profile-grid').bounding_box();assert all(abs(card.bounding_box()['width']-grid['width'])<2 for card in page.locator('.profile-personal,.profile-points,.profile-addresses-wrap,.profile-management').all())
   if width==1440:
    points=page.locator('.profile-points').bounding_box();management=page.locator('.profile-management').bounding_box();assert abs(management['y']-points['y']-points['height']-28)<2
   page.evaluate('document.activeElement?.blur()');page.screenshot(path=str(out/f'account-{width}.png'),full_page=True)
   page.get_by_role('button',name='Edit Details',exact=True).click();dialog=page.get_by_role('dialog',name='Edit Personal Details');expect(dialog).to_be_visible();assert dialog.get_by_role('button',name='Save Changes').bounding_box()['y']<900;page.screenshot(path=str(out/f'edit-details-{width}.png'),full_page=True);page.keyboard.press('Escape');expect(dialog).not_to_be_visible()
  # Extreme but valid-length labels must wrap; this changes DOM fixture text only.
  page.evaluate("()=>{document.querySelector('.profile-greeting h1').textContent='Hello, '+('LongName'.repeat(12));document.querySelector('.profile-email dd').textContent='customer.'+'long'.repeat(48)+'@example.test';}")
  for width in [320,390,768,1440]:
   page.set_viewport_size({'width':width,'height':900});page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),('long content',width)
  page.reload();expect(page.locator('.profile-avatar')).to_have_text('AR');page.get_by_role('button',name='My Orders',exact=True).click();page.wait_for_url('**/account/orders');page.goto('http://127.0.0.1:3100/account');page.get_by_role('button',name='Help & Contact',exact=True).click();page.wait_for_url('**/contact');browser.close()
 print('Profile final layout passed: four widths, balanced desktop columns, mobile order, dialogs, long names/emails and existing account destinations.')
finally:fixture('cleanup')

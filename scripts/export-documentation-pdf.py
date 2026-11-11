"""Print static documentation with the existing host Chromium; never contact services."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
manifest=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
with sync_playwright() as p:
 browser=p.chromium.launch()
 page=browser.new_page(viewport={'width':1100,'height':1400})
 page.route('http://**/*',lambda route:route.abort())
 page.route('https://**/*',lambda route:route.abort())
 for n,record in enumerate(manifest['records'],1):
  page.goto(Path(record['html']).resolve().as_uri(),wait_until='load')
  page.emulate_media(media='print')
  page.pdf(path=record['path'],format='A4',print_background=True,display_header_footer=True,
   header_template='<div></div>',footer_template='<div style="font-size:8px;width:100%;padding:0 15mm;color:#655b60;display:flex;justify-content:space-between"><span>PARINAYA SAREES | Documentation</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
   margin={'top':'19mm','bottom':'19mm','left':'15mm','right':'15mm'},prefer_css_page_size=True)
  if Path(record['path']).stat().st_size<1000:raise RuntimeError('Empty PDF: '+record['pdf'])
  print(f"PDF {n}/{len(manifest['records'])}: {record['pdf']}",flush=True)
 browser.close()

"""Local demo regressions. Uses synthetic fixture data only."""
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:3002/#/product/prod-padmavathi-rust')
    page.get_by_role('button', name='Add to Bag', exact=False).click()
    page.goto('http://127.0.0.1:3002/#/bag')
    page.get_by_role('button', name='Proceed to Checkout', exact=False).click()
    page.get_by_role('button', name='Simulate payment', exact=False).click()
    page.wait_for_url('**/order-confirmed?orderId=*')
    order_id = page.url.split('orderId=')[1]
    page.get_by_role('button', name='View Order', exact=False).first.click()
    assert order_id in page.url
    assert page.locator('nav[aria-label="Mobile Bottom Navigation"]').count() == 1
    print('Demo product -> bag -> checkout -> simulated result -> order details passed')

    result = page.evaluate('''async () => {
      const {storeService:s} = await import('/src/services/storeService.ts');
      const soldOut = s.getProducts().find(p => !p.inStock);
      const count = s.getCart().length;
      s.addToCart(soldOut);
      if (s.getCart().length !== count) throw new Error('Sold-out product added');
      const product = s.getProducts().find(p => p.inStock);
      s.addToCart(product, 999);
      if (s.getCart().find(i => i.productId === product.id).quantity > product.stockCount) throw new Error('Stock exceeded');
      s.updateProductStock(product.id, 1);
      if (s.getCart().find(i => i.productId === product.id).quantity !== 1) throw new Error('Stale cart stock');
      const base = s.getOrders()[0];
      const fixtures = [
        {...base,id:'test-paid',paymentStatus:'Paid',fulfilmentStatus:'Unfulfilled',courierPartner:undefined,trackingNumber:undefined},
        {...base,id:'test-pending',paymentStatus:'Pending',fulfilmentStatus:'Unfulfilled'},
        {...base,id:'test-delivered',paymentStatus:'Paid',fulfilmentStatus:'Delivered'}
      ];
      localStorage.setItem('parinaya_orders_demo_v2', JSON.stringify(fixtures));
      const bulk = s.bulkUpdateFulfilment(fixtures.map(o=>o.id),'Processing');
      if (bulk.successCount!==1 || bulk.ineligibleOrders.length!==2) throw new Error('Incorrect partial bulk result');
      s.updateOrderFulfilment('test-paid','Packed');
      let rejected=false;
      try {s.updateOrderFulfilment('test-paid','Shipped');} catch {rejected=true;}
      if (!rejected) throw new Error('Missing tracking accepted');
      s.updateOrderFulfilment('test-paid','Shipped','Test Courier','TEST-TRACK-1');
      if (s.getOrderById('test-pending').paymentStatus!=='Pending') throw new Error('Payment changed');
      return 'Stock limits, refreshed bag stock, partial bulk failure, and shipment details passed';
    }''')
    print(result)
    assert not errors, errors
    context = browser.new_context()
    production = context.new_page()
    production.goto('http://127.0.0.1:4173/login')
    assert production.get_by_role('button',name='Sign In',exact=True).is_disabled()
    production.goto('http://127.0.0.1:4173/checkout')
    production.get_by_role('heading',name='Checkout unavailable').wait_for()
    assert production.locator('input').count()==0
    assert production.evaluate('localStorage.length')==0
    production.goto('http://127.0.0.1:4173/admin/orders')
    production.get_by_role('heading', name='Administrator Sign In').wait_for()
    print('Production admin requires real authentication; customer login and checkout remain unavailable')
    browser.close()

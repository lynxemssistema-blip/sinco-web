const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Mock API requests so the app doesn't log us out
  await context.route('**/api/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] })
    });
  });

  const page = await context.newPage();
  
  // Set fake local storage
  await page.addInitScript(() => {
    window.localStorage.setItem('sinco_token', 'fake-token-123');
    window.localStorage.setItem('sinco_user', JSON.stringify({ id: 1, nome: 'Admin', role: 'admin', dbName: 'lynxlocal' }));
  });
  
  await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
  
  // Wait a bit to ensure rendering is complete
  await page.waitForTimeout(2000);
  
  const html = await page.innerHTML('body');
  console.log("BODY HTML:", html.substring(0, 1000) + '...');
  
  await browser.close();
})();

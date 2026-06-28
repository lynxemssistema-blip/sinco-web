const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log(`CONSOLE: ${msg.type()} - ${msg.text()}`));
  page.on('pageerror', error => console.log(`ERROR: ${error.message}`));
  
  // Set fake local storage
  await page.addInitScript(() => {
    window.localStorage.setItem('token', 'fake-token-123');
    window.localStorage.setItem('user', JSON.stringify({ id: 1, Nome: 'Admin', role: 'admin' }));
  });
  
  await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
  
  const html = await page.innerHTML('body');
  console.log("BODY HTML:", html.substring(0, 500) + '...');
  
  await browser.close();
})();

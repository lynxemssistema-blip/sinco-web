const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`CONSOLE: ${msg.type()} - ${msg.text()}`));
  page.on('pageerror', error => console.log(`ERROR: ${error.message}`));
  
  await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
  
  await browser.close();
})();

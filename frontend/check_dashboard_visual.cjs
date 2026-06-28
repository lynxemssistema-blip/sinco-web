const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'dashboard_screenshot.png' });
  
  // also get the HTML of the body
  const html = await page.innerHTML('body');
  console.log("BODY HTML:", html);
  
  await browser.close();
})();

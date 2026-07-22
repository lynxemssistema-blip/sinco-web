const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://easypanel.lynxems.com.br');
  await page.fill('input[type="email"]', 'edsonmanoel2012@gmail.com');
  await page.fill('input[type="password"]', '10207597Rdv*');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation();
  
  await page.goto('https://easypanel.lynxems.com.br/projects/sinco/services/app/source');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'easypanel-source.png' });
  
  await page.goto('https://easypanel.lynxems.com.br/projects/sinco/services/app/deployments');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'easypanel-deployments.png' });
  
  await browser.close();
  console.log('Screenshots taken!');
})();

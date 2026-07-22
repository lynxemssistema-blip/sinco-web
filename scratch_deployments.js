const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://easypanel.lynxems.com.br/projects/sinco/services/app/deployments');
  await page.fill('input[type="email"]', 'edsonmanoel2012@gmail.com');
  await page.fill('input[type="password"]', '10207597Rdv*');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation();
  
  await page.waitForTimeout(3000);
  const rows = await page.$$eval('table tr', trs => trs.map(tr => tr.innerText));
  console.log(rows.join('\n---\n'));
  
  // also check if the first one has a logs button and click it
  const logsButton = await page.$('table tr:nth-child(2) button');
  if (logsButton) {
    await logsButton.click();
    await page.waitForTimeout(2000);
    const logs = await page.innerText('.dialog-content'); // just guessing the selector
    console.log("LOGS:");
    console.log(logs.substring(0, 500));
  }
  
  await browser.close();
})();

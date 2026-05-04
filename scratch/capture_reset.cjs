const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('http://localhost:9088/auth');
  
  // Click "Forgot?" button
  await page.click('button:has-text("Forgot?")');
  
  // Wait for the reset password view
  await page.waitForSelector('h2:has-text("Reset Password")');
  
  await page.screenshot({ path: 'reset_password_issue.png' });
  await browser.close();
})();

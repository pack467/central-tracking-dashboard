const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    window.sessionStorage.setItem('ctd_splash_seen', '1');
    window.localStorage.setItem('ctd_splash_seen', '1');
  });
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  console.log('URL after networkidle:', page.url());
  
  const hasOps = await page.$('.ops-today-panel');
  console.log('has .ops-today-panel:', !!hasOps);
  
  const title = await page.title();
  console.log('Title:', title);
  
  const hasDashboardSkeleton = await page.$('[role="status"]');
  console.log('has [role="status"]:', !!hasDashboardSkeleton);

  const innerHTML = await page.evaluate(() => {
    return {
      bodyClass: document.body.className,
      firstArticle: document.querySelector('article')?.className,
      panelClasses: Array.from(document.querySelectorAll('article, section, [class*="panel"]')).map(el => el.className).slice(0, 5)
    };
  });
  console.log('HTML details:', innerHTML);

  await browser.close();
})();

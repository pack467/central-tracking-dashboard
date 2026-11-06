const fs = require('fs');
const path = require('path');
const os = require('os');
const playwrightPath = path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  
  // Wait for data to load
  await page.waitForTimeout(1500);
  
  // Inspect ops-today-panel
  const todayInfo = await page.evaluate(() => {
    const panel = document.querySelector('.ops-today-panel');
    const body = panel ? panel.querySelector('.report-panel-body') : null;
    const wrapper = body ? body.querySelector('div') : null;
    const list = document.querySelector('.today-ticket-list');
    const pagination = document.querySelector('.today-pagination');
    
    return {
      panel: panel ? {
        clientHeight: panel.clientHeight,
        scrollHeight: panel.scrollHeight,
        offsetHeight: panel.offsetHeight,
        computedMaxHeight: window.getComputedStyle(panel).maxHeight,
        computedHeight: window.getComputedStyle(panel).height,
        rect: panel.getBoundingClientRect()
      } : null,
      body: body ? {
        clientHeight: body.clientHeight,
        scrollHeight: body.scrollHeight,
        offsetHeight: body.offsetHeight,
        computedPadding: window.getComputedStyle(body).padding,
        computedHeight: window.getComputedStyle(body).height,
        rect: body.getBoundingClientRect()
      } : null,
      wrapper: wrapper ? {
        clientHeight: wrapper.clientHeight,
        scrollHeight: wrapper.scrollHeight,
        offsetHeight: wrapper.offsetHeight,
        computedHeight: window.getComputedStyle(wrapper).height,
        className: wrapper.className,
        rect: wrapper.getBoundingClientRect()
      } : null,
      list: list ? {
        clientHeight: list.clientHeight,
        scrollHeight: list.scrollHeight,
        offsetHeight: list.offsetHeight,
        rect: list.getBoundingClientRect()
      } : null,
      pagination: pagination ? {
        clientHeight: pagination.clientHeight,
        offsetHeight: pagination.offsetHeight,
        rect: pagination.getBoundingClientRect()
      } : null
    };
  });
  console.log('--- TODAY PANEL ---');
  console.log(JSON.stringify(todayInfo, null, 2));

  // Inspect user-summary-panel
  const userInfo = await page.evaluate(() => {
    const wrapper = document.querySelector('.user-summary-wrapper');
    const panel = document.querySelector('.user-summary-panel');
    const body = panel ? panel.querySelector('.user-summary-body') : null;
    const skelWrapper = body ? body.querySelector('div') : null;
    const list = document.querySelector('.user-summary-list');
    const cards = Array.from(document.querySelectorAll('.user-summary-card')).map((c, i) => ({
      index: i,
      name: c.querySelector('.user-summary-name')?.textContent,
      clientHeight: c.clientHeight,
      offsetHeight: c.offsetHeight,
      rect: c.getBoundingClientRect()
    }));
    
    return {
      wrapper: wrapper ? {
        clientHeight: wrapper.clientHeight,
        scrollHeight: wrapper.scrollHeight,
        computedHeight: window.getComputedStyle(wrapper).height,
        rect: wrapper.getBoundingClientRect()
      } : null,
      panel: panel ? {
        clientHeight: panel.clientHeight,
        scrollHeight: panel.scrollHeight,
        computedHeight: window.getComputedStyle(panel).height,
        rect: panel.getBoundingClientRect()
      } : null,
      body: body ? {
        clientHeight: body.clientHeight,
        scrollHeight: body.scrollHeight,
        computedPadding: window.getComputedStyle(body).padding,
        rect: body.getBoundingClientRect()
      } : null,
      skelWrapper: skelWrapper ? {
        clientHeight: skelWrapper.clientHeight,
        scrollHeight: skelWrapper.scrollHeight,
        className: skelWrapper.className,
        rect: skelWrapper.getBoundingClientRect()
      } : null,
      list: list ? {
        clientHeight: list.clientHeight,
        scrollHeight: list.scrollHeight,
        offsetHeight: list.offsetHeight,
        rect: list.getBoundingClientRect()
      } : null,
      cardsCount: cards.length,
      cardsSlice: cards.slice(0, 5)
    };
  });
  console.log('--- USER SUMMARY PANEL ---');
  console.log(JSON.stringify(userInfo, null, 2));

  // Take screenshots
  const todayEl = await page.$('.ops-today-panel');
  if (todayEl) {
    await todayEl.screenshot({ path: 'output/current-today-panel.png' });
  }

  const userRecapEl = await page.$('.user-summary-panel');
  if (userRecapEl) {
    await userRecapEl.screenshot({ path: 'output/current-user-recap.png' });
  }

  const opsRight = await page.$('.ops-right-column');
  if (opsRight) {
    await opsRight.screenshot({ path: 'output/current-ops-right.png' });
  }

  await browser.close();
  console.log('Done screenshots and inspection.');
})();

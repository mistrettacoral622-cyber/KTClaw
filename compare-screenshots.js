const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Screenshot design board Frame 1
  const designPage = await context.newPage();
  await designPage.goto('http://127.0.0.1:4174/kaitianclaw-design-board.html');
  await designPage.waitForTimeout(1000);

  // Find Frame 1 and screenshot it
  const frame1 = await designPage.locator('.fw').first();
  await frame1.screenshot({ path: 'tmp-design-frame.png' });
  console.log('Design board Frame 1 screenshot saved to tmp-design-frame.png');

  // Find Frame 2 and screenshot it
  const frame2 = await designPage.locator('.fw').nth(1);
  await frame2.screenshot({ path: 'tmp-design-frame2.png' });
  console.log('Design board Frame 2 screenshot saved to tmp-design-frame2.png');

  // Screenshot actual preview
  const previewPage = await context.newPage();
  await previewPage.goto('http://127.0.0.1:4176/');
  await previewPage.waitForTimeout(1000);
  await previewPage.screenshot({ path: 'tmp-app-localhost.png', fullPage: false });
  console.log('Preview screenshot saved to tmp-app-localhost.png');

  await browser.close();
})();

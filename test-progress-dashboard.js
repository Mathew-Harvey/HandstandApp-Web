const { chromium } = require('playwright');

async function testProgressDashboard() {
  console.log('Starting browser...');
  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/chromium'
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1024 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to login page
    console.log('\n=== STEP 1: Navigate to login page ===');
    await page.goto('http://localhost:3000/#/login');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-progress-1-login.png', fullPage: true });
    console.log('✓ Login page loaded');
    console.log('Screenshot saved: test-progress-1-login.png');
    
    // Get page content to see what's visible
    const loginContent = await page.content();
    const hasEmailField = await page.locator('input[type="email"], input[name="email"]').count() > 0;
    const hasPasswordField = await page.locator('input[type="password"], input[name="password"]').count() > 0;
    console.log(`Email field present: ${hasEmailField}`);
    console.log(`Password field present: ${hasPasswordField}`);
    
    // Step 2: Take snapshot of login page
    console.log('\n=== STEP 2: Login page snapshot ===');
    const loginTitle = await page.title();
    console.log(`Page title: ${loginTitle}`);
    const loginUrl = page.url();
    console.log(`Current URL: ${loginUrl}`);
    
    // Step 3: Log in
    console.log('\n=== STEP 3: Logging in ===');
    
    // Try to find and fill email field
    const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
    await page.waitForSelector(emailSelector, { timeout: 5000 });
    await page.fill(emailSelector, 'mat@mat.com');
    console.log('✓ Email filled');
    
    // Try to find and fill password field
    const passwordSelector = 'input[type="password"], input[name="password"]';
    await page.fill(passwordSelector, '123456');
    console.log('✓ Password filled');
    
    // Find and click login button
    const loginButtonSelector = 'button[type="submit"], button:has-text("Login"), button:has-text("Sign in")';
    await page.click(loginButtonSelector);
    console.log('✓ Login button clicked');
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    const afterLoginUrl = page.url();
    console.log(`URL after login: ${afterLoginUrl}`);
    await page.screenshot({ path: 'test-progress-2-after-login.png', fullPage: true });
    console.log('Screenshot saved: test-progress-2-after-login.png');
    
    // Step 4: Navigate to progress dashboard
    console.log('\n=== STEP 4: Navigate to progress dashboard ===');
    await page.goto('http://localhost:3000/#/progress');
    await page.waitForTimeout(3000); // Wait for data to load
    const progressUrl = page.url();
    console.log(`Current URL: ${progressUrl}`);
    await page.screenshot({ path: 'test-progress-3-dashboard-top.png', fullPage: false });
    console.log('Screenshot saved: test-progress-3-dashboard-top.png');
    
    // Step 5: Take snapshot of progress dashboard
    console.log('\n=== STEP 5: Progress dashboard snapshot (top) ===');
    const progressTitle = await page.title();
    console.log(`Page title: ${progressTitle}`);
    
    // Check for specific sections
    const sections = {
      'Hero stats': '.hero-stats, .stats-container, [class*="hero"], [class*="stats"]',
      'Heatmap': '.heatmap, [class*="heatmap"], [class*="calendar"]',
      'Volume chart': '.volume-chart, [class*="volume"], [class*="chart"]',
      'Level journey': '.level-journey, [class*="level"], [class*="journey"]',
      'Personal bests': '.personal-bests, [class*="personal"], [class*="bests"]',
      'Most practiced': '.most-practiced, [class*="most-practiced"], [class*="exercises"]'
    };
    
    console.log('\nChecking for sections:');
    for (const [name, selector] of Object.entries(sections)) {
      const count = await page.locator(selector).count();
      console.log(`  ${name}: ${count > 0 ? '✓ Found' : '✗ Not found'} (${count} elements)`);
    }
    
    // Check for any error messages
    const errorSelectors = '.error, [class*="error"], .alert, [class*="alert"]';
    const errorCount = await page.locator(errorSelectors).count();
    if (errorCount > 0) {
      console.log(`\n⚠ Warning: ${errorCount} error/alert elements found`);
      const errorTexts = await page.locator(errorSelectors).allTextContents();
      errorTexts.forEach((text, i) => {
        if (text.trim()) console.log(`  Error ${i + 1}: ${text.trim()}`);
      });
    }
    
    // Step 6: Scroll and capture more sections
    console.log('\n=== STEP 6: Scrolling through dashboard ===');
    
    // Scroll to 1/3 of page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-progress-4-dashboard-middle.png', fullPage: false });
    console.log('Screenshot saved: test-progress-4-dashboard-middle.png');
    
    // Scroll to 2/3 of page
    await page.evaluate(() => window.scrollTo(0, (document.body.scrollHeight / 3) * 2));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-progress-5-dashboard-lower.png', fullPage: false });
    console.log('Screenshot saved: test-progress-5-dashboard-lower.png');
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-progress-6-dashboard-bottom.png', fullPage: false });
    console.log('Screenshot saved: test-progress-6-dashboard-bottom.png');
    
    // Take a full page screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-progress-7-dashboard-full.png', fullPage: true });
    console.log('Screenshot saved: test-progress-7-dashboard-full.png');
    
    // Get page dimensions and content info
    const dimensions = await page.evaluate(() => ({
      scrollHeight: document.body.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    console.log('\nPage dimensions:');
    console.log(`  Scroll height: ${dimensions.scrollHeight}px`);
    console.log(`  Client height: ${dimensions.clientHeight}px`);
    console.log(`  Scroll width: ${dimensions.scrollWidth}px`);
    console.log(`  Client width: ${dimensions.clientWidth}px`);
    
    // Check console logs and errors
    console.log('\n=== Browser Console Messages ===');
    page.on('console', msg => console.log(`  ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', error => console.log(`  Page error: ${error.message}`));
    
    console.log('\n=== Test Complete ===');
    console.log('All screenshots saved successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    await page.screenshot({ path: 'test-progress-error.png', fullPage: true });
    console.log('Error screenshot saved: test-progress-error.png');
  } finally {
    await browser.close();
  }
}

testProgressDashboard().catch(console.error);

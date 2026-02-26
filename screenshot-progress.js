const puppeteer = require('puppeteer');

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  console.log('Navigating to login page...');
  
  try {
    await page.goto('http://localhost:3000/#/login', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    await wait(2000);
    console.log('Current URL:', page.url());
    
    // Take screenshot of login page
    await page.screenshot({ path: 'screenshot-login.png', fullPage: true });
    console.log('Screenshot saved: screenshot-login.png');
    
    // Fill login form
    console.log('Filling login form...');
    await page.type('input[type="email"]', 'mat@mat.com');
    await page.type('input[type="password"]', '123456');
    
    console.log('Clicking login button...');
    
    // Wait for navigation after clicking login
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => console.log('No navigation occurred')),
      page.click('button[type="submit"]')
    ]);
    
    await wait(3000);
    console.log('After login, current URL:', page.url());
    
    // Check for error messages
    const errorMsg = await page.evaluate(() => {
      const errorEl = document.querySelector('.alert-error, .error, [class*="error"]');
      return errorEl ? errorEl.innerText : null;
    });
    
    if (errorMsg) {
      console.log('Error message found:', errorMsg);
    }
    
    // Take screenshot after login attempt
    await page.screenshot({ path: 'screenshot-after-login.png', fullPage: true });
    console.log('Screenshot saved: screenshot-after-login.png');
    
    // Navigate to progress page
    console.log('Navigating to progress page...');
    await page.goto('http://localhost:3000/#/progress', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    await wait(3000);
    console.log('Current URL:', page.url());
    
    // Take full page screenshot
    await page.screenshot({ path: 'screenshot-progress-full.png', fullPage: true });
    console.log('Screenshot saved: screenshot-progress-full.png');
    
    // Get page info
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 1500),
        hasHeroStats: !!document.querySelector('[class*="hero"]'),
        hasHeatmap: !!document.querySelector('[class*="heatmap"]'),
        hasChart: !!document.querySelector('canvas'),
        hasLevel: !!document.querySelector('[class*="level"]'),
        sections: Array.from(document.querySelectorAll('[class*="section"], .card, [class*="card"]')).length,
        allClasses: Array.from(new Set(
          Array.from(document.querySelectorAll('*'))
            .flatMap(el => Array.from(el.classList))
            .filter(c => c.includes('hero') || c.includes('heat') || c.includes('chart') || c.includes('level') || c.includes('progress'))
        )).slice(0, 20)
      };
    });
    
    console.log('\n=== PAGE INFO ===');
    console.log('Title:', pageInfo.title);
    console.log('Has hero stats:', pageInfo.hasHeroStats);
    console.log('Has heatmap:', pageInfo.hasHeatmap);
    console.log('Has chart:', pageInfo.hasChart);
    console.log('Has level section:', pageInfo.hasLevel);
    console.log('Number of sections/cards:', pageInfo.sections);
    console.log('Relevant classes found:', pageInfo.allClasses);
    console.log('\nVisible text (first 1500 chars):');
    console.log(pageInfo.bodyText);
    
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
    console.log('Error screenshot saved: screenshot-error.png');
  }
  
  await browser.close();
  console.log('\nDone!');
})();

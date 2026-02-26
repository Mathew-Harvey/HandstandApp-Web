const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Navigate to the page
  await page.goto('http://localhost:3000/hero-test.html', { waitUntil: 'networkidle0' });
  
  // Take screenshot at default viewport (800x600)
  console.log('Taking screenshot at default viewport...');
  await page.screenshot({ 
    path: 'screenshot-desktop.png',
    fullPage: false
  });
  console.log('✓ Saved screenshot-desktop.png');
  
  // Resize to mobile viewport (375x812 - iPhone X)
  console.log('\nResizing to mobile viewport (375x812)...');
  await page.setViewport({ width: 375, height: 812 });
  
  // Wait a moment for any responsive changes
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Take screenshot at mobile viewport
  console.log('Taking screenshot at mobile viewport...');
  await page.screenshot({ 
    path: 'screenshot-mobile.png',
    fullPage: false
  });
  console.log('✓ Saved screenshot-mobile.png');
  
  await browser.close();
  
  console.log('\n✓ Screenshots saved successfully!');
  console.log('  - screenshot-desktop.png (default viewport)');
  console.log('  - screenshot-mobile.png (375x812)');
})();

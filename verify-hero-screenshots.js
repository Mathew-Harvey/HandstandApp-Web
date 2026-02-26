const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureScreenshots() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to hero test page...');
  await page.goto('http://localhost:3000/hero-test.html?v=3', { waitUntil: 'networkidle2' });

  // Mobile viewport (375x812)
  console.log('\n=== MOBILE VIEW (375x812) ===');
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for any CSS transitions
  
  const mobileScreenshot = await page.screenshot({ fullPage: false });
  fs.writeFileSync('hero-mobile-375.png', mobileScreenshot);
  console.log('✓ Mobile screenshot saved: hero-mobile-375.png');

  // Count visible images in mobile view
  const mobileVisibleImages = await page.evaluate(() => {
    const images = document.querySelectorAll('.dashboard-hero-img');
    let visible = 0;
    images.forEach(img => {
      const style = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();
      if (style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0) {
        visible++;
      }
    });
    return visible;
  });
  console.log(`Visible images: ${mobileVisibleImages}`);

  // Desktop viewport (1280x800)
  console.log('\n=== DESKTOP VIEW (1280x800) ===');
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait for any CSS transitions
  
  const desktopScreenshot = await page.screenshot({ fullPage: false });
  fs.writeFileSync('hero-desktop-1280.png', desktopScreenshot);
  console.log('✓ Desktop screenshot saved: hero-desktop-1280.png');

  // Count visible images in desktop view
  const desktopVisibleImages = await page.evaluate(() => {
    const images = document.querySelectorAll('.dashboard-hero-img');
    let visible = 0;
    images.forEach(img => {
      const style = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();
      if (style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0) {
        visible++;
      }
    });
    return visible;
  });
  console.log(`Visible images: ${desktopVisibleImages}`);

  // Get detailed image info for both views
  console.log('\n=== DETAILED ANALYSIS ===');
  
  // Switch back to mobile for analysis
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const mobileImageInfo = await page.evaluate(() => {
    const images = document.querySelectorAll('.dashboard-hero-img');
    return Array.from(images).map((img, index) => {
      const style = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();
      return {
        index: index + 1,
        src: img.src.split('/').pop(),
        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
        display: style.display,
        width: rect.width,
        height: rect.height
      };
    });
  });
  
  console.log('\nMobile (375px) - Image Details:');
  mobileImageInfo.forEach(info => {
    console.log(`  Image ${info.index} (${info.src}): ${info.visible ? 'VISIBLE' : 'HIDDEN'} - display: ${info.display}, size: ${Math.round(info.width)}x${Math.round(info.height)}px`);
  });

  // Switch to desktop for analysis
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const desktopImageInfo = await page.evaluate(() => {
    const images = document.querySelectorAll('.dashboard-hero-img');
    return Array.from(images).map((img, index) => {
      const style = window.getComputedStyle(img);
      const rect = img.getBoundingClientRect();
      return {
        index: index + 1,
        src: img.src.split('/').pop(),
        visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0,
        display: style.display,
        width: rect.width,
        height: rect.height
      };
    });
  });
  
  console.log('\nDesktop (1280px) - Image Details:');
  desktopImageInfo.forEach(info => {
    console.log(`  Image ${info.index} (${info.src}): ${info.visible ? 'VISIBLE' : 'HIDDEN'} - display: ${info.display}, size: ${Math.round(info.width)}x${Math.round(info.height)}px`);
  });

  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  console.log(`Mobile (375px): ${mobileVisibleImages} images visible (expected: 2)`);
  console.log(`Desktop (1280px): ${desktopVisibleImages} images visible (expected: 3)`);
  console.log('\nScreenshots saved in current directory.');
}

captureScreenshots().catch(console.error);

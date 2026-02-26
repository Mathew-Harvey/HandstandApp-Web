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
  
  console.log('Navigating to app...');
  
  try {
    await page.goto('http://localhost:3000/', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    await wait(2000);
    
    // Inject mock user and data
    console.log('Injecting mock data...');
    await page.evaluate(() => {
      // Mock current user
      window.currentUser = {
        id: 1,
        email: 'mat@mat.com',
        name: 'Mat',
        theme: 'dark'
      };
      
      // Mock API responses
      const originalFetch = window.fetch;
      window.fetch = async (url, options) => {
        console.log('Intercepted fetch:', url);
        
        // Mock auth/me
        if (url.includes('/api/auth/me')) {
          return {
            ok: true,
            json: async () => ({ authenticated: true, user: window.currentUser })
          };
        }
        
        // Mock sessions (for progress data)
        if (url.includes('/api/sessions')) {
          // Generate mock session data for the last 30 days
          const sessions = [];
          const today = new Date();
          for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            // Add 1-3 sessions per day (randomly)
            const numSessions = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < numSessions; j++) {
              sessions.push({
                id: sessions.length + 1,
                user_id: 1,
                date: dateStr,
                exercise_key: ['chest_to_wall_handstand', 'heel_pulls', 'toe_pulls', 'kick_up', 'balance_game'][Math.floor(Math.random() * 5)],
                duration_seconds: Math.floor(Math.random() * 300) + 60,
                level_id: Math.floor(Math.random() * 10) + 1,
                notes: null,
                created_at: date.toISOString()
              });
            }
          }
          
          return {
            ok: true,
            json: async () => ({ sessions })
          };
        }
        
        // Mock levels
        if (url.includes('/api/levels')) {
          return {
            ok: true,
            json: async () => ({
              levels: [
                { id: 1, name: 'Foundation', order_index: 1 },
                { id: 2, name: 'Wall Work', order_index: 2 },
                { id: 3, name: 'Balance Basics', order_index: 3 },
                { id: 4, name: 'Kick-Up Practice', order_index: 4 },
                { id: 5, name: 'Free Balance', order_index: 5 },
                { id: 6, name: 'Advanced Drills', order_index: 6 },
                { id: 7, name: 'Mastery', order_index: 7 }
              ]
            })
          };
        }
        
        // Fall back to original fetch
        return originalFetch(url, options);
      };
    });
    
    // Navigate to progress page
    console.log('Navigating to progress page...');
    await page.goto('http://localhost:3000/#/progress', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    await wait(5000); // Wait for charts to render
    
    console.log('Current URL:', page.url());
    
    // Take full page screenshot
    await page.screenshot({ path: 'screenshot-progress-full.png', fullPage: true });
    console.log('Screenshot saved: screenshot-progress-full.png');
    
    // Take viewport screenshot (what user sees without scrolling)
    await page.screenshot({ path: 'screenshot-progress-viewport.png', fullPage: false });
    console.log('Screenshot saved: screenshot-progress-viewport.png');
    
    // Get page info
    const pageInfo = await page.evaluate(() => {
      const getElementInfo = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        return {
          exists: true,
          text: el.innerText.substring(0, 200),
          visible: el.offsetParent !== null
        };
      };
      
      return {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 2000),
        hasNav: !!document.querySelector('nav, .nav'),
        hasHeroStats: !!document.querySelector('[class*="hero-stat"]'),
        hasHeatmap: !!document.querySelector('[class*="heatmap"]'),
        hasChart: !!document.querySelector('canvas'),
        hasLevel: !!document.querySelector('[class*="level"]'),
        sections: Array.from(document.querySelectorAll('section, .section, [class*="section"]')).length,
        cards: Array.from(document.querySelectorAll('.card, [class*="card"]')).length,
        canvases: document.querySelectorAll('canvas').length,
        allClasses: Array.from(new Set(
          Array.from(document.querySelectorAll('*'))
            .flatMap(el => Array.from(el.classList))
        )).filter(c => 
          c.includes('hero') || 
          c.includes('heat') || 
          c.includes('chart') || 
          c.includes('level') || 
          c.includes('progress') ||
          c.includes('stat') ||
          c.includes('card')
        ).slice(0, 30)
      };
    });
    
    console.log('\n=== PAGE INFO ===');
    console.log('Title:', pageInfo.title);
    console.log('Has navigation:', pageInfo.hasNav);
    console.log('Has hero stats:', pageInfo.hasHeroStats);
    console.log('Has heatmap:', pageInfo.hasHeatmap);
    console.log('Has chart:', pageInfo.hasChart);
    console.log('Has level section:', pageInfo.hasLevel);
    console.log('Number of sections:', pageInfo.sections);
    console.log('Number of cards:', pageInfo.cards);
    console.log('Number of canvases:', pageInfo.canvases);
    console.log('Relevant classes found:', pageInfo.allClasses);
    console.log('\nVisible text (first 2000 chars):');
    console.log(pageInfo.bodyText);
    
  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'screenshot-error.png', fullPage: true });
    console.log('Error screenshot saved: screenshot-error.png');
  }
  
  await browser.close();
  console.log('\nDone!');
})();

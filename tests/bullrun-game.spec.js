// @ts-check
import { test, expect } from '@playwright/test';

test.describe('Bullrun Card Game Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('应用加载和基础UI测试', async ({ page }) => {
    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('Bullrun 卡牌世界');
    
    // Check if the subtitle is visible
    await expect(page.getByText('基于实时加密货币价格的策略卡牌游戏')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/screenshots/homepage.png' });
  });

  test('钱包连接按钮功能测试', async ({ page }) => {
    // Check if connect wallet button exists
    const connectButton = page.getByRole('button', { name: /连接钱包开始游戏/ });
    await expect(connectButton).toBeVisible();
    
    // Check button styling
    const buttonStyle = await connectButton.evaluate(el => getComputedStyle(el));
    expect(buttonStyle.background).toContain('linear-gradient');
    
    // Click the button (note: this will fail without MetaMask, but we test the UI)
    await connectButton.click();
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'test-results/screenshots/wallet-connect-attempt.png' });
  });

  test('游戏计时器显示测试', async ({ page }) => {
    // Look for timer elements
    const timerElements = page.locator('[style*="Time Remaining"]');
    if (await timerElements.count() > 0) {
      await expect(timerElements.first()).toBeVisible();
    }
    
    // Take screenshot of timer area
    await page.screenshot({ path: 'test-results/screenshots/timer-display.png' });
  });

  test('标签页导航测试', async ({ page }) => {
    // Wait for potential navigation tabs to load
    await page.waitForTimeout(2000);
    
    // Check for navigation tabs if they exist
    const gameTabs = page.locator('button:has-text("游戏大厅"), button:has-text("我的卡牌"), button:has-text("排行榜"), button:has-text("市场行情")');
    
    if (await gameTabs.count() > 0) {
      // Test each tab if they exist
      for (let i = 0; i < await gameTabs.count(); i++) {
        await gameTabs.nth(i).click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `test-results/screenshots/tab-${i}.png` });
      }
    }
  });

  test('响应式设计测试', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'test-results/screenshots/desktop-view.png', fullPage: true });
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: 'test-results/screenshots/tablet-view.png', fullPage: true });
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.screenshot({ path: 'test-results/screenshots/mobile-view.png', fullPage: true });
  });

  test('页面性能测试', async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    
    // Check for console errors
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(msg.text());
      }
    });
    
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log('Console errors:', consoleLogs);
    // Allow some expected errors (like MetaMask not found)
    const criticalErrors = consoleLogs.filter(log => 
      !log.includes('MetaMask') && 
      !log.includes('ethereum') &&
      !log.includes('wallet')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('无障碍性测试', async ({ page }) => {
    // Check for proper heading structure
    const h1Elements = page.locator('h1');
    await expect(h1Elements).toHaveCount(1);
    
    // Check for alt text on images (if any)
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      if (alt === null || alt === '') {
        console.warn(`Image ${i} missing alt text`);
      }
    }
    
    // Check color contrast (basic check)
    const textElements = page.locator('p, div, span').first();
    if (await textElements.count() > 0) {
      const styles = await textElements.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });
      console.log('Text styling:', styles);
    }
  });

  test('错误处理测试', async ({ page }) => {
    // Test navigation to non-existent routes
    await page.goto('/#/nonexistent');
    await page.waitForTimeout(2000);
    
    // Should still show the main app, not a 404
    await expect(page.locator('h1')).toContainText('卡牌世界');
    
    // Take screenshot of error handling
    await page.screenshot({ path: 'test-results/screenshots/error-handling.png' });
  });

  test('动画和交互测试', async ({ page }) => {
    // Test hover effects on buttons
    const buttons = page.locator('button').first();
    if (await buttons.count() > 0) {
      await buttons.hover();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/screenshots/button-hover.png' });
    }
    
    // Test any animations or transitions
    await page.evaluate(() => {
      // Trigger any animations
      const event = new Event('resize');
      window.dispatchEvent(event);
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/screenshots/after-animations.png' });
  });

});

test.describe('Bullrun Game Features', () => {
  
  test('卡牌数据完整性测试', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if we can access card data through global variables or dev tools
    const cardData = await page.evaluate(() => {
      // Try to access any global card data
      if (window.bullrunCards || window.cryptoCards) {
        return window.bullrunCards || window.cryptoCards;
      }
      return null;
    });
    
    if (cardData) {
      expect(cardData.length).toBeGreaterThan(0);
      console.log(`Found ${cardData.length} cards in the game`);
    }
  });

  test('价格数据模拟测试', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for any price display elements
    const priceElements = page.locator('text=/\\$\\d+/');
    const priceCount = await priceElements.count();
    
    console.log(`Found ${priceCount} price elements on page`);
    
    if (priceCount > 0) {
      // Take screenshot showing prices
      await page.screenshot({ path: 'test-results/screenshots/price-data.png' });
    }
  });

  test('游戏状态切换测试', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for game status indicators
    const statusElements = page.locator('text=/游戏|状态|时间|剩余/');
    const statusCount = await statusElements.count();
    
    console.log(`Found ${statusCount} status elements`);
    
    // Take screenshot of current game state
    await page.screenshot({ path: 'test-results/screenshots/game-status.png' });
  });

});

test.describe('Cross-browser Compatibility', () => {

  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`${browserName} 兼容性测试`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Basic functionality test
      await expect(page.locator('h1')).toBeVisible();
      
      // Take browser-specific screenshot
      await page.screenshot({ 
        path: `test-results/screenshots/${browserName}-compatibility.png`,
        fullPage: true 
      });
      
      console.log(`${browserName} compatibility test passed`);
    });
  });

});
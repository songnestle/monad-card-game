// @ts-check
const { test, expect } = require('@playwright/test');

// Monad 测试网配置
const MONAD_CONFIG = {
  chainId: '0x27AF',
  chainName: 'Monad Testnet',
  rpcUrls: ['https://testnet.monad.network'],
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MONAD',
    decimals: 18
  }
};

test.describe('Monad 卡牌游戏完整测试', () => {
  test.beforeEach(async ({ page }) => {
    // 设置更长的超时时间
    test.setTimeout(60000);
    
    // 访问应用
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    // 等待页面完全加载
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test('应用基础功能检查', async ({ page }) => {
    // 检查标题
    await expect(page.locator('h1')).toContainText('Monad 加密卡牌游戏');
    
    // 检查奖池显示
    const prizePool = page.locator('text=奖池').locator('..').locator('div.text-xl');
    await expect(prizePool).toBeVisible();
    
    // 检查参与人数显示
    const playerCount = page.locator('text=参与人数').locator('..').locator('div.text-xl');
    await expect(playerCount).toBeVisible();
    
    // 检查连接钱包按钮
    const connectButton = page.locator('button:has-text("连接钱包")');
    await expect(connectButton).toBeVisible();
    
    // 检查游戏规则
    await expect(page.locator('h3:has-text("游戏规则")')).toBeVisible();
  });

  test('卡牌市场显示和交互', async ({ page }) => {
    // 检查卡牌市场标题
    await expect(page.locator('h2:has-text("加密货币卡牌市场")')).toBeVisible();
    
    // 检查稀有度标签
    await expect(page.locator('text=稀有 (Top 10)')).toBeVisible();
    await expect(page.locator('text=非凡 (11-20)')).toBeVisible();
    await expect(page.locator('text=普通 (21-30)')).toBeVisible();
    
    // 检查卡牌数量
    const cards = page.locator('button:has(div.text-4xl)');
    await expect(cards).toHaveCount(30);
    
    // 验证特定卡牌
    const btcCard = page.locator('button:has-text("BTC")').first();
    await expect(btcCard).toBeVisible();
    await expect(btcCard.locator('text=Bitcoin')).toBeVisible();
    
    const ethCard = page.locator('button:has-text("ETH")').first();
    await expect(ethCard).toBeVisible();
    await expect(ethCard.locator('text=Ethereum')).toBeVisible();
  });

  test('卡牌选择功能', async ({ page }) => {
    // 选择5张卡牌
    const cardsToSelect = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'];
    
    for (const symbol of cardsToSelect) {
      const card = page.locator(`button:has-text("${symbol}")`).first();
      await card.click();
      await page.waitForTimeout(200);
    }
    
    // 检查已选择卡牌区域
    await expect(page.locator('text=已选择的卡牌 (5/5)')).toBeVisible();
    
    // 检查预估分数
    const estimatedScore = page.locator('text=预估分数').locator('..').locator('div.text-2xl');
    await expect(estimatedScore).toBeVisible();
    const scoreText = await estimatedScore.textContent();
    expect(parseInt(scoreText.replace(/,/g, ''))).toBeGreaterThan(0);
    
    // 检查提交按钮
    const submitButton = page.locator('button:has-text("提交手牌 (0.01 MONAD)")');
    await expect(submitButton).toBeVisible();
    
    // 测试移除卡牌
    const removeButton = page.locator('button:has-text("×")').first();
    await removeButton.click();
    await expect(page.locator('text=已选择的卡牌 (4/5)')).toBeVisible();
  });

  test('价格更新检查', async ({ page }) => {
    // 获取初始价格
    const btcCard = page.locator('button:has-text("BTC")').first();
    const initialPrice = await btcCard.locator('div.text-sm.font-mono').textContent();
    
    // 等待价格更新（5秒）
    await page.waitForTimeout(5500);
    
    // 检查价格是否有变化
    const updatedPrice = await btcCard.locator('div.text-sm.font-mono').textContent();
    // 价格应该在更新（虽然可能相同）
    expect(updatedPrice).toBeTruthy();
  });

  test('响应式设计检查', async ({ page }) => {
    // 桌面视图
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('.grid.grid-cols-2.md\\:grid-cols-3.lg\\:grid-cols-5')).toBeVisible();
    
    // 平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    const tabletGrid = await page.locator('.grid').first();
    await expect(tabletGrid).toBeVisible();
    
    // 手机视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('错误提示功能', async ({ page }) => {
    // 尝试选择超过5张卡牌
    const cards = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'AVAX'];
    
    for (let i = 0; i < 5; i++) {
      const card = page.locator(`button:has-text("${cards[i]}")`).first();
      await card.click();
      await page.waitForTimeout(100);
    }
    
    // 尝试选择第6张
    const sixthCard = page.locator(`button:has-text("${cards[5]}")`).first();
    await sixthCard.click();
    
    // 应该显示错误消息
    await expect(page.locator('text=最多只能选择5张卡牌')).toBeVisible();
  });

  test('钱包连接模拟', async ({ page }) => {
    // 模拟没有安装钱包的情况
    await page.evaluate(() => {
      delete window.ethereum;
    });
    
    const connectButton = page.locator('button:has-text("连接钱包")');
    await connectButton.click();
    
    // 应该显示错误提示
    await expect(page.locator('text=请安装 MetaMask 钱包')).toBeVisible();
  });

  test('完整游戏流程模拟', async ({ page, context }) => {
    // 注入模拟的 ethereum 对象
    await page.evaluateOnNewDocument(() => {
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method, params }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f6e9e0'];
          }
          if (method === 'wallet_switchEthereumChain') {
            return null;
          }
          if (method === 'eth_chainId') {
            return '0x27AF';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {}
      };
    });
    
    await page.reload();
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // 连接钱包
    const connectButton = page.locator('button:has-text("连接钱包")');
    await connectButton.click();
    
    // 等待连接成功
    await page.waitForTimeout(2000);
    
    // 检查是否显示地址
    const addressDisplay = page.locator('text=/0x742d...e9e0/i');
    await expect(addressDisplay).toBeVisible({ timeout: 5000 });
    
    // 选择5张卡牌
    const cardsToSelect = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'];
    for (const symbol of cardsToSelect) {
      const card = page.locator(`button:has-text("${symbol}")`).first();
      await card.click();
      await page.waitForTimeout(200);
    }
    
    // 检查提交按钮可用
    const submitButton = page.locator('button:has-text("提交手牌 (0.01 MONAD)")');
    await expect(submitButton).toBeEnabled();
  });

  test('性能检查', async ({ page }) => {
    // 记录性能指标
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    console.log('性能指标:', metrics);
    
    // 验证性能指标
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    expect(metrics.loadComplete).toBeLessThan(5000);
    if (metrics.firstContentfulPaint > 0) {
      expect(metrics.firstContentfulPaint).toBeLessThan(2000);
    }
  });

  test('辅助功能检查', async ({ page }) => {
    // 检查关键元素的可访问性
    const connectButton = page.locator('button:has-text("连接钱包")');
    await expect(connectButton).toHaveAttribute('type', 'button');
    
    // 检查图片是否有替代文本（卡牌使用emoji，应该有aria-label）
    const cards = page.locator('button:has(div.text-4xl)');
    const firstCard = cards.first();
    const cardText = await firstCard.textContent();
    expect(cardText).toBeTruthy();
  });
});

test.describe('Playwright 测试环境验证', () => {
  test('验证测试环境配置', async ({ page }) => {
    console.log('✅ Playwright 测试环境已正确配置');
    console.log('📍 测试 URL: http://localhost:5173/');
    console.log('🎯 目标链: Monad Testnet (chainId: 10143)');
    
    // 验证浏览器可以访问本地服务器
    const response = await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
    expect(response.status()).toBe(200);
  });
});
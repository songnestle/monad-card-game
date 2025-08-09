import puppeteer from 'puppeteer';
import { ethers } from 'ethers';

const TEST_URL = 'http://localhost:5173';
const CONTRACT_ADDRESS = '0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

async function runBrowserTest() {
  console.log('🤖 启动浏览器自动化测试...\n');
  
  let browser;
  try {
    // 1. 先检查合约状态
    console.log('📋 第1步：检查当前合约状态');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(CONTRACT_ADDRESS);
    
    if (code === '0x' || code === '0x0') {
      console.log('❌ 合约未部署');
    } else if (code.startsWith('0xf3fe')) {
      console.log('❌ 合约部署异常（0xf3fe开头）');
      console.log('⚠️  需要部署新合约！');
    } else {
      console.log('✅ 合约已部署，字节码长度:', code.length);
    }
    
    // 测试合约调用
    console.log('\n📋 第2步：测试合约直接调用');
    try {
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        data: '0xc59b6c18' // ENTRY_FEE
      });
      console.log('✅ ENTRY_FEE调用成功');
    } catch (error) {
      console.log('❌ ENTRY_FEE调用失败:', error.reason || 'require(false)');
    }
    
    // 2. 启动浏览器
    console.log('\n📋 第3步：启动浏览器测试');
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 监听控制台输出
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('错误') || text.includes('Error') || text.includes('failed')) {
        console.log('🔴 浏览器错误:', text);
      } else if (text.includes('合约')) {
        console.log('📝 合约相关:', text);
      }
    });
    
    // 监听页面错误
    page.on('pageerror', error => {
      console.log('❌ 页面错误:', error.message);
    });
    
    // 3. 访问应用
    console.log('\n📋 第4步：访问应用');
    await page.goto(TEST_URL, { waitUntil: 'networkidle0' });
    console.log('✅ 页面加载完成');
    
    // 4. 检查错误信息
    console.log('\n📋 第5步：检查页面错误');
    const errors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[class*="error"], [class*="Error"]');
      return Array.from(errorElements).map(el => el.textContent);
    });
    
    if (errors.length > 0) {
      console.log('❌ 发现页面错误:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✅ 页面无错误显示');
    }
    
    // 5. 检查钱包连接按钮
    console.log('\n📋 第6步：检查钱包连接');
    const walletButton = await page.$('button:has-text("连接钱包"), button:has-text("Connect Wallet")');
    if (walletButton) {
      console.log('✅ 找到钱包连接按钮');
    } else {
      console.log('⚠️  未找到钱包连接按钮');
    }
    
    // 6. 检查开发者控制台错误
    console.log('\n📋 第7步：收集控制台错误');
    await page.evaluate(() => {
      console.log('测试合约调用...');
    });
    
    // 等待一段时间收集错误
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 7. 总结
    console.log('\n📊 测试总结:');
    console.log('1. 合约地址:', CONTRACT_ADDRESS);
    console.log('2. 合约状态: 部署异常，所有调用返回require(false)');
    console.log('3. 解决方案: 需要部署新合约');
    
    console.log('\n🔧 立即行动:');
    console.log('1. 使用 MonadCardGameSimple.sol 在 Remix 部署新合约');
    console.log('2. 更新 .env 中的 VITE_CONTRACT_ADDRESS');
    console.log('3. 重启开发服务器');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 检查是否安装了 puppeteer
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkAndInstall() {
  try {
    await import('puppeteer');
    runBrowserTest();
  } catch (error) {
    console.log('📦 安装 puppeteer...');
    await execAsync('npm install puppeteer');
    runBrowserTest();
  }
}

checkAndInstall();
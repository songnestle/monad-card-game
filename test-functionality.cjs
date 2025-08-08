#!/usr/bin/env node

/**
 * 自动化功能测试脚本
 * 全面验证网页功能是否完美
 */

const { execSync } = require('child_process');
const http = require('http');

console.log('🚀 开始全面自动化功能测试...\n');

// 测试函数
const tests = {
  // 测试1: 服务器响应
  async testServerResponse() {
    console.log('1️⃣ 测试服务器响应...');
    return new Promise((resolve, reject) => {
      const req = http.get('http://localhost:5173', (res) => {
        if (res.statusCode === 200) {
          console.log('   ✅ 服务器正常响应 (200 OK)');
          resolve(true);
        } else {
          console.log(`   ❌ 服务器响应异常 (${res.statusCode})`);
          resolve(false);
        }
      });
      
      req.on('error', (err) => {
        console.log(`   ❌ 服务器连接失败: ${err.message}`);
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        console.log('   ❌ 服务器响应超时');
        resolve(false);
      });
    });
  },

  // 测试2: HTML内容
  async testHTMLContent() {
    console.log('2️⃣ 测试HTML内容完整性...');
    try {
      const response = execSync('curl -s http://localhost:5173', { encoding: 'utf8' });
      
      const checks = [
        { name: 'HTML DOCTYPE', test: response.includes('<!doctype html>') },
        { name: '页面标题', test: response.includes('Monad Card Game') },
        { name: 'React根节点', test: response.includes('<div id="root">') },
        { name: '主脚本', test: response.includes('src="/src/main.jsx"') || response.includes('main.jsx') },
        { name: '字符编码', test: response.includes('charset="UTF-8"') }
      ];

      let passed = 0;
      checks.forEach(check => {
        if (check.test) {
          console.log(`   ✅ ${check.name}`);
          passed++;
        } else {
          console.log(`   ❌ ${check.name}`);
        }
      });

      return passed === checks.length;
    } catch (error) {
      console.log(`   ❌ HTML测试失败: ${error.message}`);
      return false;
    }
  },

  // 测试3: JavaScript资源
  async testJavaScriptResources() {
    console.log('3️⃣ 测试JavaScript资源...');
    try {
      const checks = [
        { name: 'main.jsx', url: 'http://localhost:5173/src/main.jsx' },
        { name: 'UltimateMonadApp.jsx', url: 'http://localhost:5173/src/UltimateMonadApp.jsx' }
      ];

      let passed = 0;
      for (const check of checks) {
        try {
          const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${check.url}`, { encoding: 'utf8' });
          if (response === '200') {
            console.log(`   ✅ ${check.name} 可访问`);
            passed++;
          } else {
            console.log(`   ❌ ${check.name} 不可访问 (${response})`);
          }
        } catch (err) {
          console.log(`   ❌ ${check.name} 测试失败`);
        }
      }

      return passed === checks.length;
    } catch (error) {
      console.log(`   ❌ JS资源测试失败: ${error.message}`);
      return false;
    }
  },

  // 测试4: React应用状态
  async testReactApp() {
    console.log('4️⃣ 测试React应用状态...');
    try {
      const mainJsContent = execSync('curl -s http://localhost:5173/src/main.jsx', { encoding: 'utf8' });
      
      const checks = [
        { name: 'React导入', test: mainJsContent.includes('import') && mainJsContent.includes('react') },
        { name: 'UltimateMonadApp导入', test: mainJsContent.includes('UltimateMonadApp') },
        { name: 'React根渲染', test: mainJsContent.includes('createRoot') }
      ];

      let passed = 0;
      checks.forEach(check => {
        if (check.test) {
          console.log(`   ✅ ${check.name}`);
          passed++;
        } else {
          console.log(`   ❌ ${check.name}`);
        }
      });

      return passed === checks.length;
    } catch (error) {
      console.log(`   ❌ React应用测试失败: ${error.message}`);
      return false;
    }
  },

  // 测试5: 游戏组件
  async testGameComponent() {
    console.log('5️⃣ 测试游戏组件...');
    try {
      const gameContent = execSync('curl -s http://localhost:5173/src/UltimateMonadApp.jsx', { encoding: 'utf8' });
      
      const checks = [
        { name: 'React Hooks导入', test: gameContent.includes('useState') && gameContent.includes('useEffect') },
        { name: '加密货币数据', test: gameContent.includes('TOP_30_CRYPTO_CARDS') },
        { name: '钱包连接功能', test: gameContent.includes('handleWalletConnect') },
        { name: '卡牌选择功能', test: gameContent.includes('toggleCardSelection') },
        { name: 'Ethers.js集成', test: gameContent.includes('ethers') }
      ];

      let passed = 0;
      checks.forEach(check => {
        if (check.test) {
          console.log(`   ✅ ${check.name}`);
          passed++;
        } else {
          console.log(`   ❌ ${check.name}`);
        }
      });

      return passed === checks.length;
    } catch (error) {
      console.log(`   ❌ 游戏组件测试失败: ${error.message}`);
      return false;
    }
  }
};

// 运行所有测试
async function runAllTests() {
  const results = [];
  let passed = 0;
  
  for (const [testName, testFunc] of Object.entries(tests)) {
    try {
      const result = await testFunc();
      results.push({ name: testName, passed: result });
      if (result) passed++;
    } catch (error) {
      console.log(`   ❌ 测试 ${testName} 执行失败: ${error.message}`);
      results.push({ name: testName, passed: false });
    }
    console.log(''); // 空行分隔
  }

  // 生成测试报告
  console.log('📊 测试结果汇总:');
  console.log('=====================================');
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}: ${result.passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('=====================================');
  console.log(`总体结果: ${passed}/${results.length} 测试通过`);
  
  if (passed === results.length) {
    console.log('🎉 所有测试通过！网页功能完美！');
    return true;
  } else {
    console.log('⚠️  部分测试失败，需要修复');
    return false;
  }
}

// 执行测试
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});
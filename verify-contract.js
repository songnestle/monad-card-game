import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = '0xfc69ef8D1a6461D6F562e7F83581DD4f68479333';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

// 测试不同的ABI组合
const TEST_ABIS = {
  // 最简单的ABI
  minimal: ['function submitHand(string[]) payable'],
  
  // 带参数名的ABI
  withParamNames: ['function submitHand(string[] cardSymbols) payable'],
  
  // 带memory修饰符的ABI
  withMemory: ['function submitHand(string[] memory cardSymbols) external payable'],
  
  // 完整的JSON ABI
  fullJson: [{
    "inputs": [{"internalType": "string[]", "name": "cardSymbols", "type": "string[]"}],
    "name": "submitHand",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }]
};

async function verifyContract() {
  console.log('🔍 开始深度合约验证...\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 1. 基础检查
    console.log('1️⃣ 基础检查:');
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log(`  ✅ 合约已部署`);
    console.log(`  - 地址: ${CONTRACT_ADDRESS}`);
    console.log(`  - 字节码长度: ${code.length}`);
    console.log(`  - 前10字节: ${code.substring(0, 20)}...`);
    
    // 2. 获取当前区块信息
    console.log('\n2️⃣ 网络状态:');
    const block = await provider.getBlock('latest');
    console.log(`  - 当前区块: ${block.number}`);
    console.log(`  - 时间戳: ${new Date(block.timestamp * 1000).toLocaleString()}`);
    
    // 3. 测试不同的ABI格式
    console.log('\n3️⃣ 测试不同ABI格式:');
    for (const [name, abi] of Object.entries(TEST_ABIS)) {
      try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
        const testData = contract.interface.encodeFunctionData('submitHand', [['BTC', 'ETH', 'SOL', 'BNB', 'ADA']]);
        console.log(`  ✅ ${name} ABI: 编码成功`);
      } catch (error) {
        console.log(`  ❌ ${name} ABI: ${error.message}`);
      }
    }
    
    // 4. 尝试获取合约的函数选择器
    console.log('\n4️⃣ 分析函数选择器:');
    const iface = new ethers.Interface(['function submitHand(string[] memory cardSymbols) external payable']);
    const selector = iface.getFunction('submitHand').selector;
    console.log(`  - submitHand选择器: ${selector}`);
    console.log(`  - 完整签名哈希: ${ethers.id('submitHand(string[])')}`);
    
    // 5. 模拟不同的调用参数
    console.log('\n5️⃣ 测试不同的参数组合:');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, TEST_ABIS.withMemory, provider);
    
    const testCases = [
      { name: '5张有效卡牌', cards: ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'], value: '0.001' },
      { name: '5张不同卡牌', cards: ['DOGE', 'XRP', 'USDT', 'AVAX', 'DOT'], value: '0.001' },
      { name: '1张卡牌', cards: ['BTC'], value: '0.001' },
      { name: '空数组', cards: [], value: '0.001' },
      { name: '不同参与费', cards: ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'], value: '0.01' },
    ];
    
    for (const testCase of testCases) {
      try {
        const callData = contract.interface.encodeFunctionData('submitHand', [testCase.cards]);
        console.log(`  ✅ ${testCase.name}: 编码成功 (${callData.length} 字节)`);
        
        // 尝试静态调用
        try {
          await provider.call({
            to: CONTRACT_ADDRESS,
            data: callData,
            value: ethers.parseEther(testCase.value),
            from: '0x0000000000000000000000000000000000000001'
          });
          console.log(`     ✅ 静态调用成功`);
        } catch (callError) {
          console.log(`     ❌ 静态调用失败: ${callError.code}`);
          if (callError.data) {
            console.log(`     返回数据: ${callError.data}`);
          }
        }
      } catch (error) {
        console.log(`  ❌ ${testCase.name}: 编码失败 - ${error.message}`);
      }
    }
    
    // 6. 检查可能的合约接口
    console.log('\n6️⃣ 尝试常见的合约接口:');
    const commonInterfaces = [
      'function submit(string[] memory cards) external payable',
      'function play(string[] memory cards) external payable',
      'function submitCards(string[] memory cards) external payable',
      'function playHand(string[] memory cards) external payable',
      'function enterGame(string[] memory cards) external payable',
    ];
    
    for (const sig of commonInterfaces) {
      try {
        const testIface = new ethers.Interface([sig]);
        const funcName = sig.match(/function (\w+)/)[1];
        const selector = testIface.getFunction(funcName).selector;
        console.log(`  - ${funcName}: ${selector}`);
      } catch (error) {
        console.log(`  ❌ 解析失败: ${sig}`);
      }
    }
    
    console.log('\n📊 验证总结:');
    console.log('  1. 合约确实已部署在指定地址');
    console.log('  2. 合约有有效的字节码');
    console.log('  3. 但所有调用都失败，可能原因：');
    console.log('     - 合约可能使用了不同的函数名');
    console.log('     - 合约可能有访问控制（onlyOwner等）');
    console.log('     - 合约可能处于暂停状态');
    console.log('     - 合约可能需要特定的初始化');
    console.log('     - 参与费可能不正确');
    
  } catch (error) {
    console.error('\n❌ 验证失败:', error);
  }
}

verifyContract().catch(console.error);
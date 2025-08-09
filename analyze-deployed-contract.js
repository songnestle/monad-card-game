import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

async function analyzeContract() {
  console.log('🔍 分析部署的合约...\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 获取字节码
    const bytecode = await provider.getCode(CONTRACT_ADDRESS);
    console.log('📦 合约字节码分析:');
    console.log('  - 长度:', bytecode.length);
    console.log('  - 前100字符:', bytecode.substring(0, 100));
    
    // 检查是否包含预期的函数选择器
    const selectors = {
      'submitHand': '94b0050d',
      'ENTRY_FEE': 'c59b6c18',
      'getPlayerHand': 'd3121b8f',
      'owner': '8da5cb5b',
      'totalSupply': '18160ddd',
      'balances': '27e235e3'
    };
    
    console.log('\n🔎 函数选择器检查:');
    for (const [name, selector] of Object.entries(selectors)) {
      const found = bytecode.includes(selector);
      console.log(`  - ${name} (0x${selector}): ${found ? '✅ 找到' : '❌ 未找到'}`);
    }
    
    // 尝试直接调用
    console.log('\n📞 尝试低级调用:');
    
    // 1. 调用ENTRY_FEE (0xc59b6c18)
    try {
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        data: '0xc59b6c18'
      });
      console.log('✅ ENTRY_FEE调用成功:', result);
      if (result !== '0x') {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], result);
        console.log('   解码值:', ethers.formatEther(decoded[0]), 'ETH');
      }
    } catch (error) {
      console.log('❌ ENTRY_FEE调用失败:', error.message);
    }
    
    // 2. 调用owner (0x8da5cb5b)
    try {
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        data: '0x8da5cb5b'
      });
      console.log('✅ owner调用成功:', result);
      if (result !== '0x') {
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['address'], result);
        console.log('   解码值:', decoded[0]);
      }
    } catch (error) {
      console.log('❌ owner调用失败:', error.message);
    }
    
    // 3. 测试getPlayerHand
    console.log('\n📞 测试getPlayerHand编码:');
    const testAddress = '0x0000000000000000000000000000000000000001';
    const getPlayerHandData = '0xd3121b8f' + ethers.AbiCoder.defaultAbiCoder().encode(['address'], [testAddress]).slice(2);
    console.log('  - 编码数据:', getPlayerHandData);
    
    try {
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        data: getPlayerHandData
      });
      console.log('✅ getPlayerHand调用成功:', result);
    } catch (error) {
      console.log('❌ getPlayerHand调用失败:', error.message);
    }
    
    // 比较预期的字节码开头
    console.log('\n📊 字节码比较:');
    const expectedStart = '0x608060405234801561000f575f80fd5b50662386f26fc10000';
    const actualStart = bytecode.substring(0, expectedStart.length);
    console.log('  - 预期开头:', expectedStart);
    console.log('  - 实际开头:', actualStart);
    console.log('  - 匹配:', expectedStart === actualStart ? '✅' : '❌');
    
  } catch (error) {
    console.error('❌ 分析失败:', error.message);
  }
}

analyzeContract();
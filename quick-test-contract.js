import { ethers } from 'ethers';

// 更新这里为你的新合约地址
const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS || '0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

async function quickTest() {
  console.log('🧪 快速测试合约状态...\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 1. 基本检查
    console.log('📍 合约地址:', CONTRACT_ADDRESS);
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log('📦 字节码长度:', code.length);
    console.log('📦 字节码开头:', code.substring(0, 20));
    
    if (code === '0x' || code === '0x0') {
      console.log('❌ 合约不存在！');
      return;
    }
    
    // 2. 尝试直接调用
    console.log('\n🔍 尝试直接调用ENTRY_FEE (0xc59b6c18)...');
    try {
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        data: '0xc59b6c18'
      });
      console.log('结果:', result);
    } catch (error) {
      console.log('❌ 调用失败:', error.reason || error.message);
    }
    
    // 3. 分析问题
    console.log('\n📊 问题分析:');
    if (code.startsWith('0xf3fe')) {
      console.log('⚠️  这是一个非标准部署（可能是代理合约或部署错误）');
      console.log('💡 建议：需要重新部署一个标准的合约');
    }
    
    // 4. 提供解决方案
    console.log('\n✅ 解决方案:');
    console.log('1. 使用 Remix 部署新合约');
    console.log('2. 或者查找之前成功部署的合约地址');
    console.log('3. 确保合约代码正确编译和部署');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

quickTest();
import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0xfc69ef8D1a6461D6F562e7F83581DD4f68479333';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

async function checkContract() {
  console.log('🔍 检查合约字节码...\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // 获取字节码
  const bytecode = await provider.getCode(CONTRACT_ADDRESS);
  console.log('📦 合约字节码:');
  console.log('  - 长度:', bytecode.length);
  console.log('  - 前100字节:', bytecode.substring(0, 100));
  console.log('  - 后100字节:', bytecode.substring(bytecode.length - 100));
  
  // 检查是否是自毁合约
  if (bytecode === '0x' || bytecode === '0x0') {
    console.log('❌ 合约不存在或已自毁！');
    return;
  }
  
  // 检查函数选择器
  console.log('\n🔍 搜索函数选择器...');
  
  // submitHand(string[]) 的选择器是 0x94b0050d
  const submitHandSelector = '94b0050d';
  if (bytecode.includes(submitHandSelector)) {
    console.log('✅ 找到 submitHand 选择器');
  } else {
    console.log('❌ 未找到 submitHand 选择器');
  }
  
  // 简单的合约调用测试
  console.log('\n🧪 测试简单调用...');
  try {
    // 尝试调用一个不存在的函数
    const result = await provider.call({
      to: CONTRACT_ADDRESS,
      data: '0x00000000' // 不存在的函数选择器
    });
    console.log('调用结果:', result);
  } catch (error) {
    console.log('调用错误:', error.message);
  }
  
  // 获取最新区块
  const block = await provider.getBlock('latest');
  console.log('\n⛓️ 当前区块:', block.number);
  console.log('⏰ 区块时间:', new Date(block.timestamp * 1000).toLocaleString());
}

checkContract().catch(console.error);
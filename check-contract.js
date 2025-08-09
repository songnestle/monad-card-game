import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// 合约配置
const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS || '0xfc69ef8D1a6461D6F562e7F83581DD4f68479333';
const RPC_URL = process.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz';

// 合约ABI
const CONTRACT_ABI = [
  "function submitHand(string[] memory cardSymbols) external payable",
  "function getPlayerHand(address player) external view returns (string[] memory, uint256, bool)",
  "function canReselect(address player) external view returns (bool)",
  "function getUnlockTime(address player) external view returns (uint256)",
  "function getPlayerScore(address player) external view returns (uint256)",
  "event HandSubmitted(address indexed player, string[] cardSymbols, uint256 timestamp)",
  "event ScoreUpdated(address indexed player, uint256 newScore)"
];

async function checkContract() {
  console.log('🔍 开始合约诊断...\n');
  
  console.log('📋 配置信息:');
  console.log(`  - RPC URL: ${RPC_URL}`);
  console.log(`  - 合约地址: ${CONTRACT_ADDRESS}`);
  console.log('');

  try {
    // 1. 连接到RPC
    console.log('1️⃣ 连接到Monad测试网RPC...');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 2. 检查网络连接
    console.log('2️⃣ 检查网络连接...');
    const network = await provider.getNetwork();
    console.log(`  ✅ 网络连接成功`);
    console.log(`  - Chain ID: ${network.chainId}`);
    console.log(`  - 网络名称: ${network.name || 'Monad Testnet'}`);
    console.log('');
    
    // 3. 检查合约是否部署
    console.log('3️⃣ 检查合约部署状态...');
    const code = await provider.getCode(CONTRACT_ADDRESS);
    
    if (code === '0x') {
      console.log(`  ❌ 合约未部署在地址: ${CONTRACT_ADDRESS}`);
      console.log('  ⚠️  这个地址上没有智能合约代码');
      return;
    }
    
    console.log(`  ✅ 合约已部署`);
    console.log(`  - 字节码长度: ${code.length} 字符`);
    console.log('');
    
    // 4. 尝试创建合约实例
    console.log('4️⃣ 创建合约实例...');
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    console.log('  ✅ 合约实例创建成功');
    console.log('');
    
    // 5. 测试合约方法（只读方法）
    console.log('5️⃣ 测试合约方法...');
    const testAddress = '0x0000000000000000000000000000000000000001';
    
    try {
      // 测试 canReselect 方法
      console.log('  - 测试 canReselect() 方法...');
      const canReselect = await contract.canReselect(testAddress);
      console.log(`    ✅ canReselect 返回: ${canReselect}`);
    } catch (error) {
      console.log(`    ❌ canReselect 调用失败: ${error.message}`);
    }
    
    try {
      // 测试 getPlayerScore 方法
      console.log('  - 测试 getPlayerScore() 方法...');
      const score = await contract.getPlayerScore(testAddress);
      console.log(`    ✅ getPlayerScore 返回: ${score}`);
    } catch (error) {
      console.log(`    ❌ getPlayerScore 调用失败: ${error.message}`);
    }
    
    try {
      // 测试 getUnlockTime 方法
      console.log('  - 测试 getUnlockTime() 方法...');
      const unlockTime = await contract.getUnlockTime(testAddress);
      console.log(`    ✅ getUnlockTime 返回: ${unlockTime}`);
    } catch (error) {
      console.log(`    ❌ getUnlockTime 调用失败: ${error.message}`);
    }
    
    console.log('\n📊 诊断总结:');
    console.log('  ✅ RPC连接正常');
    console.log('  ✅ 合约地址有效');
    console.log('  ⚠️  部分合约方法可能需要特定参数或状态');
    
  } catch (error) {
    console.error('\n❌ 诊断过程中出错:', error.message);
    
    if (error.message.includes('could not detect network')) {
      console.error('  💡 建议: RPC连接失败，请检查网络连接或RPC URL');
    } else if (error.message.includes('invalid address')) {
      console.error('  💡 建议: 合约地址格式无效');
    } else if (error.message.includes('execution reverted')) {
      console.error('  💡 建议: 合约方法执行失败，可能是参数错误或合约逻辑限制');
    }
  }
}

// 运行诊断
checkContract().catch(console.error);
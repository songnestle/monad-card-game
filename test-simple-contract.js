import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030';
const RPC_URL = 'https://testnet-rpc.monad.xyz';
const PRIVATE_KEY = '26a1996f7a34602aa1f487dacb7c32205afc429558931156245a785fdc55dd24';

// 简单的合约字节码 - 只有一个返回42的函数
const SIMPLE_BYTECODE = '0x6080604052348015600f57600080fd5b50609c8061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063a0490e7e14602d575b600080fd5b60336047565b604051603e91906058565b60405180910390f35b6000602a905090565b605281605c565b82525050565b6000602082019050606b60008301846049565b9291505056fea2646970667358221220';

// 测试ABI
const TEST_ABI = [
  "function test() external view returns (uint256)"
];

async function testSimpleContract() {
  console.log('🧪 测试简单合约部署...\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('👛 钱包地址:', wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 余额:', ethers.formatEther(balance), 'MONAD\n');
    
    // 部署简单合约
    console.log('📝 部署测试合约...');
    const factory = new ethers.ContractFactory([], SIMPLE_BYTECODE, wallet);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    
    const testAddress = await contract.getAddress();
    console.log('✅ 测试合约部署成功:', testAddress);
    
    // 验证合约
    const code = await provider.getCode(testAddress);
    console.log('📦 合约字节码长度:', code.length);
    
    // 测试调用
    const testContract = new ethers.Contract(testAddress, TEST_ABI, provider);
    try {
      const result = await testContract.test();
      console.log('✅ 测试调用成功，返回值:', result.toString());
    } catch (error) {
      console.log('❌ 测试调用失败:', error.message);
    }
    
    // 现在测试主合约
    console.log('\n🔍 检查主合约状态...');
    const mainCode = await provider.getCode(CONTRACT_ADDRESS);
    console.log('📦 主合约字节码:');
    console.log('  - 长度:', mainCode.length);
    console.log('  - 开头:', mainCode.substring(0, 20));
    
    // 检查是否是CREATE2代理
    if (mainCode.startsWith('0xf3fe')) {
      console.log('⚠️  检测到CREATE2代理模式');
      console.log('   这可能是一个代理合约，实际逻辑在其他地址');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 清理私钥
const cleanupAndRun = async () => {
  await testSimpleContract();
  // 立即清除私钥变量
  const PRIVATE_KEY = null;
};

cleanupAndRun();
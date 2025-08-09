import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = '0xfc69ef8D1a6461D6F562e7F83581DD4f68479333';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

// 合约ABI
const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "string[]",
        "name": "cardSymbols",
        "type": "string[]"
      }
    ],
    "name": "submitHand",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

async function testContractWithSigner() {
  console.log('🧪 测试Ethers v6合约调用...\n');
  
  try {
    // 1. 创建provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log('✅ Provider已连接');
    
    // 2. 检查合约部署
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x' || code === '0x0') {
      throw new Error('合约未部署在指定地址');
    }
    console.log('✅ 合约已部署，字节码长度:', code.length);
    
    // 3. 创建测试钱包
    const privateKey = process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey;
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('✅ 钱包地址:', wallet.address);
    
    // 4. 检查余额
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 钱包余额:', ethers.formatEther(balance), 'MONAD');
    
    if (balance < ethers.parseEther('0.02')) {
      console.log('⚠️  余额不足，需要至少0.02 MONAD (0.01参与费 + gas)');
    }
    
    // 5. 创建合约实例（使用signer）
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    console.log('✅ 合约实例已创建（带signer）');
    
    // 6. 测试静态调用
    console.log('\n📝 测试静态调用...');
    const testCards = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'];
    
    try {
      await contract.submitHand.staticCall(testCards, {
        value: ethers.parseEther('0.01')
      });
      console.log('✅ 静态调用成功！');
    } catch (error) {
      console.log('❌ 静态调用失败:', error.code, error.message);
      
      // 分析错误
      if (error.code === 'UNSUPPORTED_OPERATION') {
        console.log('💡 提示: 这通常意味着合约方法不存在或signer配置有问题');
      } else if (error.code === 'CALL_EXCEPTION') {
        console.log('💡 提示: 合约拒绝了调用，可能是业务逻辑限制');
        if (error.data) {
          console.log('   返回数据:', error.data);
        }
      }
    }
    
    // 7. 测试gas估算
    console.log('\n⛽ 测试gas估算...');
    try {
      const gasEstimate = await contract.submitHand.estimateGas(testCards, {
        value: ethers.parseEther('0.01')
      });
      console.log('✅ 预估gas:', gasEstimate.toString());
    } catch (error) {
      console.log('❌ Gas估算失败:', error.code, error.message);
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

testContractWithSigner().catch(console.error);
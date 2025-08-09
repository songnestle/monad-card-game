import { ethers } from 'ethers';

const OLD_CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

// MonadCardGame ABI
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
  },
  {
    "inputs": [],
    "name": "ENTRY_FEE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function verifyOldContract() {
  console.log('🔍 验证旧合约地址:', OLD_CONTRACT_ADDRESS, '\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 1. 检查合约字节码
    const bytecode = await provider.getCode(OLD_CONTRACT_ADDRESS);
    console.log('📦 合约字节码:');
    console.log('  - 长度:', bytecode.length);
    
    if (bytecode === '0x' || bytecode === '0x0') {
      console.log('❌ 该地址没有部署合约！');
      return;
    }
    
    console.log('✅ 该地址有合约');
    
    // 2. 检查submitHand选择器
    const submitHandSelector = '94b0050d';
    if (bytecode.includes(submitHandSelector)) {
      console.log('✅ 找到 submitHand 函数选择器！');
    } else {
      console.log('❌ 未找到 submitHand 函数选择器');
      return;
    }
    
    // 3. 尝试读取合约常量
    const contract = new ethers.Contract(OLD_CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    console.log('\n📋 尝试读取合约信息:');
    try {
      const entryFee = await contract.ENTRY_FEE();
      console.log('✅ ENTRY_FEE:', ethers.formatEther(entryFee), 'ETH');
      
      // 测试静态调用
      console.log('\n🧪 测试submitHand静态调用:');
      const testWallet = ethers.Wallet.createRandom();
      const testContract = contract.connect(testWallet.connect(provider));
      
      try {
        await testContract.submitHand.staticCall(['BTC', 'ETH', 'SOL', 'BNB', 'ADA'], {
          value: ethers.parseEther('0.01')
        });
        console.log('✅ 静态调用成功（但可能因为余额不足等原因失败）');
      } catch (error) {
        if (error.reason) {
          console.log('⚠️  静态调用失败，原因:', error.reason);
        } else {
          console.log('⚠️  静态调用失败:', error.message);
        }
      }
      
      console.log('\n🎉 这可能是正确的MonadCardGame合约！');
      console.log('📍 合约地址:', OLD_CONTRACT_ADDRESS);
      
    } catch (error) {
      console.log('❌ 无法读取合约信息:', error.message);
      console.log('   这可能不是MonadCardGame合约');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

verifyOldContract();
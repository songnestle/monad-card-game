import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = '0xfc69ef8D1a6461D6F562e7F83581DD4f68479333';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

// 完整的合约ABI
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
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "canReselect",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "hasSubmittedHand",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
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
  },
  {
    "inputs": [],
    "name": "LOCK_DURATION",
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

async function debugContractRevert() {
  console.log('🔍 调试合约revert问题...\n');
  
  try {
    // 1. 创建provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log('✅ Provider已连接');
    
    // 2. 创建测试钱包
    const privateKey = process.env.PRIVATE_KEY || ethers.Wallet.createRandom().privateKey;
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('📍 测试钱包地址:', wallet.address);
    
    // 3. 创建合约实例
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
    
    // 4. 检查合约常量
    console.log('\n📋 检查合约常量:');
    try {
      const entryFee = await contract.ENTRY_FEE();
      console.log('  - ENTRY_FEE:', ethers.formatEther(entryFee), 'ETH');
      
      const lockDuration = await contract.LOCK_DURATION();
      console.log('  - LOCK_DURATION:', lockDuration.toString(), '秒 (', Number(lockDuration) / 3600, '小时)');
    } catch (error) {
      console.log('  ❌ 无法读取合约常量:', error.message);
    }
    
    // 5. 检查钱包状态
    console.log('\n👤 检查钱包状态:');
    const balance = await provider.getBalance(wallet.address);
    console.log('  - 余额:', ethers.formatEther(balance), 'MONAD');
    
    try {
      const hasSubmitted = await contract.hasSubmittedHand(wallet.address);
      console.log('  - 是否已提交过手牌:', hasSubmitted);
      
      const canReselect = await contract.canReselect(wallet.address);
      console.log('  - 是否可以重新选择:', canReselect);
    } catch (error) {
      console.log('  ❌ 无法读取玩家状态:', error.message);
    }
    
    // 6. 测试不同的调用方式
    console.log('\n🧪 测试不同的调用方式:');
    
    // 测试1: 空数组
    console.log('\n1️⃣ 测试空数组:');
    try {
      await contract.submitHand.staticCall([], {
        value: ethers.parseEther('0.01')
      });
      console.log('  ✅ 空数组调用成功');
    } catch (error) {
      console.log('  ❌ 空数组调用失败:', error.reason || error.message);
    }
    
    // 测试2: 1张卡
    console.log('\n2️⃣ 测试1张卡:');
    try {
      await contract.submitHand.staticCall(['BTC'], {
        value: ethers.parseEther('0.01')
      });
      console.log('  ✅ 1张卡调用成功');
    } catch (error) {
      console.log('  ❌ 1张卡调用失败:', error.reason || error.message);
    }
    
    // 测试3: 5张卡（正确的）
    console.log('\n3️⃣ 测试5张卡:');
    try {
      await contract.submitHand.staticCall(['BTC', 'ETH', 'SOL', 'BNB', 'ADA'], {
        value: ethers.parseEther('0.01')
      });
      console.log('  ✅ 5张卡调用成功');
    } catch (error) {
      console.log('  ❌ 5张卡调用失败:', error.reason || error.message);
    }
    
    // 测试4: 错误的参与费
    console.log('\n4️⃣ 测试错误的参与费:');
    try {
      await contract.submitHand.staticCall(['BTC', 'ETH', 'SOL', 'BNB', 'ADA'], {
        value: ethers.parseEther('0.001')
      });
      console.log('  ✅ 0.001 ETH调用成功');
    } catch (error) {
      console.log('  ❌ 0.001 ETH调用失败:', error.reason || error.message);
    }
    
    // 测试5: 不同的数据类型
    console.log('\n5️⃣ 测试不同的数据编码:');
    
    // 手动编码calldata
    const iface = new ethers.Interface(CONTRACT_ABI);
    const calldata = iface.encodeFunctionData('submitHand', [['BTC', 'ETH', 'SOL', 'BNB', 'ADA']]);
    console.log('  - Calldata:', calldata);
    console.log('  - Calldata长度:', calldata.length);
    
    // 直接调用
    try {
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        from: wallet.address,
        data: calldata,
        value: ethers.parseEther('0.01')
      });
      console.log('  ✅ 直接call成功，返回:', result);
    } catch (error) {
      console.log('  ❌ 直接call失败:', error.reason || error.message);
      if (error.data) {
        console.log('  - 错误数据:', error.data);
      }
    }
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
  }
}

debugContractRevert().catch(console.error);
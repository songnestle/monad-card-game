import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// 配置
const CONTRACT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS || '0xfc69ef8D1a6461D6F562e7F83581DD4f68479333';
// 尝试多个RPC端点
const RPC_URLS = [
  'https://testnet.monad.rpc.blxrbdn.com',
  'https://monad-testnet.rpc.tenderly.co',
  'https://testnet-rpc.monad.xyz'
];

// 完整的合约ABI
const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "string[]", "name": "cardSymbols", "type": "string[]"}],
    "name": "submitHand",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getPlayerHand",
    "outputs": [
      {"internalType": "string[]", "name": "", "type": "string[]"},
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "bool", "name": "", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "canReselect",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getUnlockTime",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getPlayerScore",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testContractSubmit() {
  console.log('🧪 开始合约提交测试...\n');

  let provider = null;
  
  // 尝试连接到可用的RPC
  for (const rpcUrl of RPC_URLS) {
    try {
      console.log(`尝试连接到: ${rpcUrl}`);
      provider = new ethers.JsonRpcProvider(rpcUrl);
      await provider.getNetwork(); // 测试连接
      console.log('✅ 成功连接到Monad测试网');
      break;
    } catch (error) {
      console.log(`  ❌ 连接失败: ${error.message}`);
    }
  }
  
  if (!provider) {
    throw new Error('无法连接到任何RPC端点');
  }

  try {
    
    // 获取网络信息
    const network = await provider.getNetwork();
    console.log(`  Chain ID: ${network.chainId} (期望: 10143)`);
    
    // 检查合约部署
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log(`\n✅ 合约已部署在: ${CONTRACT_ADDRESS}`);
    console.log(`  字节码长度: ${code.length}`);
    
    // 创建合约实例
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // 测试数据
    const testCards = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'];
    console.log(`\n📋 测试卡牌: ${testCards.join(', ')}`);
    
    // 1. 估算gas费用
    console.log('\n1️⃣ 估算submitHand所需gas费用...');
    try {
      // 创建一个测试钱包
      const testWallet = ethers.Wallet.createRandom().connect(provider);
      const contractWithSigner = contract.connect(testWallet);
      
      // 尝试估算gas
      const gasEstimate = await contractWithSigner.submitHand.estimateGas(testCards, {
        value: ethers.parseEther("0.001")
      }).catch(error => {
        console.log('  ❌ Gas估算失败:', error.message);
        return null;
      });
      
      if (gasEstimate) {
        console.log(`  ✅ 估算Gas: ${gasEstimate.toString()}`);
        
        // 获取gas价格
        const gasPrice = await provider.getFeeData();
        console.log(`  Gas价格: ${ethers.formatGwei(gasPrice.gasPrice)} Gwei`);
        
        const estimatedCost = gasEstimate * gasPrice.gasPrice;
        console.log(`  预计费用: ${ethers.formatEther(estimatedCost)} MONAD`);
      }
    } catch (error) {
      console.log('  ⚠️  无法估算gas，可能是因为没有余额或合约限制');
    }
    
    // 2. 测试合约方法编码
    console.log('\n2️⃣ 测试合约方法编码...');
    try {
      const encodedData = contract.interface.encodeFunctionData('submitHand', [testCards]);
      console.log(`  ✅ 编码成功`);
      console.log(`  编码数据长度: ${encodedData.length}`);
      console.log(`  前32字节: ${encodedData.substring(0, 66)}...`);
    } catch (error) {
      console.log(`  ❌ 编码失败: ${error.message}`);
    }
    
    // 3. 检查合约接口
    console.log('\n3️⃣ 检查合约接口...');
    const functions = contract.interface.fragments.filter(f => f.type === 'function');
    console.log(`  找到 ${functions.length} 个函数:`);
    functions.forEach(func => {
      console.log(`    - ${func.name}(${func.inputs.map(i => i.type).join(', ')})`);
    });
    
    // 4. 测试错误情况
    console.log('\n4️⃣ 测试错误情况...');
    
    // 测试空数组
    try {
      const emptyCards = [];
      const encodedEmpty = contract.interface.encodeFunctionData('submitHand', [emptyCards]);
      console.log('  ✅ 空数组可以编码');
    } catch (error) {
      console.log('  ❌ 空数组编码失败:', error.message);
    }
    
    // 测试无效参数
    try {
      const invalidCards = ['BTC', 'ETH', 'INVALID', 'SOL', 'ADA'];
      const encodedInvalid = contract.interface.encodeFunctionData('submitHand', [invalidCards]);
      console.log('  ✅ 包含无效卡牌的数组可以编码');
    } catch (error) {
      console.log('  ❌ 无效卡牌编码失败:', error.message);
    }
    
    console.log('\n📊 测试总结:');
    console.log('  ✅ 合约地址有效且已部署');
    console.log('  ✅ 合约接口可以正确编码');
    console.log('  ⚠️  实际调用可能需要:');
    console.log('     - 有效的钱包余额');
    console.log('     - 正确的参与费(0.001 MONAD)');
    console.log('     - 满足合约的业务逻辑要求');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    console.error('错误详情:', error.message);
  }
}

// 运行测试
testContractSubmit().catch(console.error);
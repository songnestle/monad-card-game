import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

// 更正确的ABI
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
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerHand",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
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

async function testContract() {
  console.log('🧪 测试新部署的合约...\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // 1. 测试ENTRY_FEE
    console.log('📋 测试常量读取:');
    try {
      const entryFee = await contract.ENTRY_FEE();
      console.log('✅ ENTRY_FEE:', ethers.formatEther(entryFee), 'ETH');
    } catch (error) {
      console.log('❌ ENTRY_FEE读取失败:', error.reason || error.message);
    }
    
    // 2. 测试getPlayerHand
    console.log('\n📋 测试getPlayerHand:');
    const testAddress = '0x0000000000000000000000000000000000000001';
    try {
      const playerHand = await contract.getPlayerHand(testAddress);
      console.log('✅ getPlayerHand成功:', playerHand);
    } catch (error) {
      console.log('❌ getPlayerHand失败:', error.reason || error.message);
    }
    
    // 3. 测试submitHand的calldata
    console.log('\n📋 测试submitHand编码:');
    try {
      const cards = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'];
      const calldata = contract.interface.encodeFunctionData('submitHand', [cards]);
      console.log('✅ 编码成功:');
      console.log('  - Calldata:', calldata);
      console.log('  - 函数选择器:', calldata.slice(0, 10));
      
      // 尝试静态调用
      console.log('\n📋 静态调用测试:');
      const testWallet = ethers.Wallet.createRandom().connect(provider);
      const testContract = contract.connect(testWallet);
      
      try {
        await testContract.submitHand.staticCall(cards, {
          value: ethers.parseEther('0.01')
        });
        console.log('✅ 静态调用成功（但会因余额不足失败）');
      } catch (error) {
        console.log('⚠️  静态调用失败:', error.reason || error.message);
        if (error.data) {
          console.log('  - Error data:', error.data);
        }
      }
      
    } catch (error) {
      console.log('❌ 编码失败:', error.message);
    }
    
    // 4. 检查合约代码
    console.log('\n📋 合约部署验证:');
    const code = await provider.getCode(CONTRACT_ADDRESS);
    console.log('✅ 合约已部署，字节码长度:', code.length);
    
    // 5. 测试不同的ABI格式
    console.log('\n📋 测试简化ABI:');
    const simpleABI = [
      "function submitHand(string[] memory cardSymbols) external payable",
      "function ENTRY_FEE() external view returns (uint256)",
      "function getPlayerHand(address player) external view returns (string, uint256, bool, uint256, uint256, uint256)"
    ];
    
    const simpleContract = new ethers.Contract(CONTRACT_ADDRESS, simpleABI, provider);
    try {
      const fee = await simpleContract.ENTRY_FEE();
      console.log('✅ 简化ABI也能工作:', ethers.formatEther(fee), 'ETH');
    } catch (error) {
      console.log('❌ 简化ABI失败:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testContract();
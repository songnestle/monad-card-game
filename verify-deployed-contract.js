import { ethers } from 'ethers';

const CONTRACT_ADDRESS = '0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030';
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
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
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

async function verifyContract() {
  console.log('🔍 验证部署的合约:', CONTRACT_ADDRESS, '\n');
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    // 1. 检查合约字节码
    const bytecode = await provider.getCode(CONTRACT_ADDRESS);
    console.log('📦 合约字节码:');
    console.log('  - 长度:', bytecode.length);
    console.log('  - 已部署:', bytecode !== '0x' && bytecode !== '0x0' ? '✅ 是' : '❌ 否');
    
    if (bytecode === '0x' || bytecode === '0x0') {
      console.log('❌ 该地址没有部署合约！');
      return;
    }
    
    // 2. 创建合约实例
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    console.log('\n📋 合约信息:');
    
    // 3. 读取ENTRY_FEE
    try {
      const entryFee = await contract.ENTRY_FEE();
      console.log('  - ENTRY_FEE:', ethers.formatEther(entryFee), 'ETH');
    } catch (error) {
      console.log('  - ENTRY_FEE: 读取失败');
    }
    
    // 4. 读取owner
    try {
      const owner = await contract.owner();
      console.log('  - Owner:', owner);
    } catch (error) {
      console.log('  - Owner: 读取失败');
    }
    
    // 5. 检查submitHand函数
    const submitHandSelector = '94b0050d';
    if (bytecode.includes(submitHandSelector)) {
      console.log('  - submitHand函数: ✅ 存在');
    } else {
      console.log('  - submitHand函数: ❌ 不存在');
    }
    
    console.log('\n🎉 合约验证完成！');
    console.log('📍 合约地址:', CONTRACT_ADDRESS);
    console.log('\n请更新前端配置中的合约地址。');
    
  } catch (error) {
    console.error('❌ 验证失败:', error.message);
  }
}

verifyContract();
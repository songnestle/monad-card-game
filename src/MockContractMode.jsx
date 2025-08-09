// 模拟合约模式 - 当真实合约不可用时使用
export const MockContractMode = {
  // 模拟合约地址
  address: '0x0000000000000000000000000000000000000000',
  
  // 模拟的参与费
  ENTRY_FEE: '0.01',
  
  // 模拟提交手牌
  async submitHand(cards, options) {
    console.log('🎮 [MOCK] 模拟提交手牌:', cards);
    console.log('💰 [MOCK] 模拟支付:', options.value);
    
    // 模拟交易延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 返回模拟交易
    return {
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      wait: async () => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return {
          status: 1,
          blockNumber: Math.floor(Math.random() * 1000000),
          transactionHash: '0x' + Math.random().toString(16).substr(2, 64)
        };
      }
    };
  },
  
  // 模拟获取玩家手牌
  async getPlayerHand(address) {
    console.log('🎮 [MOCK] 模拟获取玩家手牌:', address);
    
    // 检查本地存储
    const stored = localStorage.getItem(`monad_hand_${address}`);
    if (stored) {
      const data = JSON.parse(stored);
      return [
        data.cards.join(','),
        data.submissionTime,
        true,
        '10000000000000000', // 0.01 ETH
        data.submissionTime + 86400, // 24小时后
        Date.now() / 1000
      ];
    }
    
    // 返回空数据
    return ['', 0, false, 0, 0, Date.now() / 1000];
  },
  
  // 保存模拟数据
  saveMockData(address, cards) {
    const data = {
      cards: cards,
      submissionTime: Math.floor(Date.now() / 1000)
    };
    localStorage.setItem(`monad_hand_${address}`, JSON.stringify(data));
  }
};

// 创建模拟合约包装器
export const createMockContract = (address) => {
  console.warn('⚠️ 使用模拟合约模式 - 真实合约不可用');
  
  return {
    address: MockContractMode.address,
    
    // 模拟 ENTRY_FEE 函数
    ENTRY_FEE: async () => {
      return ethers.parseEther(MockContractMode.ENTRY_FEE);
    },
    
    // 模拟 submitHand 函数
    submitHand: {
      staticCall: async (cards, options) => {
        // 静态调用总是成功
        console.log('✅ [MOCK] 静态调用成功');
        return true;
      }
    },
    
    // 实际的 submitHand
    submitHand: async (cards, options) => {
      const tx = await MockContractMode.submitHand(cards, options);
      MockContractMode.saveMockData(address, cards);
      return tx;
    },
    
    // 模拟 getPlayerHand
    getPlayerHand: async (playerAddress) => {
      return MockContractMode.getPlayerHand(playerAddress);
    }
  };
};
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ethers } from 'ethers'
import WalletConnector from './components/WalletConnector.jsx'

// 顶级30种加密货币 - Monad生态系统规则
const TOP_30_CRYPTO_CARDS = [
  // 超大市值 (Rare) - Top 10
  { id: 1, symbol: 'BTC', name: 'Bitcoin', rarity: 'rare', emoji: '₿', color: '#F7931A', marketCap: 800000000000 },
  { id: 2, symbol: 'ETH', name: 'Ethereum', rarity: 'rare', emoji: 'Ξ', color: '#627EEA', marketCap: 300000000000 },
  { id: 3, symbol: 'USDT', name: 'Tether', rarity: 'rare', emoji: '💵', color: '#26A17B', marketCap: 90000000000 },
  { id: 4, symbol: 'BNB', name: 'BNB', rarity: 'rare', emoji: '🟡', color: '#F3BA2F', marketCap: 80000000000 },
  { id: 5, symbol: 'SOL', name: 'Solana', rarity: 'rare', emoji: '◎', color: '#9945FF', marketCap: 60000000000 },
  { id: 6, symbol: 'USDC', name: 'USD Coin', rarity: 'rare', emoji: '🔵', color: '#2775CA', marketCap: 50000000000 },
  { id: 7, symbol: 'XRP', name: 'Ripple', rarity: 'rare', emoji: '💧', color: '#23292F', marketCap: 45000000000 },
  { id: 8, symbol: 'TON', name: 'Toncoin', rarity: 'rare', emoji: '💎', color: '#0088CC', marketCap: 30000000000 },
  { id: 9, symbol: 'DOGE', name: 'Dogecoin', rarity: 'rare', emoji: '🐕', color: '#C2A633', marketCap: 25000000000 },
  { id: 10, symbol: 'ADA', name: 'Cardano', rarity: 'rare', emoji: '₳', color: '#0033AD', marketCap: 20000000000 },

  // 中大市值 (Uncommon) - 11-20
  { id: 11, symbol: 'AVAX', name: 'Avalanche', rarity: 'uncommon', emoji: '🔺', color: '#E84142', marketCap: 15000000000 },
  { id: 12, symbol: 'SHIB', name: 'Shiba Inu', rarity: 'uncommon', emoji: '🐕‍🦺', color: '#FFA409', marketCap: 12000000000 },
  { id: 13, symbol: 'DOT', name: 'Polkadot', rarity: 'uncommon', emoji: '⚫', color: '#E6007A', marketCap: 10000000000 },
  { id: 14, symbol: 'LINK', name: 'Chainlink', rarity: 'uncommon', emoji: '🔗', color: '#375BD2', marketCap: 9000000000 },
  { id: 15, symbol: 'TRX', name: 'TRON', rarity: 'uncommon', emoji: '⚡', color: '#FF0013', marketCap: 8000000000 },
  { id: 16, symbol: 'MATIC', name: 'Polygon', rarity: 'uncommon', emoji: '🔷', color: '#8247E5', marketCap: 7000000000 },
  { id: 17, symbol: 'ICP', name: 'Internet Computer', rarity: 'uncommon', emoji: '♾️', color: '#29ABE2', marketCap: 6000000000 },
  { id: 18, symbol: 'UNI', name: 'Uniswap', rarity: 'uncommon', emoji: '🦄', color: '#FF007A', marketCap: 5500000000 },
  { id: 19, symbol: 'LTC', name: 'Litecoin', rarity: 'uncommon', emoji: 'Ł', color: '#A6A9AA', marketCap: 5000000000 },
  { id: 20, symbol: 'NEAR', name: 'NEAR Protocol', rarity: 'uncommon', emoji: '🌈', color: '#00C08B', marketCap: 4500000000 },

  // 中小市值 (Common) - 21-30
  { id: 21, symbol: 'APT', name: 'Aptos', rarity: 'common', emoji: '🔴', color: '#00D4AA', marketCap: 4000000000 },
  { id: 22, symbol: 'ATOM', name: 'Cosmos', rarity: 'common', emoji: '🪐', color: '#2E3148', marketCap: 3500000000 },
  { id: 23, symbol: 'FIL', name: 'Filecoin', rarity: 'common', emoji: '📁', color: '#0090FF', marketCap: 3000000000 },
  { id: 24, symbol: 'VET', name: 'VeChain', rarity: 'common', emoji: '✅', color: '#15BDFF', marketCap: 2500000000 },
  { id: 25, symbol: 'HBAR', name: 'Hedera', rarity: 'common', emoji: '🌐', color: '#FF0000', marketCap: 2000000000 },
  { id: 26, symbol: 'ALGO', name: 'Algorand', rarity: 'common', emoji: '🔺', color: '#000000', marketCap: 1800000000 },
  { id: 27, symbol: 'XTZ', name: 'Tezos', rarity: 'common', emoji: '🔷', color: '#2C7DF7', marketCap: 1500000000 },
  { id: 28, symbol: 'FLOW', name: 'Flow', rarity: 'common', emoji: '🌊', color: '#00EF8B', marketCap: 1200000000 },
  { id: 29, symbol: 'MANA', name: 'Decentraland', rarity: 'common', emoji: '🏰', color: '#FF2D55', marketCap: 1000000000 },
  { id: 30, symbol: 'SAND', name: 'The Sandbox', rarity: 'common', emoji: '🏖️', color: '#00ADEF', marketCap: 900000000 }
];

// 实时价格和排名系统
class UltimatePriceEngine {
  constructor() {
    this.prices = new Map();
    this.gameStartTime = this.getTodayUTC();
    this.updateInterval = null;
    this.lastUpdate = 0;
    this.priceHistory = new Map();
    this.apiEndpoints = [
      'https://api.coingecko.com/api/v3/simple/price',
      'https://api.coinbase.com/v2/exchange-rates',
      'https://api.binance.com/api/v3/ticker/price'
    ];
    
    // 初始化价格数据
    this.initializePrices();
    this.startPriceUpdates();
  }

  getTodayUTC() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return today.getTime();
  }

  initializePrices() {
    TOP_30_CRYPTO_CARDS.forEach(card => {
      const basePrice = this.getBasePriceForCard(card);
      this.prices.set(card.symbol, {
        current: basePrice,
        dayStart: basePrice,
        change24h: 0,
        changePercent: 0,
        monadScore: 0,
        volume24h: card.marketCap * (0.1 + Math.random() * 0.3),
        lastUpdate: Date.now(),
        trend: Math.random() > 0.5 ? 'up' : 'down'
      });
      
      this.priceHistory.set(card.symbol, []);
    });
  }

  getBasePriceForCard(card) {
    // 基于2024年真实市场价格的准确基础价格
    const realPrices = {
      // 超大市值 (Rare) - Top 10  
      'BTC': 42500 + Math.random() * 5000,    // $42,500 - $47,500
      'ETH': 2600 + Math.random() * 800,       // $2,600 - $3,400
      'USDT': 0.9995 + Math.random() * 0.001, // $0.9995 - $1.0005
      'BNB': 280 + Math.random() * 40,         // $280 - $320
      'SOL': 95 + Math.random() * 30,          // $95 - $125
      'USDC': 0.9998 + Math.random() * 0.0004,// $0.9998 - $1.0002
      'XRP': 0.52 + Math.random() * 0.08,     // $0.52 - $0.60
      'TON': 2.20 + Math.random() * 0.30,     // $2.20 - $2.50
      'DOGE': 0.078 + Math.random() * 0.012,  // $0.078 - $0.090
      'ADA': 0.38 + Math.random() * 0.07,     // $0.38 - $0.45

      // 中大市值 (Uncommon) - 11-20
      'AVAX': 26 + Math.random() * 8,         // $26 - $34
      'SHIB': 0.0000085 + Math.random() * 0.0000025, // 合理SHIB价格范围
      'DOT': 5.8 + Math.random() * 1.4,       // $5.8 - $7.2
      'LINK': 14.5 + Math.random() * 3.0,     // $14.5 - $17.5
      'TRX': 0.105 + Math.random() * 0.015,   // $0.105 - $0.120
      'MATIC': 0.90 + Math.random() * 0.20,   // $0.90 - $1.10
      'ICP': 9.5 + Math.random() * 2.5,       // $9.5 - $12.0
      'UNI': 7.2 + Math.random() * 1.8,       // $7.2 - $9.0
      'LTC': 88 + Math.random() * 12,         // $88 - $100
      'NEAR': 2.40 + Math.random() * 0.60,    // $2.40 - $3.00

      // 中小市值 (Common) - 21-30
      'APT': 8.5 + Math.random() * 1.5,       // $8.5 - $10.0
      'ATOM': 9.2 + Math.random() * 1.8,      // $9.2 - $11.0
      'FIL': 4.8 + Math.random() * 1.2,       // $4.8 - $6.0
      'VET': 0.028 + Math.random() * 0.007,   // $0.028 - $0.035
      'HBAR': 0.058 + Math.random() * 0.012,  // $0.058 - $0.070
      'ALGO': 0.195 + Math.random() * 0.025,  // $0.195 - $0.220
      'XTZ': 0.85 + Math.random() * 0.15,     // $0.85 - $1.00
      'FLOW': 0.78 + Math.random() * 0.22,    // $0.78 - $1.00
      'MANA': 0.42 + Math.random() * 0.08,    // $0.42 - $0.50
      'SAND': 0.38 + Math.random() * 0.07     // $0.38 - $0.45
    };
    
    // 使用具体价格，确保所有30个币种都有定价
    if (realPrices[card.symbol]) {
      return realPrices[card.symbol];
    }
    
    // 备用价格系统（理论上不应该触发）
    const rarityPrices = {
      'rare': 100 + Math.random() * 200,     // 大币种备用价格
      'uncommon': 5 + Math.random() * 15,    // 中等币种备用价格
      'common': 0.5 + Math.random() * 2.0    // 小币种备用价格
    };
    
    return rarityPrices[card.rarity] || 1;
  }

  async fetchRealPrices() {
    try {
      // 优化的实时价格更新算法
      TOP_30_CRYPTO_CARDS.forEach(card => {
        const current = this.prices.get(card.symbol);
        if (!current) return;

        // 更真实的市场波动模拟
        const volatility = this.getVolatility(card.rarity);
        
        // 减少趋势影响，增加随机性
        const trendInfluence = current.trend === 'up' ? 0.15 : -0.15;
        const randomWalk = (Math.random() - 0.5) * 2; // -1 到 1
        const marketNoise = (Math.random() - 0.5) * 0.5; // 市场噪声
        
        // 综合变化因子，限制极端波动
        const totalChange = (randomWalk * 0.6 + trendInfluence * 0.3 + marketNoise * 0.1) * volatility;
        
        // 计算新价格，防止价格过度偏离合理范围
        let newPrice = current.current * (1 + totalChange);
        
        // 价格边界保护：不能偏离初始价格太远
        const minPrice = current.dayStart * 0.5;  // 最低50%
        const maxPrice = current.dayStart * 2.0;  // 最高200%
        newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
        
        // 确保稳定币价格稳定
        if (card.symbol === 'USDT' || card.symbol === 'USDC') {
          newPrice = current.dayStart + (Math.random() - 0.5) * 0.002; // 极小波动
        }
        
        // 计算变化百分比和分数
        const changePercent = ((newPrice - current.dayStart) / current.dayStart) * 100;
        const monadScore = Math.round(changePercent * 100);

        this.prices.set(card.symbol, {
          ...current,
          current: newPrice,
          changePercent: changePercent,
          monadScore: monadScore,
          lastUpdate: Date.now()
        });

        // 记录历史数据
        const history = this.priceHistory.get(card.symbol) || [];
        history.push({ 
          price: newPrice, 
          time: Date.now(), 
          score: monadScore,
          volume: current.volume24h * (0.9 + Math.random() * 0.2) // 模拟成交量变化
        });
        if (history.length > 100) history.shift();
        this.priceHistory.set(card.symbol, history);

        // 更智能的趋势转换 - 基于价格位置
        const pricePosition = (newPrice - minPrice) / (maxPrice - minPrice);
        let trendChangeChance = 0.02; // 基础2%概率
        
        // 价格过高时更容易转为下跌趋势
        if (pricePosition > 0.8 && current.trend === 'up') {
          trendChangeChance = 0.15;
        }
        // 价格过低时更容易转为上涨趋势  
        else if (pricePosition < 0.2 && current.trend === 'down') {
          trendChangeChance = 0.15;
        }
        
        if (Math.random() < trendChangeChance) {
          this.prices.set(card.symbol, {
            ...this.prices.get(card.symbol),
            trend: current.trend === 'up' ? 'down' : 'up'
          });
        }
      });
      
      this.lastUpdate = Date.now();
    } catch (error) {
      console.error('价格更新失败:', error);
    }
  }

  getVolatility(rarity) {
    // 更真实的市场波动率 - 基于实际加密货币市场数据
    const volatilityMap = {
      'rare': 0.015,    // 1.5% 波动 - 大币种（BTC/ETH等）相对稳定
      'uncommon': 0.035, // 3.5% 波动 - 中等币种适中波动
      'common': 0.055   // 5.5% 波动 - 小币种波动较大但不极端
    };
    return volatilityMap[rarity] || 0.03;
  }

  startPriceUpdates() {
    this.updateInterval = setInterval(() => {
      this.fetchRealPrices();
    }, 3000); // 每3秒更新一次 - 更频繁但不过于频繁
  }

  stopPriceUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  getPriceData(symbol) {
    return this.prices.get(symbol) || null;
  }

  getAllPrices() {
    return Object.fromEntries(this.prices);
  }

  getRemainingTime() {
    const now = Date.now();
    const endTime = this.gameStartTime + (24 * 60 * 60 * 1000);
    return Math.max(0, endTime - now);
  }
}

// 终极排行榜系统
class UltimateLeaderboard {
  constructor() {
    this.players = new Map();
    this.dailyRankings = [];
    this.weeklyRankings = [];
    this.seasonRankings = [];
    this.prizePool = 1000000; // 1M Fomalhaut
    this.powerLawDistribution = this.calculatePowerLaw();
  }

  calculatePowerLaw() {
    // 实现权力法则分配 - 前2500名获得奖励
    const distribution = [];
    const totalPlayers = 2500;
    const alpha = 1.5; // 权力法则指数
    
    for (let rank = 1; rank <= totalPlayers; rank++) {
      const weight = Math.pow(rank, -alpha);
      distribution.push({ rank, weight });
    }
    
    // 归一化权重
    const totalWeight = distribution.reduce((sum, item) => sum + item.weight, 0);
    return distribution.map(item => ({
      rank: item.rank,
      percentage: (item.weight / totalWeight) * 100,
      reward: Math.floor((item.weight / totalWeight) * this.prizePool)
    }));
  }

  addPlayer(address, hand, submissionTime) {
    this.players.set(address, {
      address,
      hand, // 5张卡牌的symbols
      submissionTime,
      currentScore: 0,
      dailyRank: 0,
      weeklyRank: 0,
      seasonRank: 0,
      totalGames: (this.players.get(address)?.totalGames || 0) + 1,
      bestScore: this.players.get(address)?.bestScore || 0
    });
  }

  updatePlayerScore(address, score) {
    const player = this.players.get(address);
    if (player) {
      player.currentScore = score;
      player.bestScore = Math.max(player.bestScore, score);
      this.updateRankings();
    }
  }

  updateRankings() {
    const playerArray = Array.from(this.players.values());
    
    // 按分数排序，分数相同时按提交时间排序
    playerArray.sort((a, b) => {
      if (a.currentScore === b.currentScore) {
        return a.submissionTime - b.submissionTime;
      }
      return b.currentScore - a.currentScore;
    });

    // 更新排名
    playerArray.forEach((player, index) => {
      player.dailyRank = index + 1;
      this.players.set(player.address, player);
    });

    this.dailyRankings = playerArray;
  }

  getTopPlayers(limit = 100) {
    return this.dailyRankings.slice(0, limit);
  }

  getPlayerRank(address) {
    const player = this.players.get(address);
    return player ? player.dailyRank : 0;
  }

  getRewardForRank(rank) {
    const distribution = this.powerLawDistribution.find(d => d.rank === rank);
    return distribution ? distribution.reward : 0;
  }

  calculateHandScore(hand, priceEngine) {
    if (!hand || hand.length !== 5) return 0;

    let totalScore = 0;
    const cardCounts = {};

    // 计算基础分数
    hand.forEach(symbol => {
      const priceData = priceEngine.getPriceData(symbol);
      if (priceData) {
        totalScore += priceData.monadScore;
      }
      cardCounts[symbol] = (cardCounts[symbol] || 0) + 1;
    });

    // 重复卡牌惩罚 - 按Monad生态规则递增
    Object.values(cardCounts).forEach(count => {
      if (count > 1) {
        const duplicates = count - 1;
        const penalty = duplicates * 50 * duplicates; // 递增惩罚
        totalScore -= penalty;
      }
    });

    return Math.round(totalScore);
  }
}

// 价格格式化函数
const formatPrice = (price) => {
  if (!price || isNaN(price)) return '$0.00';
  
  if (price >= 1000) return `$${price.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;      // ≥$1000: 整数+千分位
  if (price >= 100) return `$${price.toFixed(1)}`;       // $100-999: 1位小数
  if (price >= 10) return `$${price.toFixed(2)}`;        // $10-99: 2位小数  
  if (price >= 1) return `$${price.toFixed(3)}`;         // $1-9: 3位小数
  if (price >= 0.01) return `$${price.toFixed(4)}`;      // $0.01-0.99: 4位小数
  return `$${price.toFixed(6)}`;                         // <$0.01: 6位小数
};

// 智能合约配置
const MONAD_CARD_GAME_CONTRACT = {
  address: import.meta.env.VITE_CONTRACT_ADDRESS || '0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030', // 新部署的MonadCardGame合约地址
  abi: [
    // 提交手牌
    "function submitHand(string[] memory cardSymbols) external payable",
    // 查询玩家手牌 - 修正返回类型
    "function getPlayerHand(address player) external view returns (string memory cards, uint256 submissionTime, bool isLocked, uint256 balance, uint256 unlockTime, uint256 currentTime)",
    // 常量
    "function ENTRY_FEE() external view returns (uint256)",
    "function owner() external view returns (address)",
    // 事件
    "event HandSubmitted(address indexed player, uint256 value, uint256 timestamp)"
  ]
};

// 合约交互函数 - 修复ethers v6的signer问题
const createContract = async (provider, account) => {
  if (!provider || !account) {
    throw new Error('Provider或账户地址未提供');
  }
  
  // 检查合约是否已部署
  const code = await provider.getCode(MONAD_CARD_GAME_CONTRACT.address);
  if (code === '0x' || code === '0x0') {
    throw new Error('合约未在该地址部署');
  }
  
  // 临时检查：如果是有问题的合约，抛出错误
  if (code.startsWith('0xf3fe')) {
    throw new Error('合约部署异常，请等待修复或使用新地址');
  }
  
  // 在ethers v6中，getSigner需要传入账户地址
  const signer = await provider.getSigner(account);
  return new ethers.Contract(
    MONAD_CARD_GAME_CONTRACT.address,
    MONAD_CARD_GAME_CONTRACT.abi,
    signer
  );
};

const getContractReadOnly = (provider) => {
  return new ethers.Contract(
    MONAD_CARD_GAME_CONTRACT.address,
    MONAD_CARD_GAME_CONTRACT.abi,
    provider
  );
};

// 合约连接健康检查
const checkContractHealth = async (provider) => {
  console.log('🔍 [CONTRACT] 开始合约健康检查...');
  
  try {
    // 检查合约地址是否有效
    if (!MONAD_CARD_GAME_CONTRACT.address || MONAD_CARD_GAME_CONTRACT.address.length !== 42) {
      throw new Error('Invalid contract address format');
    }
    
    // 检查是否是占位符地址
    if (MONAD_CARD_GAME_CONTRACT.address === '0x1234567890123456789012345678901234567890') {
      throw new Error('Contract address is still a placeholder');
    }
    
    // 尝试连接到合约
    const contract = getContractReadOnly(provider);
    
    // 检查合约代码是否存在
    const code = await provider.getCode(MONAD_CARD_GAME_CONTRACT.address);
    if (code === '0x') {
      throw new Error('No contract code found at address');
    }
    
    console.log('✅ [CONTRACT] 合约地址验证成功:', MONAD_CARD_GAME_CONTRACT.address);
    console.log('✅ [CONTRACT] 合约代码已部署，字节码长度:', code.length);
    
    return {
      success: true,
      address: MONAD_CARD_GAME_CONTRACT.address,
      hasCode: true,
      codeLength: code.length
    };
    
  } catch (error) {
    console.error('❌ [CONTRACT] 合约健康检查失败:', error);
    return {
      success: false,
      error: error.message,
      address: MONAD_CARD_GAME_CONTRACT.address,
      hasCode: false
    };
  }
};

// 主应用组件
const UltimateMonadApp = () => {
  // 核心状态管理
  const [gameState, setGameState] = useState({
    isInitialized: false,
    currentPhase: 'loading', // loading, wallet, selection, playing, ended
    timeRemaining: { hours: 0, minutes: 0, seconds: 0 },
    totalPlayers: 0
  });

  const [walletState, setWalletState] = useState({
    isConnected: false,
    account: null,
    balance: '0',
    monadBalance: '0',
    provider: null,
    hasMinimumBalance: false
  });

  const [playerState, setPlayerState] = useState({
    cards: [], // 玩家拥有的卡牌
    selectedHand: [], // 选择的5张卡牌
    handLocked: false,
    submissionTime: null,
    currentScore: 0,
    rank: 0,
    estimatedReward: 0
  });

  const [uiState, setUiState] = useState({
    loading: false,
    error: null,
    notification: null,
    activeTab: 'play',
    showCardDetails: null
  });

  // 核心服务实例
  const priceEngine = useMemo(() => new UltimatePriceEngine(), []);
  const leaderboard = useMemo(() => new UltimateLeaderboard(), []);
  const updateInterval = useRef(null);

  // 初始化应用
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // 生成玩家起始卡牌（随机10张）
        const playerCards = [];
        const availableCards = [...TOP_30_CRYPTO_CARDS];
        
        for (let i = 0; i < 10; i++) {
          const randomIndex = Math.floor(Math.random() * availableCards.length);
          const card = availableCards.splice(randomIndex, 1)[0];
          playerCards.push({
            ...card,
            obtainedAt: Date.now(),
            level: 1 + Math.floor(Math.random() * 3)
          });
        }

        setPlayerState(prev => ({ ...prev, cards: playerCards }));
        
        // 生成真实数量的模拟排行榜数据
        const playerCount = 1247 + Math.floor(Math.random() * 500); // 1247-1747人数
        for (let i = 0; i < Math.min(playerCount, 100); i++) { // 显示前100名
          const mockAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
          const mockHand = Array.from({length: 5}, () => 
            TOP_30_CRYPTO_CARDS[Math.floor(Math.random() * 30)].symbol
          );
          leaderboard.addPlayer(mockAddress, mockHand, Date.now() - Math.random() * 86400000);
        }

        setGameState(prev => ({ 
          ...prev, 
          isInitialized: true, 
          currentPhase: 'wallet',
          totalPlayers: playerCount
        }));

        // 开始游戏时间更新
        startGameTimer();

      } catch (error) {
        console.error('游戏初始化失败:', error);
        setUiState(prev => ({ ...prev, error: '游戏初始化失败' }));
      }
    };

    initializeGame();
    
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
      priceEngine.stopPriceUpdates();
    };
  }, [priceEngine, leaderboard]);

  // 游戏计时器
  const startGameTimer = useCallback(() => {
    updateInterval.current = setInterval(() => {
      const remaining = priceEngine.getRemainingTime();
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      
      setGameState(prev => ({
        ...prev,
        timeRemaining: { hours, minutes, seconds }
      }));

      // 更新玩家分数和排名（如果手牌已锁定）
      if (playerState.handLocked && playerState.selectedHand.length === 5 && walletState.account) {
        const score = leaderboard.calculateHandScore(playerState.selectedHand, priceEngine);
        leaderboard.updatePlayerScore(walletState.account, score);
        const currentRank = leaderboard.getPlayerRank(walletState.account);
        
        setPlayerState(prev => ({
          ...prev,
          currentScore: score,
          rank: currentRank,
          estimatedReward: leaderboard.getRewardForRank(currentRank)
        }));
        
        // 更新总参与人数（模拟真实增长）
        if (Math.random() < 0.3) { // 30%的概率增加参与人数
          setGameState(prev => ({
            ...prev,
            totalPlayers: Math.min(prev.totalPlayers + Math.floor(Math.random() * 2 + 1), 2500) // 最多2500人，每次增加1-2人
          }));
        }
      }

      // 检查游戏是否结束
      if (remaining <= 0) {
        setGameState(prev => ({ ...prev, currentPhase: 'ended' }));
        clearInterval(updateInterval.current);
      }
    }, 1000);
  }, [priceEngine, leaderboard, playerState.handLocked, playerState.selectedHand, walletState.account]);

  // 检查MONAD余额
  const checkMonadBalance = useCallback(async (provider, account) => {
    try {
      // 获取MONAD测试网原生代币余额
      const balance = await provider.getBalance(account);
      const balanceInEther = ethers.formatEther(balance);
      const monadBalance = parseFloat(balanceInEther);
      
      return {
        monadBalance: balanceInEther,
        hasMinimumBalance: monadBalance >= 0.001 // 降低到0.001 MONAD最低要求
      };
    } catch (error) {
      console.error('获取MONAD余额失败:', error);
      return {
        monadBalance: '0',
        hasMinimumBalance: false
      };
    }
  }, []);

  // 钱包连接处理
  const handleWalletConnect = useCallback(async (walletData) => {
    // 首先进行合约健康检查
    console.log('🔍 [WALLET] 开始钱包连接和合约验证流程...');
    const contractHealth = await checkContractHealth(walletData.provider);
    
    if (!contractHealth.success) {
      setUiState(prev => ({
        ...prev,
        notification: {
          type: 'error',
          message: `⚠️ 智能合约连接失败: ${contractHealth.error}`,
          duration: 8000
        }
      }));
      console.error('❌ [WALLET] 合约健康检查失败，但继续钱包连接流程');
    } else {
      console.log('✅ [WALLET] 合约连接健康检查通过');
    }
    
    // 检查MONAD余额
    const balanceCheck = await checkMonadBalance(walletData.provider, walletData.account);
    
    setWalletState({
      isConnected: true,
      account: walletData.account,
      balance: walletData.balance,
      monadBalance: balanceCheck.monadBalance,
      provider: walletData.provider,
      hasMinimumBalance: balanceCheck.hasMinimumBalance
    });
    
    if (balanceCheck.hasMinimumBalance) {
      try {
        // 从智能合约读取玩家状态
        const contract = getContractReadOnly(walletData.provider);
        
        // 查询玩家手牌和状态
        const playerHand = await contract.getPlayerHand(walletData.account);
        const cards = playerHand[0]; // string of comma-separated cards
        const submissionTime = playerHand[1];
        const isLocked = playerHand[2];
        const balance = playerHand[3];
        const unlockTime = playerHand[4];
        const currentTime = playerHand[5];
        
        // 将逗号分隔的卡牌字符串转换为数组
        const handSymbols = cards ? cards.split(',').filter(c => c) : [];
        
        if (isLocked && handSymbols.length > 0) {
          // 玩家已有锁定的手牌，恢复状态
          const currentScore = 0; // 合约中没有分数系统
          
          setPlayerState(prev => ({
            ...prev,
            selectedHand: handSymbols,
            handLocked: true,
            submissionTime: submissionTime.toNumber() * 1000, // 转换为毫秒
            currentScore: currentScore.toNumber(),
            rank: 0, // 需要从排行榜计算
            estimatedReward: 0 // 需要从排行榜计算
          }));
          
          setGameState(prev => ({ ...prev, currentPhase: 'playing' }));
          
          const hoursLeft = Math.ceil((unlockTime.toNumber() * 1000 - Date.now()) / (1000 * 60 * 60));
          setUiState(prev => ({
            ...prev,
            notification: {
              type: 'success',
              message: `🔒 手牌已在区块链上锁定！还有${hoursLeft}小时可以重新选择`,
              duration: 4000
            }
          }));
        } else {
          // 可以选择新手牌
          setGameState(prev => ({ ...prev, currentPhase: 'selection' }));
          
          if (isLocked && canReselect) {
            setUiState(prev => ({
              ...prev,
              notification: {
                type: 'info',
                message: '🆕 24小时已过，可以重新选择手牌！',
                duration: 3000
              }
            }));
          } else {
            setUiState(prev => ({
              ...prev,
              notification: {
                type: 'success',
                message: `🎉 钱包连接成功！欢迎来到终极Monad！`,
                duration: 3000
              }
            }));
          }
        }
      } catch (error) {
        console.error('读取合约状态失败:', error);
        // 如果合约交互失败，回退到选择模式
        setGameState(prev => ({ ...prev, currentPhase: 'selection' }));
        setUiState(prev => ({
          ...prev,
          notification: {
            type: 'warning',
            message: '⚠️ 无法连接到游戏合约，请检查网络连接',
            duration: 4000
          }
        }));
      }
    } else {
      setGameState(prev => ({ ...prev, currentPhase: 'insufficient_balance' }));
      
      // 显示余额不足通知
      setUiState(prev => ({
        ...prev,
        notification: {
          type: 'warning',
          message: `⚠️ 需要至少0.001 MONAD测试币才能参与游戏！当前余额: ${parseFloat(balanceCheck.monadBalance).toFixed(4)} MONAD`,
          duration: 5000
        }
      }));
    }
  }, [checkMonadBalance]);

  const handleWalletDisconnect = useCallback(() => {
    setWalletState({
      isConnected: false,
      account: null,
      balance: '0',
      monadBalance: '0',
      provider: null,
      hasMinimumBalance: false
    });
    
    setGameState(prev => ({ ...prev, currentPhase: 'wallet' }));
  }, []);

  // 卡牌选择逻辑
  const toggleCardSelection = useCallback((cardSymbol) => {
    if (playerState.handLocked) return;
    
    setPlayerState(prev => {
      const currentHand = prev.selectedHand;
      
      if (currentHand.includes(cardSymbol)) {
        return {
          ...prev,
          selectedHand: currentHand.filter(symbol => symbol !== cardSymbol)
        };
      } else if (currentHand.length < 5) {
        return {
          ...prev,
          selectedHand: [...currentHand, cardSymbol]
        };
      } else {
        setUiState(prevUi => ({
          ...prevUi,
          notification: {
            type: 'warning',
            message: '最多只能选择5张卡牌！',
            duration: 2000
          }
        }));
        return prev;
      }
    });
  }, [playerState.handLocked]);

  // 提交手牌
  const submitHand = useCallback(async () => {
    if (playerState.selectedHand.length !== 5) {
      setUiState(prev => ({
        ...prev,
        notification: {
          type: 'warning',
          message: '请选择正好5张卡牌！',
          duration: 2000
        }
      }));
      return;
    }

    setUiState(prev => ({ ...prev, loading: true }));

    try {
      // 创建带signer的合约实例
      const contract = await createContract(walletState.provider, walletState.account);
      
      setUiState(prev => ({
        ...prev,
        notification: {
          type: 'info',
          message: '📝 正在提交手牌到区块链...',
          duration: 2000
        }
      }));

      // 先进行静态调用测试
      console.log('🔍 [CONTRACT] 测试合约调用...');
      console.log('  选中的卡牌:', playerState.selectedHand);
      console.log('  参与费:', '0.01 MONAD');
      console.log('  合约地址:', MONAD_CARD_GAME_CONTRACT.address);
      console.log('  用户账户:', walletState.account);
      
      try {
        // 尝试静态调用（不消耗gas）- ethers v6不需要from参数
        await contract.submitHand.staticCall(playerState.selectedHand, {
          value: ethers.parseEther("0.01") // 修正为正确的参与费: 0.01 ETH
        });
        console.log('✅ [CONTRACT] 静态调用成功，准备发送交易');
      } catch (staticError) {
        console.error('❌ [CONTRACT] 静态调用失败:', staticError);
        if (staticError.code === 'UNSUPPORTED_OPERATION') {
          throw new Error('合约方法不存在或signer配置错误');
        }
        throw new Error(`合约验证失败: ${staticError.message}`);
      }
      
      // 提交手牌到智能合约
      const tx = await contract.submitHand(playerState.selectedHand, {
        value: ethers.parseEther("0.01") // 正确的参与费: 0.01 MONAD
      });
      
      setUiState(prev => ({
        ...prev,
        notification: {
          type: 'info',
          message: '⛓️ 交易已发送，等待区块确认...',
          duration: 3000
        }
      }));

      // 等待交易确认
      const receipt = await tx.wait();
      
      const submissionTime = Date.now();
      
      // 添加到排行榜
      leaderboard.addPlayer(walletState.account, playerState.selectedHand, submissionTime);
      
      // 立即计算初始分数
      const initialScore = leaderboard.calculateHandScore(playerState.selectedHand, priceEngine);
      leaderboard.updatePlayerScore(walletState.account, initialScore);
      const initialRank = leaderboard.getPlayerRank(walletState.account);
      
      setPlayerState(prev => ({
        ...prev,
        handLocked: true,
        submissionTime: submissionTime,
        currentScore: initialScore,
        rank: initialRank,
        estimatedReward: leaderboard.getRewardForRank(initialRank)
      }));

      setGameState(prev => ({ ...prev, currentPhase: 'playing' }));

      setUiState(prev => ({
        ...prev,
        loading: false,
        notification: {
          type: 'success',
          message: `🔒 手牌已永久保存到区块链！交易哈希: ${receipt.hash.slice(0,10)}...`,
          duration: 5000
        }
      }));

    } catch (error) {
      console.error('提交手牌失败:', error);
      
      let errorMessage = '手牌提交失败';
      let errorDetails = error.message || '';
      
      // 更详细的错误处理
      if (error.code === 'INSUFFICIENT_FUNDS' || errorDetails.includes('insufficient funds')) {
        errorMessage = '余额不足，需要至少0.01 MONAD作为参与费';
      } else if (error.code === 'UNSUPPORTED_OPERATION') {
        errorMessage = 'Signer未连接或ABI方法不存在，请检查钱包连接';
      } else if (error.code === 'ACTION_REJECTED' || errorDetails.includes('user rejected')) {
        errorMessage = '用户取消了交易';
      } else if (errorDetails.includes('already submitted')) {
        errorMessage = '您今天已经提交过手牌';
      } else if (errorDetails.includes('network') || error.code === 'NETWORK_ERROR') {
        errorMessage = '网络连接失败，请检查RPC连接';
      } else if (errorDetails.includes('contract') || error.code === 'CALL_EXCEPTION') {
        if (errorDetails.includes('missing revert data')) {
          errorMessage = '合约执行失败：当前合约地址可能无效或合约未正确部署。请联系管理员。';
        } else if (errorDetails.includes('execution reverted')) {
          errorMessage = '合约拒绝了交易：可能是参数错误或合约状态问题';
        } else {
          errorMessage = '合约调用失败，请确认合约已部署并且地址正确';
        }
      } else if (errorDetails.includes('gas')) {
        errorMessage = 'Gas费用估算失败，请稍后再试';
      } else if (errorDetails.includes('require(false)')) {
        errorMessage = '合约初始化失败：当前部署的合约存在问题，请等待修复';
      } else {
        // 显示更详细的错误信息
        errorMessage = `交易失败: ${errorDetails.substring(0, 100)}...`;
      }
      
      setUiState(prev => ({
        ...prev,
        loading: false,
        notification: {
          type: 'error',
          message: errorMessage,
          duration: 6000
        }
      }));
    }
  }, [playerState.selectedHand, walletState.account, walletState.provider, leaderboard, priceEngine]);

  // 通知系统
  useEffect(() => {
    if (uiState.notification) {
      const timer = setTimeout(() => {
        setUiState(prev => ({ ...prev, notification: null }));
      }, uiState.notification.duration || 3000);
      
      return () => clearTimeout(timer);
    }
  }, [uiState.notification]);

  // 渲染合约信息
  const renderContractInfo = () => (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(30, 30, 40, 0.95)',
      padding: '15px',
      borderRadius: '10px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 1000
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#4ECDC4' }}>
        🔗 合约信息
      </div>
      <div style={{ color: '#aaa', marginBottom: '5px' }}>
        地址: {MONAD_CARD_GAME_CONTRACT.address.slice(0, 6)}...{MONAD_CARD_GAME_CONTRACT.address.slice(-4)}
      </div>
      <div style={{ color: '#aaa', marginBottom: '5px' }}>
        网络: Monad Testnet (Chain ID: 10143)
      </div>
      <div style={{ color: '#aaa', marginBottom: '5px' }}>
        参与费: 0.01 MONAD
      </div>
      <div style={{ color: '#aaa' }}>
        RPC: {walletState.provider ? '已连接' : '未连接'}
      </div>
    </div>
  );

  // 渲染游戏头部
  const renderGameHeader = () => (
    <div style={{
      textAlign: 'center',
      marginBottom: '30px',
      background: 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,107,107,0.1))',
      padding: '20px',
      borderRadius: '20px',
      border: '2px solid rgba(255,215,0,0.3)'
    }}>
      <h1 style={{
        fontSize: '3.5rem',
        background: 'linear-gradient(45deg, #FFD700, #FF6B6B, #4ECDC4)',
        backgroundSize: '200% 200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '10px',
        animation: 'gradientAnimation 3s ease infinite'
      }}>
        🏆 ULTIMATE MONAD 🏆
      </h1>
      <p style={{ fontSize: '1.3rem', color: '#bbb', marginBottom: '20px' }}>
        Monad生态系统的终极加密货币卡牌竞技平台
      </p>
      
      {/* 游戏时间和状态 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginTop: '20px'
      }}>
        <div style={{
          background: 'rgba(231, 76, 60, 0.2)',
          padding: '15px',
          borderRadius: '15px',
          border: '2px solid #E74C3C'
        }}>
          <div style={{ color: '#E74C3C', fontWeight: 'bold', marginBottom: '5px' }}>⏰ 剩余时间</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
            {String(gameState.timeRemaining.hours).padStart(2, '0')}:
            {String(gameState.timeRemaining.minutes).padStart(2, '0')}:
            {String(gameState.timeRemaining.seconds).padStart(2, '0')}
          </div>
        </div>
        
        <div style={{
          background: 'rgba(52, 152, 219, 0.2)',
          padding: '15px',
          borderRadius: '15px',
          border: '2px solid #3498DB'
        }}>
          <div style={{ color: '#3498DB', fontWeight: 'bold', marginBottom: '5px' }}>👥 参与人数</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{gameState.totalPlayers.toLocaleString()}</div>
        </div>
        
        <div style={{
          background: 'rgba(255, 215, 0, 0.2)',
          padding: '15px',
          borderRadius: '15px',
          border: '2px solid #FFD700'
        }}>
          <div style={{ color: '#FFD700', fontWeight: 'bold', marginBottom: '5px' }}>💰 奖金池</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>1,000,000 Fomalhaut</div>
        </div>
        
        {walletState.isConnected && (
          <div style={{
            background: 'rgba(78, 205, 196, 0.2)',
            padding: '15px',
            borderRadius: '15px',
            border: '2px solid #4ECDC4'
          }}>
            <div style={{ color: '#4ECDC4', fontWeight: 'bold', marginBottom: '5px' }}>💰 MONAD余额</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
              {parseFloat(walletState.monadBalance).toFixed(4)}
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: walletState.hasMinimumBalance ? '#27AE60' : '#E74C3C',
              marginTop: '3px'
            }}>
              {walletState.hasMinimumBalance ? '✅ 可参与' : '❌ 需要0.001+'}
            </div>
          </div>
        )}
        
        {playerState.rank > 0 && (
          <div style={{
            background: 'rgba(155, 89, 182, 0.2)',
            padding: '15px',
            borderRadius: '15px',
            border: '2px solid #9B59B6'
          }}>
            <div style={{ color: '#9B59B6', fontWeight: 'bold', marginBottom: '5px' }}>🏅 我的排名</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>#{playerState.rank}</div>
          </div>
        )}
      </div>
    </div>
  );

  // 根据游戏阶段渲染内容
  const renderGameContent = () => {
    switch (gameState.currentPhase) {
      case 'loading':
        return (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{
              width: '80px', height: '80px',
              border: '8px solid rgba(255,255,255,0.3)',
              borderTop: '8px solid #FFD700',
              borderRadius: '50%',
              margin: '0 auto 30px',
              animation: 'spin 1s linear infinite'
            }} />
            <h2>🚀 正在初始化终极Monad系统...</h2>
            <p>加载实时价格数据、排行榜系统、智能合约...</p>
          </div>
        );

      case 'wallet':
        return (
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.1), rgba(69, 160, 141, 0.1))',
              padding: '40px',
              borderRadius: '20px',
              border: '2px solid rgba(78, 205, 196, 0.3)',
              marginBottom: '30px'
            }}>
              <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🚀</div>
              <h2 style={{ color: '#4ECDC4', marginBottom: '20px' }}>准备开始终极对决？</h2>
              <p style={{ marginBottom: '30px', fontSize: '1.1rem', opacity: 0.9 }}>
                连接您的钱包，加入全球最激烈的加密货币卡牌竞技！
              </p>
              
              <WalletConnector 
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
              />
            </div>
            
            <div style={{
              background: 'rgba(52, 152, 219, 0.1)',
              padding: '20px',
              borderRadius: '15px',
              border: '1px solid rgba(52, 152, 219, 0.3)',
              fontSize: '0.9rem'
            }}>
              <h4 style={{ color: '#3498DB', marginBottom: '15px' }}>🎯 游戏规则</h4>
              <div style={{ textAlign: 'left', display: 'grid', gap: '8px' }}>
                <div>📈 <strong>计分规则:</strong> 1%涨幅 = +100分，1%跌幅 = -100分</div>
                <div>🎴 <strong>手牌规则:</strong> 选择5张卡牌，重复卡牌有递增惩罚</div>
                <div>⏰ <strong>时间规则:</strong> 24小时轮次，00:00 UTC开始和结束</div>
                <div>🏆 <strong>奖励规则:</strong> 100万Fomalhaut按权力法则分配给前2500名</div>
              </div>
            </div>
          </div>
        );

      case 'selection':
        return renderCardSelection();

      case 'playing':
        return renderGamePlay();

      case 'ended':
        return renderGameEnd();

      case 'insufficient_balance':
        return renderInsufficientBalance();

      default:
        return <div>Unknown game state</div>;
    }
  };

  // 卡牌选择界面
  const renderCardSelection = () => (
    <div>
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1))',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '30px',
        border: '2px solid rgba(255, 215, 0, 0.3)'
      }}>
        <h2 style={{ color: '#FFD700', textAlign: 'center', marginBottom: '15px' }}>
          🎯 选择你的5张战斗卡牌 ({playerState.selectedHand.length}/5)
        </h2>
        
        {playerState.selectedHand.length > 0 && (
          <div style={{ textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>已选择的卡牌：</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {playerState.selectedHand.map((symbol, index) => {
                const card = TOP_30_CRYPTO_CARDS.find(c => c.symbol === symbol);
                const priceData = priceEngine.getPriceData(symbol);
                
                return (
                  <div key={index} style={{
                    background: `linear-gradient(135deg, ${card.color}40, ${card.color}20)`,
                    border: `2px solid ${card.color}`,
                    borderRadius: '10px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{card.emoji}</span>
                    <span style={{ fontWeight: 'bold' }}>{symbol}</span>
                    <span style={{
                      color: priceData?.monadScore >= 0 ? '#27AE60' : '#E74C3C',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      {priceData?.monadScore > 0 ? '+' : ''}{priceData?.monadScore || 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {playerState.selectedHand.length === 5 && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={submitHand}
              disabled={uiState.loading}
              style={{
                background: uiState.loading ? 
                  'linear-gradient(45deg, #95A5A6, #BDC3C7)' :
                  'linear-gradient(45deg, #27AE60, #2ECC71)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                borderRadius: '25px',
                cursor: uiState.loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 8px 25px rgba(39, 174, 96, 0.3)'
              }}
            >
              {uiState.loading ? '⏳ 提交中...' : '🚀 锁定手牌开始游戏！'}
            </button>
          </div>
        )}
      </div>

      {/* 卡牌网格 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {playerState.cards.map(card => {
          const isSelected = playerState.selectedHand.includes(card.symbol);
          const priceData = priceEngine.getPriceData(card.symbol);
          
          return (
            <div
              key={card.id}
              onClick={() => toggleCardSelection(card.symbol)}
              style={{
                background: isSelected ? 
                  `linear-gradient(135deg, ${card.color}60, ${card.color}40)` :
                  `linear-gradient(135deg, ${card.color}30, ${card.color}15)`,
                border: isSelected ? 
                  `3px solid #FFD700` : 
                  `3px solid ${card.color}`,
                borderRadius: '20px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease',
                boxShadow: isSelected ? 
                  '0 10px 30px rgba(255, 215, 0, 0.5)' :
                  '0 5px 15px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: '10px' }}>
                {card.emoji}
              </div>
              
              <h3 style={{ 
                margin: '10px 0', 
                color: card.color, 
                fontWeight: 'bold',
                fontSize: '1.3rem' 
              }}>
                {card.symbol}
              </h3>
              
              <div style={{ 
                fontSize: '0.9rem', 
                color: '#bbb', 
                marginBottom: '15px' 
              }}>
                {card.name}
              </div>
              
              <div style={{
                background: card.rarity === 'rare' ? '#FFD700' :
                           card.rarity === 'uncommon' ? '#3498DB' : '#95A5A6',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '15px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginBottom: '15px',
                display: 'inline-block'
              }}>
                {card.rarity.toUpperCase()}
              </div>
              
              {priceData && (
                <div style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
                    {formatPrice(priceData.current)}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: priceData.changePercent >= 0 ? '#27AE60' : '#E74C3C',
                    fontWeight: 'bold'
                  }}>
                    {priceData.changePercent >= 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
                  </div>
                  <div style={{
                    fontSize: '1.2rem',
                    color: priceData.monadScore >= 0 ? '#27AE60' : '#E74C3C',
                    fontWeight: 'bold',
                    marginTop: '5px'
                  }}>
                    {priceData.monadScore > 0 ? '+' : ''}{priceData.monadScore} 分
                  </div>
                </div>
              )}
              
              <div style={{
                background: isSelected ? 
                  'linear-gradient(45deg, #FFD700, #FF8C00)' :
                  'linear-gradient(45deg, #4ECDC4, #45B7B8)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer'
              }}>
                {isSelected ? '✅ 已选择' : '🎯 点击选择'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 游戏进行中界面
  const renderGamePlay = () => (
    <div>
      {/* 玩家状态面板 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.2), rgba(46, 204, 113, 0.1))',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '30px',
        border: '2px solid #27AE60'
      }}>
        <h2 style={{ color: '#27AE60', textAlign: 'center', marginBottom: '20px' }}>
          🎮 游戏进行中 - 实时计分
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', color: '#FFD700', fontWeight: 'bold' }}>
              {playerState.currentScore || 0}
            </div>
            <div style={{ opacity: 0.8 }}>当前得分</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', color: '#9B59B6', fontWeight: 'bold' }}>
              #{playerState.rank || '--'}
            </div>
            <div style={{ opacity: 0.8 }}>当前排名</div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: '#3498DB', fontWeight: 'bold' }}>
              {(playerState.estimatedReward || 0).toLocaleString()}
            </div>
            <div style={{ opacity: 0.8 }}>预计奖励 (Fomalhaut)</div>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        {[
          { id: 'myhand', label: '🃏 我的手牌', icon: '🃏' },
          { id: 'leaderboard', label: '🏆 排行榜', icon: '🏆' },
          { id: 'market', label: '📊 市场行情', icon: '📊' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setUiState(prev => ({ ...prev, activeTab: tab.id }))}
            style={{
              background: uiState.activeTab === tab.id ? 
                'linear-gradient(45deg, #9B59B6, #8E44AD)' : 
                'rgba(155, 89, 182, 0.3)',
              border: 'none',
              color: 'white',
              padding: '12px 20px',
              margin: '0 5px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      {uiState.activeTab === 'myhand' && renderMyHand()}
      {uiState.activeTab === 'leaderboard' && renderLeaderboard()}
      {uiState.activeTab === 'market' && renderMarketData()}
    </div>
  );

  // 我的手牌显示
  const renderMyHand = () => (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      padding: '20px',
      borderRadius: '15px'
    }}>
      <h3 style={{ color: '#FFD700', marginBottom: '20px', textAlign: 'center' }}>
        🃏 我的锁定手牌
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px'
      }}>
        {playerState.selectedHand.map((symbol, index) => {
          const card = TOP_30_CRYPTO_CARDS.find(c => c.symbol === symbol);
          const priceData = priceEngine.getPriceData(symbol);
          
          return (
            <div key={index} style={{
              background: `linear-gradient(135deg, ${card.color}40, ${card.color}20)`,
              border: `2px solid ${card.color}`,
              borderRadius: '15px',
              padding: '15px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                {card.emoji}
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>
                {card.symbol}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '10px' }}>
                {card.name}
              </div>
              {priceData && (
                <div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '3px' }}>
                    {formatPrice(priceData.current)}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: priceData.changePercent >= 0 ? '#27AE60' : '#E74C3C',
                    marginBottom: '8px'
                  }}>
                    {priceData.changePercent >= 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    color: priceData.monadScore >= 0 ? '#27AE60' : '#E74C3C',
                    fontWeight: 'bold'
                  }}>
                    {priceData.monadScore > 0 ? '+' : ''}{priceData.monadScore}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // 排行榜显示
  const renderLeaderboard = () => {
    const topPlayers = leaderboard.getTopPlayers(50);
    
    return (
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        padding: '20px',
        borderRadius: '15px'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '20px', textAlign: 'center' }}>
          🏆 实时排行榜 (前50名)
        </h3>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {topPlayers.map((player, index) => (
            <div
              key={player.address}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                margin: '5px 0',
                background: player.address === walletState.account ? 
                  'rgba(255, 215, 0, 0.2)' : 
                  index < 3 ? 'rgba(231, 76, 60, 0.2)' :
                  index < 10 ? 'rgba(230, 126, 34, 0.2)' :
                  'rgba(255,255,255,0.02)',
                borderRadius: '10px',
                border: player.address === walletState.account ? 
                  '2px solid #FFD700' : 
                  index < 3 ? '2px solid #E74C3C' : 
                  '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#FFF',
                  minWidth: '60px'
                }}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                    {player.address === walletState.account ? '您' : 
                     `${player.address.slice(0, 6)}...${player.address.slice(-4)}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    {new Date(player.submissionTime).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '1.3rem', 
                  fontWeight: 'bold',
                  color: player.currentScore >= 0 ? '#27AE60' : '#E74C3C'
                }}>
                  {player.currentScore >= 0 ? '+' : ''}{player.currentScore}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#FFD700' }}>
                  {leaderboard.getRewardForRank(index + 1).toLocaleString()} Fomalhaut
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 市场数据显示
  const renderMarketData = () => (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      padding: '20px',
      borderRadius: '15px'
    }}>
      <h3 style={{ color: '#FFD700', marginBottom: '20px', textAlign: 'center' }}>
        📊 实时市场行情
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '15px'
      }}>
        {TOP_30_CRYPTO_CARDS.map(card => {
          const priceData = priceEngine.getPriceData(card.symbol);
          if (!priceData) return null;
          
          return (
            <div
              key={card.id}
              style={{
                background: `linear-gradient(135deg, ${card.color}20, ${card.color}10)`,
                border: `1px solid ${card.color}`,
                borderRadius: '12px',
                padding: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div style={{ fontSize: '2rem' }}>{card.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                  {card.symbol} - {card.name}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#fff' }}>
                  {formatPrice(priceData.current)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '0.9rem',
                  color: priceData.changePercent >= 0 ? '#27AE60' : '#E74C3C',
                  fontWeight: 'bold'
                }}>
                  {priceData.changePercent >= 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
                </div>
                <div style={{
                  fontSize: '1.1rem',
                  color: priceData.monadScore >= 0 ? '#27AE60' : '#E74C3C',
                  fontWeight: 'bold'
                }}>
                  {priceData.monadScore > 0 ? '+' : ''}{priceData.monadScore}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 余额不足界面
  const renderInsufficientBalance = () => (
    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(192, 57, 43, 0.1))',
        padding: '40px',
        borderRadius: '20px',
        border: '2px solid rgba(231, 76, 60, 0.3)',
        marginBottom: '30px'
      }}>
        <div style={{ fontSize: '5rem', marginBottom: '20px' }}>⚠️</div>
        <h2 style={{ color: '#E74C3C', marginBottom: '20px' }}>需要MONAD测试币参与</h2>
        <p style={{ marginBottom: '30px', fontSize: '1.1rem', opacity: 0.9 }}>
          您需要至少 <strong>0.1 MONAD</strong> 测试币才能参与这个激烈的卡牌竞技！
        </p>
        
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '30px'
        }}>
          <div style={{ fontSize: '1rem', marginBottom: '10px' }}>
            📊 当前余额: <strong>{parseFloat(walletState.monadBalance).toFixed(4)} MONAD</strong>
          </div>
          <div style={{ fontSize: '1rem', color: '#E74C3C' }}>
            ❌ 需要: <strong>0.1 MONAD</strong> (最低参与要求)
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '15px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => window.open('https://faucet.monad.xyz', '_blank')}
            style={{
              background: 'linear-gradient(45deg, #27AE60, #2ECC71)',
              border: 'none',
              color: 'white',
              padding: '12px 25px',
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: '25px',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(39, 174, 96, 0.3)'
            }}
          >
            🚰 获取测试币
          </button>
          
          <button
            onClick={async () => {
              if (walletState.provider && walletState.account) {
                const balanceCheck = await checkMonadBalance(walletState.provider, walletState.account);
                setWalletState(prev => ({
                  ...prev,
                  monadBalance: balanceCheck.monadBalance,
                  hasMinimumBalance: balanceCheck.hasMinimumBalance
                }));
                
                if (balanceCheck.hasMinimumBalance) {
                  setGameState(prev => ({ ...prev, currentPhase: 'selection' }));
                  setUiState(prev => ({
                    ...prev,
                    notification: {
                      type: 'success',
                      message: '🎉 余额充足！欢迎参与游戏！',
                      duration: 3000
                    }
                  }));
                } else {
                  setUiState(prev => ({
                    ...prev,
                    notification: {
                      type: 'warning',
                      message: `余额仍然不足: ${parseFloat(balanceCheck.monadBalance).toFixed(4)} MONAD`,
                      duration: 3000
                    }
                  }));
                }
              }
            }}
            style={{
              background: 'linear-gradient(45deg, #3498DB, #2980B9)',
              border: 'none',
              color: 'white',
              padding: '12px 25px',
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: '25px',
              cursor: 'pointer',
              boxShadow: '0 8px 25px rgba(52, 152, 219, 0.3)'
            }}
          >
            🔄 刷新余额
          </button>
        </div>
      </div>
      
      <div style={{
        background: 'rgba(52, 152, 219, 0.1)',
        padding: '20px',
        borderRadius: '15px',
        border: '1px solid rgba(52, 152, 219, 0.3)',
        fontSize: '0.9rem'
      }}>
        <h4 style={{ color: '#3498DB', marginBottom: '15px' }}>💡 如何获取MONAD测试币？</h4>
        <div style={{ textAlign: 'left', display: 'grid', gap: '8px' }}>
          <div>1. 📋 复制您的钱包地址: <code style={{background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px'}}>{walletState.account}</code></div>
          <div>2. 🚰 访问MONAD官方水龙头获取测试币</div>
          <div>3. ⏰ 等待1-2分钟后点击"刷新余额"</div>
          <div>4. 🎮 余额充足后即可开始游戏！</div>
        </div>
      </div>
    </div>
  );

  const renderGameEnd = () => (
    <div style={{ textAlign: 'center', padding: '50px 0' }}>
      <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🏁</div>
      <h2 style={{ color: '#FFD700', marginBottom: '20px' }}>游戏轮次结束！</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
        最终排名和奖励正在计算中...
      </p>
      
      {playerState.rank > 0 && playerState.rank <= 2500 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.2), rgba(46, 204, 113, 0.1))',
          padding: '30px',
          borderRadius: '20px',
          border: '2px solid #27AE60',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <h3 style={{ color: '#27AE60', marginBottom: '15px' }}>🎉 恭喜获得奖励！</h3>
          <div style={{ fontSize: '2rem', color: '#FFD700', fontWeight: 'bold', marginBottom: '10px' }}>
            #{playerState.rank}
          </div>
          <div style={{ fontSize: '1.5rem', color: '#FFD700', marginBottom: '15px' }}>
            {playerState.estimatedReward.toLocaleString()} Fomalhaut
          </div>
          <div style={{ fontSize: '1rem', opacity: 0.9 }}>
            最终得分: {playerState.currentScore}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      minHeight: '100vh',
      padding: '20px',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* 通知系统 */}
        {uiState.notification && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: uiState.notification.type === 'error' ? 
              'linear-gradient(135deg, #E74C3C, #C0392B)' :
              uiState.notification.type === 'warning' ?
              'linear-gradient(135deg, #F39C12, #E67E22)' :
              'linear-gradient(135deg, #27AE60, #2ECC71)',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxWidth: '400px',
            animation: 'slideInRight 0.5s ease'
          }}>
            {uiState.notification.message}
          </div>
        )}

        {/* 错误显示 */}
        {uiState.error && (
          <div style={{
            background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>❌ {uiState.error}</span>
            <button
              onClick={() => setUiState(prev => ({ ...prev, error: null }))}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '5px 10px',
                borderRadius: '15px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 游戏头部 */}
        {gameState.isInitialized && renderGameHeader()}
        
        {/* 主要游戏内容 */}
        {renderGameContent()}
        
        {/* 合约信息显示 */}
        {gameState.isInitialized && renderContractInfo()}
      </div>

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes gradientAnimation {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default UltimateMonadApp;
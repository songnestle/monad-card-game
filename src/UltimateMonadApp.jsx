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
    // 基于真实市场价格的更准确基础价格
    const realPrices = {
      'BTC': 45000 + Math.random() * 20000,
      'ETH': 2500 + Math.random() * 1500,
      'USDT': 0.998 + Math.random() * 0.004,
      'BNB': 240 + Math.random() * 60,
      'SOL': 40 + Math.random() * 20,
      'USDC': 0.999 + Math.random() * 0.002,
      'XRP': 0.45 + Math.random() * 0.25,
      'TON': 2.10 + Math.random() * 0.90,
      'DOGE': 0.08 + Math.random() * 0.04,
      'ADA': 0.35 + Math.random() * 0.20,
      'AVAX': 25 + Math.random() * 15,
      'SHIB': 0.000012 + Math.random() * 0.000008,
      'DOT': 5.5 + Math.random() * 3.5,
      'LINK': 12 + Math.random() * 8,
      'TRX': 0.09 + Math.random() * 0.05,
      'MATIC': 0.85 + Math.random() * 0.45,
      'ICP': 8 + Math.random() * 6,
      'UNI': 6.5 + Math.random() * 4.5,
      'LTC': 85 + Math.random() * 35,
      'NEAR': 2.8 + Math.random() * 1.7
    };
    
    // 如果有具体价格就用具体价格，否则按稀有度分类
    if (realPrices[card.symbol]) {
      return realPrices[card.symbol];
    }
    
    const rarityPrices = {
      'rare': 50 + Math.random() * 450,
      'uncommon': 2 + Math.random() * 18,
      'common': 0.1 + Math.random() * 1.9
    };
    
    return rarityPrices[card.rarity] || 1;
  }

  async fetchRealPrices() {
    try {
      // 模拟实时价格更新 - 在生产环境中替换为真实API
      TOP_30_CRYPTO_CARDS.forEach(card => {
        const current = this.prices.get(card.symbol);
        if (!current) return;

        // 模拟真实市场波动
        const volatility = this.getVolatility(card.rarity);
        const trendInfluence = current.trend === 'up' ? 0.3 : -0.3;
        const randomChange = (Math.random() - 0.5) * 2;
        const totalChange = (randomChange + trendInfluence) * volatility;
        
        const newPrice = Math.max(current.current * (1 + totalChange), current.dayStart * 0.1);
        const changePercent = ((newPrice - current.dayStart) / current.dayStart) * 100;
        const monadScore = Math.round(changePercent * 100);

        this.prices.set(card.symbol, {
          ...current,
          current: newPrice,
          changePercent: changePercent,
          monadScore: monadScore,
          lastUpdate: Date.now()
        });

        // 记录历史
        const history = this.priceHistory.get(card.symbol) || [];
        history.push({ price: newPrice, time: Date.now(), score: monadScore });
        if (history.length > 100) history.shift(); // 保持最近100个数据点
        this.priceHistory.set(card.symbol, history);

        // 随机改变趋势
        if (Math.random() < 0.05) {
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
    const volatilityMap = {
      'rare': 0.025, // 2.5% 波动 - 大币种相对稳定
      'uncommon': 0.065, // 6.5% 波动 - 中等币种
      'common': 0.12 // 12% 波动 - 小币种波动更大
    };
    return volatilityMap[rarity] || 0.05;
  }

  startPriceUpdates() {
    this.updateInterval = setInterval(() => {
      this.fetchRealPrices();
    }, 5000); // 每5秒更新一次
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
        hasMinimumBalance: monadBalance >= 0.1
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
    
    // 根据余额情况决定游戏阶段
    if (balanceCheck.hasMinimumBalance) {
      setGameState(prev => ({ ...prev, currentPhase: 'selection' }));
      
      // 显示成功通知
      setUiState(prev => ({
        ...prev,
        notification: {
          type: 'success',
          message: `🎉 钱包连接成功！欢迎来到终极Monad！`,
          duration: 3000
        }
      }));
    } else {
      setGameState(prev => ({ ...prev, currentPhase: 'insufficient_balance' }));
      
      // 显示余额不足通知
      setUiState(prev => ({
        ...prev,
        notification: {
          type: 'warning',
          message: `⚠️ 需要至少0.1 MONAD测试币才能参与游戏！当前余额: ${parseFloat(balanceCheck.monadBalance).toFixed(4)} MONAD`,
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
      // 模拟区块链交易
      await new Promise(resolve => setTimeout(resolve, 2000));

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
          message: '🃏 手牌提交成功！开始实时计分...',
          duration: 3000
        }
      }));

    } catch (error) {
      setUiState(prev => ({
        ...prev,
        loading: false,
        error: '手牌提交失败: ' + error.message
      }));
    }
  }, [playerState.selectedHand, walletState.account, leaderboard]);

  // 通知系统
  useEffect(() => {
    if (uiState.notification) {
      const timer = setTimeout(() => {
        setUiState(prev => ({ ...prev, notification: null }));
      }, uiState.notification.duration || 3000);
      
      return () => clearTimeout(timer);
    }
  }, [uiState.notification]);

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
              {walletState.hasMinimumBalance ? '✅ 可参与' : '❌ 需要0.1+'}
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
                    ${priceData.current.toFixed(4)}
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
                    ${priceData.current.toFixed(4)}
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
                  ${priceData.current.toFixed(4)}
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
/**
 * BullrunConfig.js - Bullrun卡牌游戏配置
 * 
 * 基于Bullrun游戏机制的完整配置系统：
 * - 游戏规则和时间设置
 * - 支持的加密货币和默认价格
 * - 评分和稀有度系统
 * - API配置和性能优化
 */

// 游戏核心配置
export const CONFIG = {
  // === 游戏时间设置 ===
  GAME: {
    ROUND_DURATION: 24 * 60 * 60 * 1000, // 24小时 = 1轮游戏
    ROUND_START_UTC: 0, // 每日00:00 UTC开始
    HAND_SIZE: 5, // 每手5张卡牌
    MAX_DUPLICATE_PENALTY: -200, // 重复卡牌最大惩罚
    PARTICIPATION_REQUIRED_BALANCE: 0.01, // 最小参与余额 (MON)
    STARTER_PACK_SIZE: 8, // 新手包数量
    DAILY_CLAIM_LIMIT: 1 // 每日最多领取次数
  },

  // === 价格API配置 ===
  COINGECKO_API_BASE: 'https://api.coingecko.com/api/v3',
  PRICE_UPDATE_INTERVAL: 60 * 1000, // 60秒更新一次价格
  PRICE_CACHE_DURATION: 5 * 60 * 1000, // 5分钟缓存过期
  PRICE_UPDATE_TIMEOUT: 10000, // 10秒API超时
  MAX_RETRY_ATTEMPTS: 3, // 最大重试次数

  // === 评分系统 ===
  SCORING: {
    PRICE_CHANGE_MULTIPLIER: 100, // 1% = 100分
    VOLATILITY_BONUS_THRESHOLD: 10, // 超过10%波动获得加成
    VOLATILITY_BONUS_MULTIPLIER: 5, // 波动性加成倍数
    TREND_CONSISTENCY_BONUS: 50, // 趋势一致性加成
    CHANGE_24H_MULTIPLIER: 20, // 24小时变化倍数（高波动）
    CHANGE_24H_LOW_MULTIPLIER: 10, // 24小时变化倍数（低波动）
    HIGH_VOLATILITY_THRESHOLD: 5 // 高波动性阈值(%)
  },

  // === 稀有度系统 ===
  RARITY: {
    LEGENDARY: { 
      level: 5, 
      name: 'Legendary', 
      color: '#FFD700', 
      minMarketCap: 100000000000, // >100B
      packProbability: 0.01 // 1%
    },
    EPIC: { 
      level: 4, 
      name: 'Epic', 
      color: '#9B59B6', 
      minMarketCap: 10000000000, // >10B
      packProbability: 0.05 // 5%
    },
    RARE: { 
      level: 3, 
      name: 'Rare', 
      color: '#3498DB', 
      minMarketCap: 1000000000, // >1B
      packProbability: 0.15 // 15%
    },
    UNCOMMON: { 
      level: 2, 
      name: 'Uncommon', 
      color: '#2ECC71', 
      minMarketCap: 100000000, // >100M
      packProbability: 0.29 // 29%
    },
    COMMON: { 
      level: 1, 
      name: 'Common', 
      color: '#95A5A6', 
      minMarketCap: 0, // <100M
      packProbability: 0.50 // 50%
    }
  },

  // === 奖励分配 (幂次定律) ===
  PRIZE_DISTRIBUTION: {
    // 前10名的奖励分配比例
    POWER_LAW_EXPONENT: 1.5, // 幂次指数
    TOP_10_SHARE: 0.80, // 前10名占总奖池80%
    PARTICIPATION_REWARD_SHARE: 0.20, // 参与奖占20%
    MINIMUM_PRIZE_POOL: 100, // 最小奖池 (MON)
    WINNER_BONUS_MULTIPLIER: 2.0 // 冠军额外倍数
  },

  // === 支持的加密货币 ===
  SUPPORTED_COINS: [
    // Tier 1: 顶级加密货币 (Legendary)
    {
      symbol: 'bitcoin',
      name: 'Bitcoin',
      emoji: '₿',
      color: '#F7931A',
      defaultPrice: 45000,
      tier: 5
    },
    {
      symbol: 'ethereum',
      name: 'Ethereum',
      emoji: '⟠',
      color: '#627EEA',
      defaultPrice: 3000,
      tier: 5
    },

    // Tier 2: 主流币种 (Epic)
    {
      symbol: 'binancecoin',
      name: 'BNB',
      emoji: '🔶',
      color: '#F3BA2F',
      defaultPrice: 350,
      tier: 4
    },
    {
      symbol: 'solana',
      name: 'Solana',
      emoji: '☀️',
      color: '#9945FF',
      defaultPrice: 100,
      tier: 4
    },
    {
      symbol: 'cardano',
      name: 'Cardano',
      emoji: '🔵',
      color: '#0033AD',
      defaultPrice: 0.5,
      tier: 4
    },
    {
      symbol: 'avalanche-2',
      name: 'Avalanche',
      emoji: '🔺',
      color: '#E84142',
      defaultPrice: 25,
      tier: 4
    },

    // Tier 3: 热门Altcoins (Rare)
    {
      symbol: 'polygon',
      name: 'Polygon',
      emoji: '🟣',
      color: '#8247E5',
      defaultPrice: 0.8,
      tier: 3
    },
    {
      symbol: 'chainlink',
      name: 'Chainlink',
      emoji: '🔗',
      color: '#375BD2',
      defaultPrice: 15,
      tier: 3
    },
    {
      symbol: 'polkadot',
      name: 'Polkadot',
      emoji: '⚫',
      color: '#E6007A',
      defaultPrice: 6,
      tier: 3
    },
    {
      symbol: 'uniswap',
      name: 'Uniswap',
      emoji: '🦄',
      color: '#FF007A',
      defaultPrice: 8,
      tier: 3
    },
    {
      symbol: 'cosmos',
      name: 'Cosmos',
      emoji: '⚛️',
      color: '#2E3148',
      defaultPrice: 12,
      tier: 3
    },
    {
      symbol: 'near',
      name: 'NEAR Protocol',
      emoji: '🔮',
      color: '#00C08B',
      defaultPrice: 2,
      tier: 3
    },

    // Tier 4: 新兴项目 (Uncommon)
    {
      symbol: 'the-sandbox',
      name: 'Sandbox',
      emoji: '🏖️',
      color: '#00D4FF',
      defaultPrice: 0.4,
      tier: 2
    },
    {
      symbol: 'axie-infinity',
      name: 'Axie Infinity',
      emoji: '🐹',
      color: '#0055D4',
      defaultPrice: 6,
      tier: 2
    },
    {
      symbol: 'decentraland',
      name: 'Decentraland',
      emoji: '🏢',
      color: '#FF2D55',
      defaultPrice: 0.6,
      tier: 2
    },
    {
      symbol: 'enjincoin',
      name: 'Enjin Coin',
      emoji: '⚡',
      color: '#624DBF',
      defaultPrice: 0.3,
      tier: 2
    },
    {
      symbol: 'gala',
      name: 'Gala',
      emoji: '🎮',
      color: '#FF7B00',
      defaultPrice: 0.05,
      tier: 2
    },
    {
      symbol: 'immutable-x',
      name: 'Immutable X',
      emoji: '💎',
      color: '#16ACE3',
      defaultPrice: 1.2,
      tier: 2
    },

    // Tier 5: 小众/新币 (Common)
    {
      symbol: 'stepn',
      name: 'STEPN',
      emoji: '👟',
      color: '#000000',
      defaultPrice: 0.02,
      tier: 1
    },
    {
      symbol: 'alien-worlds',
      name: 'Alien Worlds',
      emoji: '👽',
      color: '#3ECBFF',
      defaultPrice: 0.01,
      tier: 1
    },
    {
      symbol: 'splinterlands',
      name: 'Splinterlands',
      emoji: '⚔️',
      color: '#AD8B00',
      defaultPrice: 0.003,
      tier: 1
    },
    {
      symbol: 'gods-unchained',
      name: 'Gods Unchained',
      emoji: '🃏',
      color: '#4C4C4C',
      defaultPrice: 0.15,
      tier: 1
    },
    {
      symbol: 'derace',
      name: 'DeRace',
      emoji: '🏇',
      color: '#7B68EE',
      defaultPrice: 0.08,
      tier: 1
    },
    {
      symbol: 'myneighboralice',
      name: 'My Neighbor Alice',
      emoji: '🐰',
      color: '#FF69B4',
      defaultPrice: 1.5,
      tier: 1
    }
  ],

  // === UI 配置 ===
  UI: {
    LEADERBOARD_SIZE: 50, // 排行榜显示数量
    RECENT_GAMES_SIZE: 10, // 最近游戏记录数量
    NOTIFICATION_DURATION: 5000, // 通知持续时间
    ANIMATION_DURATION: 300, // 动画持续时间
    CARD_FLIP_DURATION: 600, // 卡牌翻转动画
    SCORE_UPDATE_INTERVAL: 2000, // 分数更新间隔
    AUTO_REFRESH_LEADERBOARD: true, // 自动刷新排行榜
    SHOW_PRICE_CHARTS: true, // 显示价格图表
    ENABLE_SOUND_EFFECTS: true, // 启用音效
    THEME: 'cyberpunk' // 主题风格
  },

  // === 性能优化 ===
  PERFORMANCE: {
    LAZY_LOAD_CARDS: true, // 懒加载卡牌
    VIRTUAL_SCROLLING: true, // 虚拟滚动
    IMAGE_COMPRESSION: true, // 图像压缩
    CACHE_STRATEGIES: 'aggressive', // 缓存策略
    DEBOUNCE_INTERVAL: 300, // 防抖间隔
    THROTTLE_INTERVAL: 1000, // 节流间隔
    MAX_CONCURRENT_REQUESTS: 3, // 最大并发请求
    REQUEST_TIMEOUT: 15000 // 请求超时
  },

  // === 错误处理 ===
  ERROR_HANDLING: {
    RETRY_DELAY: 2000, // 重试延迟
    EXPONENTIAL_BACKOFF: true, // 指数退避
    FALLBACK_MODE_DURATION: 300000, // 降级模式持续时间 (5分钟)
    ERROR_REPORTING: true, // 错误报告
    CRASH_RECOVERY: true, // 崩溃恢复
    USER_FRIENDLY_MESSAGES: true // 用户友好错误信息
  },

  // === 开发者配置 ===
  DEV: {
    ENABLE_DEBUG_LOGS: true, // 调试日志
    SHOW_PERFORMANCE_METRICS: true, // 性能指标
    MOCK_API_RESPONSES: false, // 模拟API响应
    SKIP_NETWORK_VALIDATION: false, // 跳过网络验证
    ENABLE_HOT_RELOAD: true, // 热重载
    TEST_MODE: false // 测试模式
  }
}

// 游戏状态枚举
export const GAME_STATUS = {
  WAITING: 'waiting', // 等待开始
  ACTIVE: 'active', // 进行中
  ENDED: 'ended', // 已结束
  CALCULATING: 'calculating', // 计算中
  PAUSED: 'paused' // 暂停
}

// 卡牌类型枚举
export const CARD_TYPES = {
  CRYPTO: 'crypto', // 加密货币
  SPECIAL: 'special', // 特殊卡牌
  BONUS: 'bonus' // 奖励卡牌
}

// 事件类型枚举
export const EVENT_TYPES = {
  GAME_START: 'gameStart',
  GAME_END: 'gameEnd',
  PRICE_UPDATE: 'priceUpdate',
  SCORE_UPDATE: 'scoreUpdate',
  HAND_CREATED: 'handCreated',
  PRIZE_DISTRIBUTED: 'prizeDistributed',
  ERROR_OCCURRED: 'errorOccurred'
}

// 时间工具函数
export const TimeUtils = {
  // 获取当前游戏轮次开始时间
  getCurrentRoundStart() {
    const now = new Date()
    const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
    utcTime.setUTCHours(CONFIG.GAME.ROUND_START_UTC, 0, 0, 0)
    
    // 如果当前时间小于今天的开始时间，则返回昨天的开始时间
    if (Date.now() < utcTime.getTime()) {
      utcTime.setUTCDate(utcTime.getUTCDate() - 1)
    }
    
    return utcTime.getTime()
  },

  // 获取下一轮游戏开始时间
  getNextRoundStart() {
    const currentStart = this.getCurrentRoundStart()
    return currentStart + CONFIG.GAME.ROUND_DURATION
  },

  // 获取当前轮次剩余时间
  getRemainingTime() {
    const nextStart = this.getNextRoundStart()
    return Math.max(0, nextStart - Date.now())
  },

  // 格式化剩余时间
  formatRemainingTime(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  },

  // 检查是否在游戏时间内
  isGameActive() {
    const remaining = this.getRemainingTime()
    return remaining > 0 && remaining < CONFIG.GAME.ROUND_DURATION
  }
}

// 验证配置完整性
export function validateConfig() {
  const errors = []

  // 检查必需的环境变量
  if (!CONFIG.COINGECKO_API_BASE) {
    errors.push('CoinGecko API base URL is required')
  }

  // 检查游戏时间配置
  if (CONFIG.GAME.ROUND_DURATION <= 0) {
    errors.push('Game round duration must be positive')
  }

  // 检查支持的币种
  if (!CONFIG.SUPPORTED_COINS || CONFIG.SUPPORTED_COINS.length === 0) {
    errors.push('At least one supported coin is required')
  }

  // 检查稀有度概率总和
  const totalProbability = Object.values(CONFIG.RARITY)
    .reduce((sum, rarity) => sum + rarity.packProbability, 0)
  
  if (Math.abs(totalProbability - 1.0) > 0.01) {
    errors.push(`Rarity probabilities sum to ${totalProbability}, should be 1.0`)
  }

  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors)
    return false
  }

  console.log('✅ Configuration validation passed')
  return true
}

// 初始化时验证配置
if (typeof window !== 'undefined') {
  validateConfig()
}

export default CONFIG
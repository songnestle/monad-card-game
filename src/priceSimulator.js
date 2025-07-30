// 价格变化模拟器
import { cryptoCards } from './cryptoCards.js'

export class PriceSimulator {
  constructor() {
    this.currentPrices = {}
    this.priceHistory = {}
    this.initializePrices()
  }

  // 初始化价格（基于历史市值）
  initializePrices() {
    cryptoCards.forEach(card => {
      this.currentPrices[card.id] = this.getInitialPrice(card)
      this.priceHistory[card.id] = []
    })
  }

  // 获取初始价格（美元）
  getInitialPrice(card) {
    const priceMap = {
      // 神话级 - Top 5
      1: 65000,  // BTC
      2: 3500,   // ETH  
      3: 1.00,   // USDT
      4: 600,    // BNB
      5: 150,    // SOL

      // 传说级 - 6-10
      6: 1.00,   // USDC
      7: 0.50,   // XRP
      8: 0.08,   // DOGE
      9: 6.50,   // TON
      10: 0.45,  // ADA

      // 史诗级 - 11-20
      11: 35,    // AVAX
      12: 3500,  // WETH
      13: 0.000015, // SHIB
      14: 7.5,   // DOT
      15: 12,    // LINK
      16: 0.08,  // TRX
      17: 65000, // WBTC
      18: 450,   // BCH
      19: 8,     // UNI
      20: 5.5,   // NEAR

      // 稀有级 - 21-25
      21: 0.85,  // MATIC
      22: 85,    // LTC
      23: 9,     // ICP
      24: 8.5,   // APT
      25: 1.00,  // DAI

      // 普通级 - 26-30
      26: 35,    // ETC
      27: 6.5,   // ATOM
      28: 0.12,  // XLM
      29: 160,   // XMR
      30: 50     // OKB
    }
    
    return priceMap[card.id] || 1.0
  }

  // 生成随机价格变化（基点）
  generatePriceChange(cardId) {
    const card = cryptoCards.find(c => c.id === cardId)
    if (!card) return 0

    // 不同稀有度的波动性不同
    const volatilityMap = {
      1: 150,  // 普通币种 - 高波动
      2: 120,  // 稀有币种 - 中高波动  
      3: 100,  // 史诗币种 - 中等波动
      4: 80,   // 传说币种 - 中低波动
      5: 60    // 神话币种（主流币）- 低波动
    }

    const baseVolatility = volatilityMap[card.rarity] || 100
    
    // 生成随机变化（正态分布）
    const change = this.normalRandom() * baseVolatility
    
    // 限制极端变化
    return Math.max(-500, Math.min(500, Math.round(change)))
  }

  // 正态分布随机数
  normalRandom() {
    let u = 0, v = 0
    while(u === 0) u = Math.random() // 避免0
    while(v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  // 更新所有价格
  updateAllPrices() {
    const priceChanges = []
    
    cryptoCards.forEach(card => {
      const change = this.generatePriceChange(card.id)
      const oldPrice = this.currentPrices[card.id]
      const newPrice = oldPrice * (1 + change / 10000) // 基点转换为百分比
      
      this.currentPrices[card.id] = Math.max(0.001, newPrice) // 防止负价格
      
      // 记录历史
      this.priceHistory[card.id].push({
        timestamp: Date.now(),
        price: newPrice,
        change: change
      })
      
      // 只保留最近100条记录
      if (this.priceHistory[card.id].length > 100) {
        this.priceHistory[card.id].shift()
      }
      
      priceChanges.push({
        cardId: card.id,
        symbol: card.symbol,
        change: change,
        oldPrice: oldPrice,
        newPrice: newPrice
      })
    })
    
    return priceChanges
  }

  // 获取当前价格
  getCurrentPrice(cardId) {
    return this.currentPrices[cardId] || 1.0
  }

  // 获取价格历史
  getPriceHistory(cardId) {
    return this.priceHistory[cardId] || []
  }

  // 计算24小时变化
  get24HourChange(cardId) {
    const history = this.priceHistory[cardId]
    if (!history || history.length < 2) return 0
    
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    
    // 找到24小时前的价格
    let oldPrice = history[0].price
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].timestamp <= dayAgo) {
        oldPrice = history[i].price
        break
      }
    }
    
    const currentPrice = this.currentPrices[cardId]
    return Math.round(((currentPrice - oldPrice) / oldPrice) * 10000) // 转换为基点
  }

  // 获取市场总览
  getMarketOverview() {
    let totalMarketCap = 0
    let gainers = 0
    let losers = 0
    
    cryptoCards.forEach(card => {
      const change = this.get24HourChange(card.id)
      if (change > 0) gainers++
      else if (change < 0) losers++
      
      // 简化的市值计算
      totalMarketCap += this.currentPrices[card.id] * card.rarity * 1000000
    })
    
    return {
      totalMarketCap,
      gainers,
      losers,
      neutral: cryptoCards.length - gainers - losers
    }
  }
}
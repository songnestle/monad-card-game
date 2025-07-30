// 价格更新器 - 模拟真实的加密货币价格API
import { cryptoCards } from './cryptoCards.js'

export class PriceUpdater {
  constructor() {
    this.updateInterval = null
    this.subscribers = []
  }

  // 订阅价格更新
  subscribe(callback) {
    this.subscribers.push(callback)
  }

  // 取消订阅
  unsubscribe(callback) {
    this.subscribers = this.subscribers.filter(cb => cb !== callback)
  }

  // 通知所有订阅者
  notify(priceData) {
    this.subscribers.forEach(callback => callback(priceData))
  }

  // 开始价格更新
  startUpdating(intervalMs = 30000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    this.updateInterval = setInterval(() => {
      const priceUpdates = this.generatePriceUpdates()
      this.notify(priceUpdates)
    }, intervalMs)

    // 立即发送一次更新
    const initialUpdates = this.generatePriceUpdates()
    this.notify(initialUpdates)
  }

  // 停止价格更新
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  // 生成价格更新数据
  generatePriceUpdates() {
    const updates = []
    
    cryptoCards.forEach(card => {
      // 模拟不同的市场情况
      const marketCondition = this.getMarketCondition()
      const volatility = this.getVolatility(card.rarity)
      const change = this.generatePriceChange(volatility, marketCondition)
      
      updates.push({
        cardId: card.id,
        symbol: card.symbol,
        name: card.name,
        priceChange: change, // 基点变化
        timestamp: Date.now(),
        volume: this.generateVolume(card.rarity),
        marketCap: this.generateMarketCap(card.rarity)
      })
    })

    return updates
  }

  // 获取市场状况
  getMarketCondition() {
    const conditions = ['bull', 'bear', 'sideways', 'volatile']
    const probabilities = [0.3, 0.2, 0.4, 0.1] // 牛市30%, 熊市20%, 横盘40%, 高波动10%
    
    const rand = Math.random()
    let cumulative = 0
    
    for (let i = 0; i < conditions.length; i++) {
      cumulative += probabilities[i]
      if (rand <= cumulative) {
        return conditions[i]
      }
    }
    
    return 'sideways'
  }

  // 根据稀有度获取波动性
  getVolatility(rarity) {
    const volatilityMap = {
      1: 200, // 普通币种 - 高波动 
      2: 150, // 稀有币种 - 中高波动
      3: 120, // 史诗币种 - 中等波动
      4: 80,  // 传说币种 - 中低波动 
      5: 50   // 神话币种（主流币）- 低波动
    }
    return volatilityMap[rarity] || 100
  }

  // 生成价格变化
  generatePriceChange(baseVolatility, marketCondition) {
    // 根据市场状况调整
    let volatilityMultiplier = 1
    let trendBias = 0

    switch(marketCondition) {
      case 'bull':
        trendBias = 20 // 牛市偏向上涨
        volatilityMultiplier = 0.8
        break
      case 'bear':
        trendBias = -20 // 熊市偏向下跌
        volatilityMultiplier = 0.8
        break
      case 'volatile':
        volatilityMultiplier = 2.0 // 高波动市场
        break
      case 'sideways':
      default:
        volatilityMultiplier = 0.6 // 横盘市场波动较小
        break
    }

    // 生成基础随机变化
    const randomChange = this.normalRandom() * baseVolatility * volatilityMultiplier
    
    // 加上趋势偏向
    const finalChange = randomChange + trendBias
    
    // 限制极端变化 (-10% 到 +10%)
    return Math.max(-1000, Math.min(1000, Math.round(finalChange)))
  }

  // 正态分布随机数
  normalRandom() {
    let u = 0, v = 0
    while(u === 0) u = Math.random()
    while(v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  // 生成成交量（模拟）
  generateVolume(rarity) {
    const baseVolume = rarity * 1000000
    const randomFactor = 0.5 + Math.random() * 1.5 // 0.5x 到 2x
    return Math.round(baseVolume * randomFactor)
  }

  // 生成市值（模拟）
  generateMarketCap(rarity) {
    const baseMarketCap = rarity * 10000000000 // 100亿基数
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8x 到 1.2x
    return Math.round(baseMarketCap * randomFactor)
  }

  // 获取热门币种变化
  getTopMovers(priceUpdates, count = 5) {
    const sorted = [...priceUpdates].sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange))
    return sorted.slice(0, count)
  }

  // 获取涨幅榜
  getTopGainers(priceUpdates, count = 5) {
    const gainers = priceUpdates.filter(update => update.priceChange > 0)
    return gainers.sort((a, b) => b.priceChange - a.priceChange).slice(0, count)
  }

  // 获取跌幅榜
  getTopLosers(priceUpdates, count = 5) {
    const losers = priceUpdates.filter(update => update.priceChange < 0)
    return losers.sort((a, b) => a.priceChange - b.priceChange).slice(0, count)
  }
}
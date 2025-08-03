/**
 * PriceService.js - 实时价格数据和评分系统
 * 
 * 基于Bullrun游戏机制：
 * - 实时价格获取和缓存
 * - 价格变化评分计算
 * - 市值排名和稀有度分级
 * - 错误恢复和降级策略
 */

import { CONFIG } from '../config/BullrunConfig.js'

class PriceService {
  constructor() {
    this.cache = new Map()
    this.isUpdating = false
    this.updateInterval = null
    this.failureCount = 0
    this.lastUpdateTime = 0
    this.fallbackPrices = new Map()
    this.listeners = new Set()
  }

  // 初始化价格服务
  async initialize() {
    try {
      console.log('🚀 初始化价格服务...')
      
      // 加载初始价格数据
      await this.fetchAllPrices()
      
      // 启动定期更新
      this.startPeriodicUpdates()
      
      console.log('✅ 价格服务初始化成功')
      return true
    } catch (error) {
      console.error('❌ 价格服务初始化失败:', error)
      this.loadFallbackPrices()
      return false
    }
  }

  // 获取所有支持的加密货币价格
  async fetchAllPrices() {
    const symbols = CONFIG.SUPPORTED_COINS.map(coin => coin.symbol.toLowerCase()).join(',')
    const url = `${CONFIG.COINGECKO_API_BASE}/simple/price?ids=${symbols}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`

    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(CONFIG.PRICE_UPDATE_TIMEOUT)
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`)
      }

      const data = await response.json()
      this.processPriceData(data)
      
      this.lastUpdateTime = Date.now()
      this.failureCount = 0
      
      // 通知监听器
      this.notifyListeners('priceUpdate', { data, timestamp: this.lastUpdateTime })
      
      return data
    } catch (error) {
      this.failureCount++
      console.error(`价格获取失败 (${this.failureCount}/${CONFIG.MAX_RETRY_ATTEMPTS}):`, error.message)
      
      if (this.failureCount >= CONFIG.MAX_RETRY_ATTEMPTS) {
        this.loadFallbackPrices()
      }
      
      throw error
    }
  }

  // 处理价格数据
  processPriceData(data) {
    const now = Date.now()
    
    for (const [coinId, priceInfo] of Object.entries(data)) {
      const coinConfig = CONFIG.SUPPORTED_COINS.find(c => c.symbol.toLowerCase() === coinId)
      if (!coinConfig) continue

      const currentPrice = priceInfo.usd || 0
      const change24h = priceInfo.usd_24h_change || 0
      const marketCap = priceInfo.usd_market_cap || 0
      const volume24h = priceInfo.usd_24h_vol || 0

      // 获取历史价格用于计算分数
      const previousData = this.cache.get(coinConfig.symbol)
      const previousPrice = previousData?.price || currentPrice
      
      // 计算价格变化百分比
      const priceChangePercent = previousPrice > 0 ? 
        ((currentPrice - previousPrice) / previousPrice) * 100 : 0

      // 计算Bullrun评分 (1% = ±100分)
      const bullrunScore = this.calculateBullrunScore(priceChangePercent, change24h)
      
      // 确定稀有度等级
      const rarity = this.calculateRarity(marketCap)

      const processedData = {
        symbol: coinConfig.symbol,
        name: coinConfig.name,
        price: currentPrice,
        previousPrice,
        change24h,
        priceChangePercent,
        marketCap,
        volume24h,
        bullrunScore,
        rarity,
        emoji: coinConfig.emoji,
        color: coinConfig.color,
        timestamp: now,
        isStale: false
      }

      this.cache.set(coinConfig.symbol, processedData)
      
      // 更新后备价格
      this.fallbackPrices.set(coinConfig.symbol, {
        price: currentPrice,
        change24h,
        timestamp: now
      })
    }
  }

  // 计算Bullrun评分系统
  calculateBullrunScore(priceChangePercent, change24h) {
    // 基础分数: 1% 价格变化 = ±100分
    let baseScore = priceChangePercent * 100

    // 24小时变化加成/惩罚
    const change24hBonus = Math.abs(change24h) > 5 ? change24h * 20 : change24h * 10

    // 波动性加成（高波动性获得额外分数）
    const volatilityBonus = Math.abs(priceChangePercent) > 10 ? 
      Math.abs(priceChangePercent) * 5 : 0

    // 趋势持续性加成
    const trendBonus = (priceChangePercent > 0 && change24h > 0) || 
                      (priceChangePercent < 0 && change24h < 0) ? 50 : 0

    const totalScore = baseScore + change24hBonus + volatilityBonus + trendBonus

    return {
      total: Math.round(totalScore),
      breakdown: {
        base: Math.round(baseScore),
        change24h: Math.round(change24hBonus),
        volatility: Math.round(volatilityBonus),
        trend: trendBonus
      }
    }
  }

  // 基于市值计算稀有度
  calculateRarity(marketCap) {
    if (marketCap >= 100000000000) return { level: 5, name: 'Legendary', color: '#FFD700' } // >100B
    if (marketCap >= 10000000000) return { level: 4, name: 'Epic', color: '#9B59B6' }        // >10B
    if (marketCap >= 1000000000) return { level: 3, name: 'Rare', color: '#3498DB' }         // >1B
    if (marketCap >= 100000000) return { level: 2, name: 'Uncommon', color: '#2ECC71' }      // >100M
    return { level: 1, name: 'Common', color: '#95A5A6' }                                     // <100M
  }

  // 获取单个币种价格信息
  getPriceInfo(symbol) {
    const data = this.cache.get(symbol)
    if (!data) {
      return this.getFallbackPrice(symbol)
    }

    // 检查数据是否过期
    const isStale = Date.now() - data.timestamp > CONFIG.PRICE_CACHE_DURATION
    return { ...data, isStale }
  }

  // 获取所有价格信息
  getAllPrices() {
    const results = {}
    
    for (const coin of CONFIG.SUPPORTED_COINS) {
      results[coin.symbol] = this.getPriceInfo(coin.symbol)
    }
    
    return {
      data: results,
      lastUpdate: this.lastUpdateTime,
      isUpdating: this.isUpdating,
      staleCoin: Object.values(results).some(price => price.isStale)
    }
  }

  // 获取排行榜数据
  getLeaderboard() {
    const allPrices = Object.values(this.getAllPrices().data)
    
    // 按Bullrun分数排序
    const sortedByScore = [...allPrices]
      .filter(price => price.bullrunScore && !price.isStale)
      .sort((a, b) => b.bullrunScore.total - a.bullrunScore.total)

    // 按24小时涨幅排序
    const sortedByChange = [...allPrices]
      .filter(price => price.change24h !== undefined && !price.isStale)
      .sort((a, b) => b.change24h - a.change24h)

    // 按市值排序
    const sortedByMarketCap = [...allPrices]
      .filter(price => price.marketCap && !price.isStale)
      .sort((a, b) => b.marketCap - a.marketCap)

    return {
      byScore: sortedByScore.slice(0, 10),
      byChange: sortedByChange.slice(0, 10),
      byMarketCap: sortedByMarketCap.slice(0, 10),
      timestamp: Date.now()
    }
  }

  // 获取后备价格
  getFallbackPrice(symbol) {
    const fallback = this.fallbackPrices.get(symbol)
    const coinConfig = CONFIG.SUPPORTED_COINS.find(c => c.symbol === symbol)
    
    if (fallback && coinConfig) {
      return {
        symbol,
        name: coinConfig.name,
        price: fallback.price,
        previousPrice: fallback.price,
        change24h: fallback.change24h,
        priceChangePercent: 0,
        marketCap: 0,
        volume24h: 0,
        bullrunScore: { total: 0, breakdown: {} },
        rarity: { level: 1, name: 'Common', color: '#95A5A6' },
        emoji: coinConfig.emoji,
        color: coinConfig.color,
        timestamp: fallback.timestamp,
        isStale: true,
        isFallback: true
      }
    }

    return null
  }

  // 加载后备价格数据
  loadFallbackPrices() {
    console.log('⚠️ 加载后备价格数据')
    
    // 使用配置中的默认价格
    CONFIG.SUPPORTED_COINS.forEach(coin => {
      this.fallbackPrices.set(coin.symbol, {
        price: coin.defaultPrice || 1,
        change24h: 0,
        timestamp: Date.now()
      })
    })

    this.notifyListeners('fallbackMode', { timestamp: Date.now() })
  }

  // 启动定期更新
  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    this.updateInterval = setInterval(async () => {
      if (this.isUpdating) return

      try {
        this.isUpdating = true
        await this.fetchAllPrices()
        console.log('🔄 价格数据更新完成')
      } catch (error) {
        console.error('🔄 定期价格更新失败:', error.message)
      } finally {
        this.isUpdating = false
      }
    }, CONFIG.PRICE_UPDATE_INTERVAL)

    console.log(`⏰ 价格更新间隔: ${CONFIG.PRICE_UPDATE_INTERVAL / 1000}秒`)
  }

  // 停止定期更新
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
      console.log('⏹️ 价格更新已停止')
    }
  }

  // 手动刷新价格
  async refreshPrices() {
    if (this.isUpdating) {
      console.log('⏳ 价格更新正在进行中...')
      return false
    }

    try {
      this.isUpdating = true
      console.log('🔄 手动刷新价格数据...')
      await this.fetchAllPrices()
      console.log('✅ 价格刷新完成')
      return true
    } catch (error) {
      console.error('❌ 手动价格刷新失败:', error.message)
      return false
    } finally {
      this.isUpdating = false
    }
  }

  // 添加事件监听器
  addListener(callback) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  // 通知监听器
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data)
      } catch (error) {
        console.error('价格服务监听器错误:', error)
      }
    })
  }

  // 获取服务状态
  getStatus() {
    return {
      isInitialized: this.cache.size > 0,
      isUpdating: this.isUpdating,
      lastUpdateTime: this.lastUpdateTime,
      failureCount: this.failureCount,
      cacheSize: this.cache.size,
      fallbackMode: this.failureCount >= CONFIG.MAX_RETRY_ATTEMPTS,
      uptime: Date.now() - (this.lastUpdateTime || Date.now())
    }
  }

  // 清理资源
  destroy() {
    this.stopPeriodicUpdates()
    this.cache.clear()
    this.fallbackPrices.clear()
    this.listeners.clear()
    console.log('🧹 价格服务已清理')
  }
}

// 创建单例实例
export const priceService = new PriceService()

// 导出类用于测试
export { PriceService }

export default priceService
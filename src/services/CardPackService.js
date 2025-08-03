/**
 * CardPackService.js - 增强的卡包系统和稀有度机制
 * 
 * 功能特性：
 * - 基于市值的动态稀有度计算
 * - 智能卡包生成算法
 * - 新手保护机制
 * - 稀有度平衡系统
 * - 卡牌收集进度追踪
 */

import { CONFIG } from '../config/BullrunConfig.js'
import { priceService } from './PriceService.js'

class CardPackService {
  constructor() {
    this.packHistory = []
    this.userCollections = new Map() // address -> collection data
    this.rarityBalancer = {
      recentPacks: [],
      lastBalanceCheck: 0
    }
  }

  // 初始化卡包服务
  initialize() {
    console.log('📦 初始化卡包服务...')
    this.loadPackHistory()
    console.log('✅ 卡包服务初始化完成')
  }

  // 生成新手启动包 (保证品质)
  async generateStarterPack(playerAddress) {
    try {
      console.log(`🎁 为玩家 ${playerAddress} 生成新手包...`)

      const pack = {
        id: `starter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'starter',
        playerAddress,
        timestamp: Date.now(),
        cards: [],
        guaranteedRarity: true
      }

      // 新手包保证内容：
      // - 1张 Epic/Legendary (Bitcoin/Ethereum)
      // - 2张 Rare
      // - 3张 Uncommon
      // - 2张 Common

      const allCoins = await this.getAvailableCoins()
      
      // 保证1张顶级卡牌
      const topTierCoins = allCoins.filter(coin => coin.tier >= 4)
      if (topTierCoins.length > 0) {
        const topCard = this.selectRandomCard(topTierCoins)
        pack.cards.push(this.createCardData(topCard, 'starter_guaranteed'))
      }

      // 2张稀有卡牌
      for (let i = 0; i < 2; i++) {
        const rareCoins = allCoins.filter(coin => coin.tier === 3)
        if (rareCoins.length > 0) {
          const rareCard = this.selectRandomCard(rareCoins)
          pack.cards.push(this.createCardData(rareCard, 'starter_rare'))
        }
      }

      // 3张非常见卡牌
      for (let i = 0; i < 3; i++) {
        const uncommonCoins = allCoins.filter(coin => coin.tier === 2)
        if (uncommonCoins.length > 0) {
          const uncommonCard = this.selectRandomCard(uncommonCoins)
          pack.cards.push(this.createCardData(uncommonCard, 'starter_uncommon'))
        }
      }

      // 补充剩余卡位
      while (pack.cards.length < CONFIG.GAME.STARTER_PACK_SIZE) {
        const randomCard = this.selectRandomCard(allCoins)
        pack.cards.push(this.createCardData(randomCard, 'starter_fill'))
      }

      // 记录包历史
      this.recordPackOpening(pack)

      // 更新用户收藏
      this.updateUserCollection(playerAddress, pack.cards)

      console.log(`✅ 新手包生成完成，包含 ${pack.cards.length} 张卡牌`)
      return pack

    } catch (error) {
      console.error('❌ 新手包生成失败:', error)
      throw error
    }
  }

  // 生成常规卡包
  async generateRegularPack(playerAddress, packType = 'standard') {
    try {
      console.log(`📦 为玩家 ${playerAddress} 生成${packType}卡包...`)

      const pack = {
        id: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: packType,
        playerAddress,
        timestamp: Date.now(),
        cards: [],
        rarityBonus: false
      }

      const allCoins = await this.getAvailableCoins()
      const packSize = this.getPackSize(packType)

      // 应用稀有度平衡器
      const adjustedRarities = this.applyRarityBalancing(playerAddress)

      // 生成卡牌
      for (let i = 0; i < packSize; i++) {
        const rarity = this.determineCardRarity(adjustedRarities, i, packSize)
        const eligibleCoins = this.filterCoinsByRarity(allCoins, rarity)
        
        if (eligibleCoins.length > 0) {
          const selectedCoin = this.selectRandomCard(eligibleCoins)
          const cardData = this.createCardData(selectedCoin, `pack_${rarity.name.toLowerCase()}`)
          pack.cards.push(cardData)
        }
      }

      // 检查是否触发稀有度奖励
      pack.rarityBonus = this.checkRarityBonus(pack.cards)

      // 记录包历史
      this.recordPackOpening(pack)

      // 更新稀有度平衡器
      this.updateRarityBalancer(pack)

      // 更新用户收藏
      this.updateUserCollection(playerAddress, pack.cards)

      console.log(`✅ ${packType}卡包生成完成，包含 ${pack.cards.length} 张卡牌`)
      return pack

    } catch (error) {
      console.error('❌ 卡包生成失败:', error)
      throw error
    }
  }

  // 获取可用的加密货币数据
  async getAvailableCoins() {
    const allPrices = priceService.getAllPrices()
    
    return CONFIG.SUPPORTED_COINS.map(coin => {
      const priceInfo = allPrices.data[coin.symbol]
      const dynamicRarity = priceInfo ? 
        this.calculateDynamicRarity(priceInfo.marketCap) : 
        CONFIG.RARITY.COMMON

      return {
        ...coin,
        priceInfo,
        dynamicRarity,
        // 使用动态稀有度或配置的tier
        effectiveRarity: dynamicRarity,
        isStale: priceInfo?.isStale || false
      }
    })
  }

  // 基于市值动态计算稀有度
  calculateDynamicRarity(marketCap) {
    if (!marketCap || marketCap <= 0) {
      return CONFIG.RARITY.COMMON
    }

    // 按照配置的市值阈值确定稀有度
    const rarityLevels = Object.values(CONFIG.RARITY)
      .sort((a, b) => b.minMarketCap - a.minMarketCap)

    for (const rarity of rarityLevels) {
      if (marketCap >= rarity.minMarketCap) {
        return rarity
      }
    }

    return CONFIG.RARITY.COMMON
  }

  // 应用稀有度平衡机制
  applyRarityBalancing(playerAddress) {
    const userCollection = this.getUserCollection(playerAddress)
    const recentPacks = this.rarityBalancer.recentPacks.slice(-10) // 最近10包

    // 分析玩家最近获得的稀有度分布
    const rarityDistribution = this.analyzeRarityDistribution(recentPacks, userCollection)

    // 计算调整后的稀有度概率
    const adjustedRarities = { ...CONFIG.RARITY }

    // 如果玩家很久没有获得高稀有度卡牌，增加概率
    if (rarityDistribution.droughtLevel > 5) {
      const bonusMultiplier = Math.min(2.0, 1 + rarityDistribution.droughtLevel * 0.1)
      
      adjustedRarities.LEGENDARY.packProbability *= bonusMultiplier
      adjustedRarities.EPIC.packProbability *= bonusMultiplier
      
      // 减少低稀有度概率以平衡
      adjustedRarities.COMMON.packProbability *= 0.8
      adjustedRarities.UNCOMMON.packProbability *= 0.9

      console.log(`🎯 稀有度平衡触发，干旱等级: ${rarityDistribution.droughtLevel}`)
    }

    return adjustedRarities
  }

  // 分析稀有度分布
  analyzeRarityDistribution(recentPacks, userCollection) {
    let droughtLevel = 0
    let lastRareCard = 0

    // 统计最近包中的稀有卡牌
    for (let i = recentPacks.length - 1; i >= 0; i--) {
      const pack = recentPacks[i]
      const hasRareCard = pack.cards.some(card => 
        card.rarity && card.rarity.level >= 3 // Rare或以上
      )

      if (hasRareCard) {
        lastRareCard = recentPacks.length - 1 - i
        break
      }
    }

    droughtLevel = lastRareCard

    // 分析用户整体收藏稀有度
    const collectionRarity = userCollection ? this.calculateCollectionRarity(userCollection) : 0

    return {
      droughtLevel,
      collectionRarity,
      recentPackCount: recentPacks.length
    }
  }

  // 计算收藏稀有度评分
  calculateCollectionRarity(collection) {
    if (!collection.cards || collection.cards.length === 0) {
      return 0
    }

    const rarityScore = collection.cards.reduce((score, card) => {
      return score + (card.rarity?.level || 1)
    }, 0)

    return rarityScore / collection.cards.length
  }

  // 确定卡牌稀有度
  determineCardRarity(adjustedRarities, cardIndex, packSize) {
    // 保证最后一张卡至少是Uncommon（防止全Common包）
    if (cardIndex === packSize - 1) {
      const random = Math.random()
      if (random > 0.5) {
        return this.getRandomRarity(adjustedRarities, 2) // 至少Uncommon
      }
    }

    return this.getRandomRarity(adjustedRarities)
  }

  // 根据概率获取随机稀有度
  getRandomRarity(rarities, minLevel = 1) {
    const eligibleRarities = Object.values(rarities)
      .filter(r => r.level >= minLevel)

    // 归一化概率
    const totalProb = eligibleRarities.reduce((sum, r) => sum + r.packProbability, 0)
    let random = Math.random() * totalProb

    for (const rarity of eligibleRarities.sort((a, b) => b.level - a.level)) {
      random -= rarity.packProbability
      if (random <= 0) {
        return rarity
      }
    }

    // 兜底返回最低稀有度
    return eligibleRarities[eligibleRarities.length - 1]
  }

  // 根据稀有度筛选币种
  filterCoinsByRarity(coins, targetRarity) {
    return coins.filter(coin => {
      // 优先使用动态稀有度，否则使用配置tier
      const coinRarity = coin.effectiveRarity || coin.dynamicRarity
      return coinRarity.level === targetRarity.level
    })
  }

  // 随机选择卡牌
  selectRandomCard(coins) {
    if (!coins || coins.length === 0) {
      throw new Error('没有可用的卡牌')
    }

    // 权重随机选择（避免总是选择第一个）
    const weights = coins.map(coin => {
      // 基于价格波动性和市值的权重
      const volatility = Math.abs(coin.priceInfo?.change24h || 0)
      const marketCapWeight = Math.log10(coin.priceInfo?.marketCap || 1000000)
      
      return 1 + volatility * 0.1 + marketCapWeight * 0.05
    })

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let random = Math.random() * totalWeight

    for (let i = 0; i < coins.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        return coins[i]
      }
    }

    return coins[0] // 兜底
  }

  // 创建卡牌数据
  createCardData(coin, source) {
    const priceInfo = coin.priceInfo || {}
    const rarity = coin.effectiveRarity || coin.dynamicRarity || CONFIG.RARITY.COMMON

    return {
      id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: coin.symbol,
      name: coin.name,
      emoji: coin.emoji,
      color: coin.color,
      rarity,
      tier: coin.tier,
      source, // 记录卡牌来源
      priceInfo: {
        price: priceInfo.price || coin.defaultPrice || 1,
        change24h: priceInfo.change24h || 0,
        marketCap: priceInfo.marketCap || 0,
        timestamp: priceInfo.timestamp || Date.now()
      },
      obtainedAt: Date.now(),
      isStale: priceInfo.isStale || false
    }
  }

  // 检查稀有度奖励
  checkRarityBonus(cards) {
    const rarityLevels = cards.map(card => card.rarity.level)
    const maxRarity = Math.max(...rarityLevels)
    const avgRarity = rarityLevels.reduce((sum, level) => sum + level, 0) / rarityLevels.length

    // 如果包含Legendary或平均稀有度较高，触发奖励
    return maxRarity >= 5 || avgRarity >= 3.5
  }

  // 获取包大小
  getPackSize(packType) {
    switch (packType) {
      case 'starter': return CONFIG.GAME.STARTER_PACK_SIZE
      case 'premium': return 10
      case 'mega': return 15
      default: return 5 // standard
    }
  }

  // 记录开包历史
  recordPackOpening(pack) {
    this.packHistory.unshift({
      id: pack.id,
      type: pack.type,
      playerAddress: pack.playerAddress,
      timestamp: pack.timestamp,
      cardCount: pack.cards.length,
      rarityBreakdown: this.analyzePackRarity(pack.cards),
      rarityBonus: pack.rarityBonus
    })

    // 限制历史记录数量
    if (this.packHistory.length > 1000) {
      this.packHistory = this.packHistory.slice(0, 500)
    }
  }

  // 分析包的稀有度分布
  analyzePackRarity(cards) {
    const breakdown = {}
    
    for (const rarity of Object.values(CONFIG.RARITY)) {
      breakdown[rarity.name] = 0
    }

    cards.forEach(card => {
      if (card.rarity && card.rarity.name) {
        breakdown[card.rarity.name]++
      }
    })

    return breakdown
  }

  // 更新稀有度平衡器
  updateRarityBalancer(pack) {
    this.rarityBalancer.recentPacks.push({
      id: pack.id,
      cards: pack.cards.map(card => ({
        rarity: card.rarity,
        timestamp: card.obtainedAt
      })),
      timestamp: pack.timestamp
    })

    // 保持最近100包的记录
    if (this.rarityBalancer.recentPacks.length > 100) {
      this.rarityBalancer.recentPacks = this.rarityBalancer.recentPacks.slice(-50)
    }

    this.rarityBalancer.lastBalanceCheck = Date.now()
  }

  // 更新用户收藏
  updateUserCollection(playerAddress, newCards) {
    let collection = this.userCollections.get(playerAddress) || {
      playerAddress,
      cards: [],
      totalPacks: 0,
      rarityStats: {},
      lastUpdated: Date.now()
    }

    collection.cards.push(...newCards)
    collection.totalPacks++
    collection.lastUpdated = Date.now()

    // 更新稀有度统计
    collection.rarityStats = this.calculateRarityStats(collection.cards)

    this.userCollections.set(playerAddress, collection)
  }

  // 计算稀有度统计
  calculateRarityStats(cards) {
    const stats = {}
    
    for (const rarity of Object.values(CONFIG.RARITY)) {
      stats[rarity.name] = {
        count: 0,
        percentage: 0
      }
    }

    cards.forEach(card => {
      if (card.rarity && card.rarity.name) {
        stats[card.rarity.name].count++
      }
    })

    // 计算百分比
    const totalCards = cards.length
    for (const stat of Object.values(stats)) {
      stat.percentage = totalCards > 0 ? (stat.count / totalCards) * 100 : 0
    }

    return stats
  }

  // 获取用户收藏
  getUserCollection(playerAddress) {
    return this.userCollections.get(playerAddress) || null
  }

  // 获取收藏统计
  getCollectionStats(playerAddress) {
    const collection = this.getUserCollection(playerAddress)
    if (!collection) {
      return null
    }

    const uniqueCards = new Set(collection.cards.map(card => card.symbol)).size
    const totalSupported = CONFIG.SUPPORTED_COINS.length
    const completionRate = (uniqueCards / totalSupported) * 100

    return {
      totalCards: collection.cards.length,
      uniqueCards,
      completionRate: Math.round(completionRate * 100) / 100,
      totalPacks: collection.totalPacks,
      rarityStats: collection.rarityStats,
      averageRarity: this.calculateCollectionRarity(collection),
      lastUpdated: collection.lastUpdated
    }
  }

  // 获取开包历史
  getPackHistory(playerAddress = null, limit = 10) {
    let history = this.packHistory

    if (playerAddress) {
      history = history.filter(pack => pack.playerAddress === playerAddress)
    }

    return history.slice(0, limit)
  }

  // 加载历史数据（持久化支持）
  loadPackHistory() {
    try {
      const saved = localStorage.getItem('bullrun_pack_history')
      if (saved) {
        this.packHistory = JSON.parse(saved)
        console.log(`📚 加载了 ${this.packHistory.length} 条开包记录`)
      }
    } catch (error) {
      console.warn('加载开包历史失败:', error)
    }
  }

  // 保存历史数据
  savePackHistory() {
    try {
      localStorage.setItem('bullrun_pack_history', JSON.stringify(this.packHistory))
    } catch (error) {
      console.warn('保存开包历史失败:', error)
    }
  }

  // 清理资源
  destroy() {
    this.savePackHistory()
    this.packHistory = []
    this.userCollections.clear()
    this.rarityBalancer.recentPacks = []
    console.log('🧹 卡包服务已清理')
  }
}

// 创建单例实例
export const cardPackService = new CardPackService()

// 导出类用于测试
export { CardPackService }

export default cardPackService
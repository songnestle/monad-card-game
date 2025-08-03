/**
 * GameEngine.js - Bullrun卡牌游戏核心引擎
 * 
 * 核心功能：
 * - 游戏轮次管理和时间同步
 * - 手牌评分和排行榜计算  
 * - 重复卡牌惩罚机制
 * - 奖励分配算法
 * - 实时游戏状态同步
 */

import { CONFIG, GAME_STATUS, EVENT_TYPES, TimeUtils } from '../config/BullrunConfig.js'
import { priceService } from './PriceService.js'

class GameEngine {
  constructor() {
    this.currentRound = null
    this.gameStatus = GAME_STATUS.WAITING
    this.participants = new Map() // address -> hand data
    this.leaderboard = []
    this.gameTimer = null
    this.eventListeners = new Set()
    this.roundHistory = []
    this.isCalculating = false
  }

  // 初始化游戏引擎
  async initialize() {
    try {
      console.log('🎮 初始化游戏引擎...')
      
      // 初始化价格服务
      await priceService.initialize()
      
      // 设置价格服务监听器
      priceService.addListener((event, data) => {
        if (event === 'priceUpdate') {
          this.handlePriceUpdate(data)
        }
      })
      
      // 检查当前游戏状态
      this.checkGameStatus()
      
      // 启动游戏时钟
      this.startGameTimer()
      
      console.log('✅ 游戏引擎初始化成功')
      return true
    } catch (error) {
      console.error('❌ 游戏引擎初始化失败:', error)
      return false
    }
  }

  // 检查并更新游戏状态
  checkGameStatus() {
    const now = Date.now()
    const currentRoundStart = TimeUtils.getCurrentRoundStart()
    const nextRoundStart = TimeUtils.getNextRoundStart()
    
    // 更新当前轮次信息
    this.currentRound = {
      id: `round_${currentRoundStart}`,
      startTime: currentRoundStart,
      endTime: nextRoundStart,
      remainingTime: Math.max(0, nextRoundStart - now),
      participantCount: this.participants.size
    }

    // 确定游戏状态
    const previousStatus = this.gameStatus
    
    if (now < currentRoundStart) {
      this.gameStatus = GAME_STATUS.WAITING
    } else if (now >= currentRoundStart && now < nextRoundStart) {
      this.gameStatus = GAME_STATUS.ACTIVE
    } else {
      this.gameStatus = GAME_STATUS.ENDED
    }

    // 状态变化时触发事件
    if (previousStatus !== this.gameStatus) {
      this.handleStatusChange(previousStatus, this.gameStatus)
    }

    return this.gameStatus
  }

  // 处理游戏状态变化
  handleStatusChange(oldStatus, newStatus) {
    console.log(`🎮 游戏状态变化: ${oldStatus} -> ${newStatus}`)

    switch (newStatus) {
      case GAME_STATUS.ACTIVE:
        this.emit(EVENT_TYPES.GAME_START, {
          round: this.currentRound,
          timestamp: Date.now()
        })
        break

      case GAME_STATUS.ENDED:
        this.handleGameEnd()
        break

      case GAME_STATUS.WAITING:
        this.handleGameWaiting()
        break
    }
  }

  // 处理游戏结束
  async handleGameEnd() {
    try {
      this.isCalculating = true
      this.gameStatus = GAME_STATUS.CALCULATING
      
      console.log('🏁 游戏轮次结束，开始计算最终分数...')
      
      // 计算最终排行榜
      const finalLeaderboard = await this.calculateFinalScores()
      
      // 分配奖励
      const prizeDistribution = this.calculatePrizeDistribution(finalLeaderboard)
      
      // 保存轮次历史
      this.saveRoundHistory(finalLeaderboard, prizeDistribution)
      
      // 触发游戏结束事件
      this.emit(EVENT_TYPES.GAME_END, {
        round: this.currentRound,
        leaderboard: finalLeaderboard,
        prizes: prizeDistribution,
        timestamp: Date.now()
      })
      
      // 重置参与者（为下一轮做准备）
      this.participants.clear()
      this.leaderboard = []
      
      console.log('✅ 游戏轮次结算完成')
      
    } catch (error) {
      console.error('❌ 游戏结算失败:', error)
      this.emit(EVENT_TYPES.ERROR_OCCURRED, { error: error.message })
    } finally {
      this.isCalculating = false
      this.gameStatus = GAME_STATUS.WAITING
    }
  }

  // 处理等待状态
  handleGameWaiting() {
    console.log('⏳ 等待下一轮游戏开始...')
    
    // 清理可能的旧数据
    if (this.participants.size > 0) {
      console.log('🧹 清理上一轮游戏数据')
      this.participants.clear()
      this.leaderboard = []
    }
  }

  // 创建手牌
  async createHand(playerAddress, cardIndices) {
    try {
      // 验证游戏状态
      if (this.gameStatus !== GAME_STATUS.ACTIVE) {
        throw new Error(`游戏当前不可用，状态: ${this.gameStatus}`)
      }

      // 验证手牌
      if (!Array.isArray(cardIndices) || cardIndices.length !== CONFIG.GAME.HAND_SIZE) {
        throw new Error(`手牌必须包含${CONFIG.GAME.HAND_SIZE}张卡牌`)
      }

      // 获取卡牌价格信息
      const handCards = []
      for (const cardIndex of cardIndices) {
        const coin = CONFIG.SUPPORTED_COINS[cardIndex]
        if (!coin) {
          throw new Error(`无效的卡牌索引: ${cardIndex}`)
        }

        const priceInfo = priceService.getPriceInfo(coin.symbol)
        if (!priceInfo) {
          throw new Error(`无法获取${coin.symbol}的价格信息`)
        }

        handCards.push({
          index: cardIndex,
          symbol: coin.symbol,
          name: coin.name,
          emoji: coin.emoji,
          priceInfo
        })
      }

      // 计算手牌分数
      const handScore = this.calculateHandScore(handCards)

      // 检测重复卡牌并应用惩罚
      const duplicatePenalty = this.calculateDuplicatePenalty(cardIndices)
      const finalScore = handScore.total + duplicatePenalty

      // 创建手牌数据
      const handData = {
        playerAddress,
        cards: handCards,
        cardIndices,
        baseScore: handScore.total,
        duplicatePenalty,
        finalScore,
        scoreBreakdown: handScore.breakdown,
        timestamp: Date.now(),
        roundId: this.currentRound.id
      }

      // 保存到参与者列表
      this.participants.set(playerAddress, handData)

      // 更新实时排行榜
      this.updateLeaderboard()

      // 触发手牌创建事件
      this.emit(EVENT_TYPES.HAND_CREATED, {
        player: playerAddress,
        hand: handData,
        leaderboardPosition: this.getPlayerPosition(playerAddress)
      })

      console.log(`✅ 玩家 ${playerAddress} 创建手牌成功，分数: ${finalScore}`)
      return handData

    } catch (error) {
      console.error('❌ 创建手牌失败:', error)
      throw error
    }
  }

  // 计算手牌分数
  calculateHandScore(handCards) {
    let totalScore = 0
    const breakdown = {
      priceChanges: 0,
      volatilityBonus: 0,
      trendBonus: 0,
      rarityBonus: 0
    }

    for (const card of handCards) {
      const { priceInfo } = card
      
      if (priceInfo.bullrunScore) {
        totalScore += priceInfo.bullrunScore.total
        breakdown.priceChanges += priceInfo.bullrunScore.breakdown.base || 0
        breakdown.volatilityBonus += priceInfo.bullrunScore.breakdown.volatility || 0
        breakdown.trendBonus += priceInfo.bullrunScore.breakdown.trend || 0
      }

      // 稀有度加成
      const rarityLevel = priceInfo.rarity?.level || 1
      const rarityBonus = rarityLevel * 10 // 每级稀有度+10分
      totalScore += rarityBonus
      breakdown.rarityBonus += rarityBonus
    }

    return {
      total: Math.round(totalScore),
      breakdown
    }
  }

  // 计算重复卡牌惩罚
  calculateDuplicatePenalty(cardIndices) {
    const cardCounts = {}
    let penalty = 0

    // 统计每张卡牌的出现次数
    for (const index of cardIndices) {
      cardCounts[index] = (cardCounts[index] || 0) + 1
    }

    // 计算惩罚
    for (const [cardIndex, count] of Object.entries(cardCounts)) {
      if (count > 1) {
        // 每重复一张卡牌惩罚50分，递增
        const duplicateCount = count - 1
        const cardPenalty = duplicateCount * 50 * duplicateCount // 平方增长
        penalty -= Math.min(cardPenalty, Math.abs(CONFIG.GAME.MAX_DUPLICATE_PENALTY))
      }
    }

    return Math.max(penalty, CONFIG.GAME.MAX_DUPLICATE_PENALTY)
  }

  // 更新实时排行榜
  updateLeaderboard() {
    const participants = Array.from(this.participants.values())
    
    this.leaderboard = participants
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((participant, index) => ({
        ...participant,
        rank: index + 1,
        lastUpdated: Date.now()
      }))

    // 触发分数更新事件
    this.emit(EVENT_TYPES.SCORE_UPDATE, {
      leaderboard: this.leaderboard.slice(0, CONFIG.UI.LEADERBOARD_SIZE),
      timestamp: Date.now()
    })
  }

  // 处理价格更新
  handlePriceUpdate(data) {
    if (this.gameStatus !== GAME_STATUS.ACTIVE || this.participants.size === 0) {
      return
    }

    console.log('📊 价格更新，重新计算所有手牌分数...')

    // 重新计算所有参与者的分数
    for (const [playerAddress, handData] of this.participants) {
      try {
        // 更新卡牌价格信息
        const updatedCards = handData.cards.map(card => ({
          ...card,
          priceInfo: priceService.getPriceInfo(card.symbol)
        }))

        // 重新计算分数
        const handScore = this.calculateHandScore(updatedCards)
        const finalScore = handScore.total + handData.duplicatePenalty

        // 更新参与者数据
        this.participants.set(playerAddress, {
          ...handData,
          cards: updatedCards,
          baseScore: handScore.total,
          finalScore,
          scoreBreakdown: handScore.breakdown,
          lastUpdated: Date.now()
        })

      } catch (error) {
        console.error(`更新玩家 ${playerAddress} 分数失败:`, error)
      }
    }

    // 更新排行榜
    this.updateLeaderboard()
  }

  // 计算最终分数（游戏结束时）
  async calculateFinalScores() {
    console.log('🧮 计算最终分数...')

    // 确保有最新的价格数据
    try {
      await priceService.refreshPrices()
    } catch (error) {
      console.warn('最终分数计算时价格刷新失败:', error)
    }

    // 重新计算一次所有分数
    this.handlePriceUpdate({ forced: true })

    return this.leaderboard
  }

  // 计算奖励分配
  calculatePrizeDistribution(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
      return { distribution: [], totalPrize: 0 }
    }

    const totalPrize = Math.max(
      CONFIG.PRIZE_DISTRIBUTION.MINIMUM_PRIZE_POOL,
      leaderboard.length * 10 // 每位参与者基础奖池10 MON
    )

    const distribution = []
    const top10Count = Math.min(10, leaderboard.length)
    const top10Share = CONFIG.PRIZE_DISTRIBUTION.TOP_10_SHARE
    const participationShare = CONFIG.PRIZE_DISTRIBUTION.PARTICIPATION_REWARD_SHARE

    // 前10名奖励分配（幂次定律）
    const top10Pool = totalPrize * top10Share
    let remainingTop10Pool = top10Pool

    for (let i = 0; i < top10Count; i++) {
      const participant = leaderboard[i]
      let reward

      if (i === 0) {
        // 冠军获得额外倍数
        reward = (top10Pool * 0.4) * CONFIG.PRIZE_DISTRIBUTION.WINNER_BONUS_MULTIPLIER
      } else {
        // 幂次定律分配
        const rankFactor = Math.pow(top10Count - i, CONFIG.PRIZE_DISTRIBUTION.POWER_LAW_EXPONENT)
        const totalRankFactors = Array.from({ length: top10Count - 1 }, (_, j) => 
          Math.pow(top10Count - (j + 1), CONFIG.PRIZE_DISTRIBUTION.POWER_LAW_EXPONENT)
        ).reduce((sum, factor) => sum + factor, 0)
        
        reward = (top10Pool * 0.6) * (rankFactor / totalRankFactors)
      }

      distribution.push({
        playerAddress: participant.playerAddress,
        rank: i + 1,
        score: participant.finalScore,
        reward: Math.round(reward * 1000) / 1000, // 保留3位小数
        rewardType: i === 0 ? 'winner' : 'top10'
      })

      remainingTop10Pool -= reward
    }

    // 参与奖分配
    const participationPool = totalPrize * participationShare
    const participationReward = participationPool / Math.max(1, leaderboard.length - top10Count)

    for (let i = top10Count; i < leaderboard.length; i++) {
      const participant = leaderboard[i]
      distribution.push({
        playerAddress: participant.playerAddress,
        rank: i + 1,
        score: participant.finalScore,
        reward: Math.round(participationReward * 1000) / 1000,
        rewardType: 'participation'
      })
    }

    return {
      distribution,
      totalPrize: Math.round(totalPrize * 1000) / 1000,
      breakdown: {
        top10Pool: Math.round(top10Pool * 1000) / 1000,
        participationPool: Math.round(participationPool * 1000) / 1000
      }
    }
  }

  // 保存轮次历史
  saveRoundHistory(leaderboard, prizeDistribution) {
    const roundRecord = {
      roundId: this.currentRound.id,
      startTime: this.currentRound.startTime,
      endTime: this.currentRound.endTime,
      participantCount: leaderboard.length,
      leaderboard: leaderboard.slice(0, 10), // 只保存前10名
      prizeDistribution,
      timestamp: Date.now()
    }

    this.roundHistory.unshift(roundRecord)
    
    // 限制历史记录数量
    if (this.roundHistory.length > CONFIG.UI.RECENT_GAMES_SIZE) {
      this.roundHistory = this.roundHistory.slice(0, CONFIG.UI.RECENT_GAMES_SIZE)
    }

    console.log(`📚 轮次历史已保存: ${roundRecord.roundId}`)
  }

  // 启动游戏时钟
  startGameTimer() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer)
    }

    this.gameTimer = setInterval(() => {
      this.checkGameStatus()
      
      // 定期更新排行榜（仅在活跃状态）
      if (this.gameStatus === GAME_STATUS.ACTIVE && this.participants.size > 0) {
        this.updateLeaderboard()
      }
    }, CONFIG.UI.SCORE_UPDATE_INTERVAL)

    console.log('⏰ 游戏时钟已启动')
  }

  // 停止游戏时钟
  stopGameTimer() {
    if (this.gameTimer) {
      clearInterval(this.gameTimer)
      this.gameTimer = null
      console.log('⏹️ 游戏时钟已停止')
    }
  }

  // 获取玩家排名
  getPlayerPosition(playerAddress) {
    return this.leaderboard.findIndex(p => p.playerAddress === playerAddress) + 1
  }

  // 获取玩家手牌信息
  getPlayerHand(playerAddress) {
    return this.participants.get(playerAddress) || null
  }

  // 获取游戏状态信息
  getGameStatus() {
    this.checkGameStatus() // 确保状态最新
    
    return {
      status: this.gameStatus,
      currentRound: this.currentRound,
      participantCount: this.participants.size,
      leaderboard: this.leaderboard.slice(0, CONFIG.UI.LEADERBOARD_SIZE),
      isCalculating: this.isCalculating,
      priceServiceStatus: priceService.getStatus()
    }
  }

  // 获取历史记录
  getRoundHistory() {
    return this.roundHistory
  }

  // 添加事件监听器
  addListener(callback) {
    this.eventListeners.add(callback)
    return () => this.eventListeners.delete(callback)
  }

  // 触发事件
  emit(eventType, data) {
    this.eventListeners.forEach(callback => {
      try {
        callback(eventType, data)
      } catch (error) {
        console.error('游戏引擎事件监听器错误:', error)
      }
    })
  }

  // 清理资源
  destroy() {
    this.stopGameTimer()
    this.participants.clear()
    this.leaderboard = []
    this.eventListeners.clear()
    this.roundHistory = []
    console.log('🧹 游戏引擎已清理')
  }
}

// 创建单例实例
export const gameEngine = new GameEngine()

// 导出类用于测试
export { GameEngine }

export default gameEngine
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { ethers } from 'ethers'

const CONTRACT_ABI = [
  "function claimDailyCards() public payable",
  "function createHand(uint[5] cardIndexes) public",
  "function getMyCards() public view returns (tuple(uint id, string symbol, string name, uint rarity, uint baseScore, uint level, uint timestamp)[])",
  "function getMyActiveHand() public view returns (tuple(uint[5] cardIndexes, uint totalScore, uint timestamp, bool isActive))",
  "function getCurrentContest() public view returns (uint startTime, uint endTime, uint participantCount, uint prizePool)",
  "function participationFee() public view returns (uint)"
]

// 缓存键
const CACHE_KEYS = {
  PARTICIPATION_FEE: 'monad_participation_fee',
  CARDS_DATA: 'monad_cards_data',
  LAST_CLAIM_TIME: 'monad_last_claim_time'
}

// 缓存时间（毫秒）
const CACHE_DURATIONS = {
  PARTICIPATION_FEE: 60000, // 1分钟
  CARDS_DATA: 30000, // 30秒
}

export const useContract = (wallet, onLog) => {
  const [contractState, setContractState] = useState({
    isLoading: false,
    error: null,
    cards: [],
    participationFee: '0',
    activeHand: null,
    contestInfo: null,
    lastUpdateTime: null
  })

  const contractRef = useRef(null)
  const cacheRef = useRef(new Map())
  const requestQueueRef = useRef(new Map())

  const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS

  const updateState = useCallback((updates) => {
    setContractState(prev => ({ ...prev, ...updates }))
  }, [])

  // 安全的日志函数
  const safeLog = useCallback((message, type = 'info') => {
    if (onLog && typeof onLog === 'function') {
      onLog(message, type)
    }
  }, [onLog])

  // 缓存管理
  const getCachedData = useCallback((key) => {
    const cached = cacheRef.current.get(key)
    if (!cached) return null
    
    const now = Date.now()
    if (now - cached.timestamp > CACHE_DURATIONS[key]) {
      cacheRef.current.delete(key)
      return null
    }
    
    return cached.data
  }, [])

  const setCachedData = useCallback((key, data) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    })
  }, [])

  // 创建合约实例
  const createContract = useCallback(() => {
    if (!wallet.signer || !contractAddress) return null
    
    try {
      const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet.signer)
      contractRef.current = contract
      return contract
    } catch (error) {
      safeLog(`创建合约实例失败: ${error.message}`, 'error')
      return null
    }
  }, [wallet.signer, contractAddress, safeLog])

  // 防重复请求装饰器
  const withDeduplication = useCallback((key, asyncFn) => {
    return async (...args) => {
      // 检查是否有正在进行的相同请求
      if (requestQueueRef.current.has(key)) {
        safeLog(`请求去重: ${key}`, 'info')
        return requestQueueRef.current.get(key)
      }

      // 执行请求并缓存Promise
      const promise = asyncFn(...args)
      requestQueueRef.current.set(key, promise)

      try {
        const result = await promise
        return result
      } finally {
        requestQueueRef.current.delete(key)
      }
    }
  }, [safeLog])

  // 获取参与费用
  const getParticipationFee = useCallback(withDeduplication('participationFee', async () => {
    // 检查缓存
    const cached = getCachedData(CACHE_KEYS.PARTICIPATION_FEE)
    if (cached) {
      safeLog('📋 使用缓存的参与费用', 'info')
      return cached
    }

    const contract = createContract()
    if (!contract) throw new Error('合约实例创建失败')

    safeLog('💰 获取参与费用...', 'info')
    const fee = await contract.participationFee()
    const feeEther = ethers.formatEther(fee)
    
    // 缓存结果
    setCachedData(CACHE_KEYS.PARTICIPATION_FEE, feeEther)
    safeLog(`✅ 参与费用: ${feeEther} MON`, 'success')
    
    return feeEther
  }), [createContract, getCachedData, setCachedData, safeLog])

  // 获取我的卡牌
  const getMyCards = useCallback(withDeduplication('myCards', async (forceRefresh = false) => {
    // 检查缓存（除非强制刷新）
    if (!forceRefresh) {
      const cached = getCachedData(CACHE_KEYS.CARDS_DATA)
      if (cached) {
        safeLog('📋 使用缓存的卡牌数据', 'info')
        return cached
      }
    }

    const contract = createContract()
    if (!contract) throw new Error('合约实例创建失败')

    safeLog('🎴 获取我的卡牌...', 'info')
    const cards = await contract.getMyCards()
    const cardsArray = Array.from(cards || [])
    
    // 缓存结果
    setCachedData(CACHE_KEYS.CARDS_DATA, cardsArray)
    safeLog(`✅ 获取到 ${cardsArray.length} 张卡牌`, 'success')
    
    return cardsArray
  }), [createContract, getCachedData, setCachedData, safeLog])

  // 获取活跃手牌
  const getActiveHand = useCallback(async () => {
    const contract = createContract()
    if (!contract) return null

    try {
      safeLog('🤚 获取活跃手牌...', 'info')
      const hand = await contract.getMyActiveHand()
      safeLog(`✅ 手牌状态: ${hand.isActive ? '激活' : '未激活'}`, 'success')
      return hand
    } catch (error) {
      safeLog(`⚠️ 获取手牌失败: ${error.message}`, 'warning')
      return null
    }
  }, [createContract, safeLog])

  // 获取竞赛信息
  const getContestInfo = useCallback(async () => {
    const contract = createContract()
    if (!contract) return null

    try {
      safeLog('🏆 获取竞赛信息...', 'info')
      const contest = await contract.getCurrentContest()
      safeLog(`✅ 竞赛参与者: ${contest.participantCount} 人`, 'success')
      return contest
    } catch (error) {
      safeLog(`⚠️ 获取竞赛信息失败: ${error.message}`, 'warning')
      return null
    }
  }, [createContract, safeLog])

  // 批量加载所有数据
  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!wallet.isConnected) {
      safeLog('⚠️ 钱包未连接，跳过数据加载', 'warning')
      return false
    }

    updateState({ isLoading: true, error: null })
    safeLog('🔄 开始批量加载合约数据...', 'info')

    try {
      // 并行执行所有请求以提高性能
      const [fee, cards, hand, contest] = await Promise.allSettled([
        getParticipationFee(),
        getMyCards(forceRefresh),
        getActiveHand(),
        getContestInfo()
      ])

      // 处理参与费用结果
      const participationFee = fee.status === 'fulfilled' ? fee.value : '0'
      
      // 处理卡牌结果
      const cardsData = cards.status === 'fulfilled' ? cards.value : []
      
      // 处理手牌结果
      const activeHand = hand.status === 'fulfilled' ? hand.value : null
      
      // 处理竞赛结果
      const contestInfo = contest.status === 'fulfilled' ? contest.value : null

      updateState({
        isLoading: false,
        participationFee,
        cards: cardsData,
        activeHand,
        contestInfo,
        lastUpdateTime: Date.now(),
        error: null
      })

      safeLog('🎉 所有数据加载完成', 'success')
      return true

    } catch (error) {
      const errorMsg = error.message || '数据加载失败'
      updateState({ 
        isLoading: false, 
        error: errorMsg 
      })
      safeLog(`❌ 数据加载失败: ${errorMsg}`, 'error')
      return false
    }
  }, [wallet.isConnected, updateState, safeLog, getParticipationFee, getMyCards, getActiveHand, getContestInfo])

  // 领取每日卡牌
  const claimDailyCards = useCallback(async () => {
    if (!wallet.isConnected || !wallet.signer) {
      throw new Error('钱包未连接')
    }

    const contract = createContract()
    if (!contract) {
      throw new Error('合约实例创建失败')
    }

    safeLog('🎁 开始领取每日卡牌...', 'info')

    // 检查余额
    const balance = ethers.parseEther(wallet.balance)
    const fee = ethers.parseEther(contractState.participationFee)
    
    if (balance < fee) {
      throw new Error(`余额不足: 需要 ${contractState.participationFee} MON，当前 ${wallet.balance} MON`)
    }

    // 检查今日是否已领取
    const today = new Date().toDateString()
    const lastClaimTime = localStorage.getItem(CACHE_KEYS.LAST_CLAIM_TIME)
    
    if (lastClaimTime === today) {
      safeLog('⚠️ 今日已领取过卡牌', 'warning')
      // throw new Error('今日已领取过卡牌')
    }

    // 估算Gas费用
    try {
      const gasEstimate = await contract.claimDailyCards.estimateGas({ value: fee })
      safeLog(`⛽ 预估Gas费用: ${gasEstimate.toString()}`, 'info')
    } catch (gasError) {
      safeLog(`⚠️ Gas估算失败: ${gasError.message}`, 'warning')
    }

    // 发送交易
    const tx = await contract.claimDailyCards({ 
      value: fee,
      gasLimit: 500000 // 设置较高的gas limit以确保成功
    })

    safeLog(`📤 交易已发送: ${tx.hash}`, 'info')

    // 等待交易确认
    const receipt = await tx.wait()
    
    if (receipt.status === 1) {
      safeLog(`✅ 交易确认成功! Gas使用: ${receipt.gasUsed}`, 'success')
      
      // 记录领取时间
      localStorage.setItem(CACHE_KEYS.LAST_CLAIM_TIME, today)
      
      // 清除相关缓存
      cacheRef.current.delete(CACHE_KEYS.CARDS_DATA)
      
      // 延迟重新加载数据，给区块链时间更新状态
      setTimeout(() => {
        loadAllData(true) // 强制刷新
      }, 2000)
      
      return receipt
    } else {
      throw new Error('交易执行失败')
    }

  }, [wallet.isConnected, wallet.signer, wallet.balance, contractState.participationFee, createContract, safeLog, loadAllData])

  // 创建手牌
  const createHand = useCallback(async (cardIndexes) => {
    if (!wallet.isConnected || !wallet.signer) {
      throw new Error('钱包未连接')
    }

    if (!Array.isArray(cardIndexes) || cardIndexes.length !== 5) {
      throw new Error('必须选择5张卡牌')
    }

    const contract = createContract()
    if (!contract) {
      throw new Error('合约实例创建失败')
    }

    safeLog(`🤚 创建手牌: [${cardIndexes.join(', ')}]`, 'info')

    const tx = await contract.createHand(cardIndexes)
    safeLog(`📤 交易已发送: ${tx.hash}`, 'info')

    const receipt = await tx.wait()
    
    if (receipt.status === 1) {
      safeLog('✅ 手牌创建成功!', 'success')
      
      // 重新加载手牌数据
      setTimeout(() => {
        getActiveHand().then(hand => {
          updateState({ activeHand: hand })
        })
      }, 1000)
      
      return receipt
    } else {
      throw new Error('创建手牌失败')
    }

  }, [wallet.isConnected, wallet.signer, createContract, safeLog, getActiveHand, updateState])

  // 智能重试机制
  const withRetry = useCallback((fn, maxRetries = 3) => {
    return async (...args) => {
      let attempt = 0
      let lastError

      while (attempt < maxRetries) {
        try {
          return await fn(...args)
        } catch (error) {
          lastError = error
          attempt++
          
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 // 指数退避
            safeLog(`🔄 第${attempt}次重试，${delay/1000}秒后执行...`, 'warning')
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      throw lastError
    }
  }, [safeLog])

  // 应用重试机制到关键函数
  const loadAllDataWithRetry = useMemo(() => withRetry(loadAllData), [withRetry, loadAllData])
  const claimDailyCardsWithRetry = useMemo(() => withRetry(claimDailyCards), [withRetry, claimDailyCards])

  // 自动刷新数据
  useEffect(() => {
    if (!wallet.isConnected) return

    const interval = setInterval(() => {
      if (contractState.lastUpdateTime && Date.now() - contractState.lastUpdateTime > 60000) {
        safeLog('🔄 自动刷新数据...', 'info')
        loadAllData()
      }
    }, 30000) // 每30秒检查一次

    return () => clearInterval(interval)
  }, [wallet.isConnected, contractState.lastUpdateTime, loadAllData, safeLog])

  // 钱包连接状态变化时重新加载数据
  useEffect(() => {
    if (wallet.isConnected && wallet.signer) {
      loadAllDataWithRetry()
    } else {
      // 钱包断开时清除状态
      updateState({
        cards: [],
        participationFee: '0',
        activeHand: null,
        contestInfo: null,
        error: null
      })
      
      // 清除缓存
      cacheRef.current.clear()
    }
  }, [wallet.isConnected, wallet.signer, loadAllDataWithRetry, updateState])

  return {
    ...contractState,
    contract: contractRef.current,
    loadAllData: loadAllDataWithRetry,
    claimDailyCards: claimDailyCardsWithRetry,
    createHand,
    refreshData: () => loadAllData(true)
  }
}
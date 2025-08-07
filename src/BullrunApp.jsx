/**
 * BullrunApp.jsx - 完整的Bullrun卡牌游戏应用
 * 
 * 整合所有功能特性：
 * - Bullrun游戏机制
 * - 实时价格数据和评分系统
 * - 增强的卡包和稀有度系统
 * - 游戏时间管理和轮次系统
 * - 排行榜和奖励分配
 * - 重复卡牌惩罚机制
 * - 优化的用户界面和体验
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ethers } from 'ethers'
import './App.css'

// 导入核心服务
import { priceService } from './services/PriceService.js'
import { gameEngine } from './services/GameEngine.js'
import { cardPackService } from './services/CardPackService.js'

// 导入配置
import { CONFIG, GAME_STATUS, EVENT_TYPES } from './config/BullrunConfig.js'

// 导入组件
import ErrorBoundary from './components/ErrorBoundary.jsx'
import GameTimer from './components/GameTimer.jsx'
import GameStatusPanel from './components/GameStatusPanel.jsx'
import Leaderboard from './components/Leaderboard.jsx'
import PriceChart from './components/PriceChart.jsx'
import ApiStatusIndicator from './components/ApiStatusIndicator.jsx'
import DuplicateCardWarning from './components/DuplicateCardWarning.jsx'

// 导入性能监控
import usePerformanceMonitor, { useMemoryLeak } from './hooks/usePerformanceMonitor.js'

// 导入钱包工具
import walletUtils from './utils/walletUtils.js'
import { initializeWalletEnvironment, getProcessedEthereumProvider } from './utils/walletInit.js'

// 环境变量配置
const BULLRUN_CONFIG = {
  RPC_URL: import.meta.env.VITE_RPC_URL,
  CONTRACT_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS,
  NETWORK: CONFIG.NETWORK || {
    chainId: 10143,
    chainIdHex: '0x279f',
    name: 'Monad Testnet',
    currency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://testnet-explorer.monad.xyz']
  }
}

// 智能合约ABI
const CONTRACT_ABI = [
  "function claimDailyCards() public payable",
  "function createHand(uint[5] cardIndexes) public",
  "function getMyCards() public view returns (tuple(uint id, string symbol, string name, uint rarity, uint baseScore, uint level, uint timestamp)[])",
  "function getMyActiveHand() public view returns (tuple(uint[5] cardIndexes, uint totalScore, uint timestamp, bool isActive))",
  "function getCurrentContest() public view returns (uint startTime, uint endTime, uint participantCount, uint prizePool)",
  "function participationFee() public view returns (uint)"
]

// 工具函数
const utils = {
  formatAddress: (address) => {
    if (!address || typeof address !== 'string') return '未知地址'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  },
  
  formatBalance: (balance, decimals = 4) => {
    try {
      const num = parseFloat(balance || '0')
      return isNaN(num) ? '0.0000' : num.toFixed(decimals)
    } catch {
      return '0.0000'
    }
  },
  
  isValidNetwork: (chainId) => chainId === BULLRUN_CONFIG.NETWORK.chainId
}

// 通知组件
const BullrunNotification = ({ notifications, removeNotification }) => {
  if (!notifications?.length) return null

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      maxWidth: '400px'
    }}>
      {notifications.map(notification => (
        <div
          key={notification.id}
          style={{
            background: notification.type === 'error' ? 
              'linear-gradient(135deg, #E74C3C, #C0392B)' :
              notification.type === 'warning' ?
              'linear-gradient(135deg, #F39C12, #E67E22)' :
              'linear-gradient(135deg, #27AE60, #2ECC71)',
            color: 'white',
            padding: '16px 22px',
            borderRadius: '12px',
            marginBottom: '12px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: 'slideInRight 0.5s ease-out'
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
              {notification.type === 'error' ? '❌ 错误' : 
               notification.type === 'warning' ? '⚠️ 警告' : '✅ 成功'}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.95 }}>
              {notification.message}
            </div>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              marginLeft: '12px'
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// 主应用组件
function BullrunApp() {
  // 性能监控
  const { startTimer, endTimer, monitorAsync } = usePerformanceMonitor('BullrunApp')
  const { safeSetTimeout, clearSafeTimeout } = useMemoryLeak('BullrunApp')

  // 核心状态
  const [isInitialized, setIsInitialized] = useState(false)
  const [gameStatus, setGameStatus] = useState(null)
  const [priceData, setPriceData] = useState({})
  
  // 钱包状态
  const [walletState, setWalletState] = useState({
    isConnected: false,
    isConnecting: false,
    account: '',
    balance: '0',
    chainId: null,
    provider: null,
    signer: null
  })

  // 游戏数据
  const [userCards, setUserCards] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [currentTab, setCurrentTab] = useState('game')
  
  // UI状态
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState({ show: false, message: '' })
  const [showPriceCharts, setShowPriceCharts] = useState(false)

  // 引用
  const notificationTimeouts = useRef(new Map())

  // 通知系统
  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    const notification = { id, message, type, timestamp: Date.now() }
    
    setNotifications(prev => [...prev.slice(-4), notification])
    
    const timeout = safeSetTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
      notificationTimeouts.current.delete(id)
    }, CONFIG.UI.NOTIFICATION_DURATION)
    
    notificationTimeouts.current.set(id, timeout)
  }, [safeSetTimeout])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    const timeout = notificationTimeouts.current.get(id)
    if (timeout) {
      clearSafeTimeout(timeout)
      notificationTimeouts.current.delete(id)
    }
  }, [clearSafeTimeout])

  // 初始化应用
  const initializeApp = useCallback(async () => {
    try {
      startTimer('app-init')
      setLoading({ show: true, message: '正在解决钱包冲突问题...' })

      // 首先初始化钱包环境，解决扩展冲突
      const walletEnvResult = await initializeWalletEnvironment()
      if (!walletEnvResult.success) {
        console.warn('钱包环境初始化警告:', walletEnvResult.error)
      }

      setLoading({ show: true, message: '初始化Bullrun游戏引擎...' })

      // 初始化服务
      await Promise.all([
        priceService.initialize(),
        gameEngine.initialize(),
        cardPackService.initialize()
      ])

      // 监听服务事件
      priceService.addListener((event, data) => {
        if (event === 'priceUpdate') {
          setPriceData(priceService.getAllPrices())
        } else if (event === 'fallbackMode') {
          addNotification('价格服务连接异常，已切换到后备模式', 'warning')
        }
      })

      gameEngine.addListener((event, data) => {
        setGameStatus(gameEngine.getGameStatus())
        
        if (event === EVENT_TYPES.GAME_START) {
          addNotification('🎮 新一轮游戏开始！', 'success')
        } else if (event === EVENT_TYPES.GAME_END) {
          addNotification('🏁 游戏轮次结束，正在计算排名...', 'success')
        } else if (event === EVENT_TYPES.HAND_CREATED) {
          addNotification('🃏 手牌创建成功！已参与当前轮次', 'success')
        }
      })

      setIsInitialized(true)
      addNotification('🎯 Bullrun卡牌游戏已启动！', 'success')
      
      endTimer('app-init')
    } catch (error) {
      console.error('应用初始化失败:', error)
      addNotification(`初始化失败: ${error.message}`, 'error')
    } finally {
      setLoading({ show: false, message: '' })
    }
  }, [startTimer, endTimer, addNotification])

  // 连接钱包
  const connectWallet = useCallback(async () => {
    return await monitorAsync('connect-wallet', async () => {
      // 检查钱包兼容性
      const compatibility = walletUtils.checkWalletCompatibility()
      if (!compatibility.isCompatible) {
        const message = compatibility.recommendations.join(' ')
        addNotification(message, 'error')
        return false
      }

      // 获取钱包提供者 - 使用处理后的提供者
      const walletProvider = getProcessedEthereumProvider() || walletUtils.getEthereumProvider()
      if (!walletProvider) {
        addNotification('未检测到Web3钱包，请安装MetaMask', 'error')
        return false
      }

      try {
        setWalletState(prev => ({ ...prev, isConnecting: true }))
        setLoading({ show: true, message: '连接钱包...' })

        // 安全的钱包调用
        const accounts = await walletUtils.safeWalletCall(
          'eth_requestAccounts', 
          [], 
          walletProvider
        )

        if (!accounts?.length) {
          throw new Error('未获取到账户授权')
        }

        const account = accounts[0]
        const provider = new ethers.BrowserProvider(walletProvider)
        const signer = await provider.getSigner()
        const network = await provider.getNetwork()
        const chainId = Number(network.chainId)

        // 检查网络
        if (!utils.isValidNetwork(chainId)) {
          try {
            await walletUtils.safeWalletCall(
              'wallet_switchEthereumChain',
              [{ chainId: BULLRUN_CONFIG.NETWORK.chainIdHex }],
              walletProvider
            )
          } catch (switchError) {
            if (switchError.message.includes('Unrecognized chain') || switchError.code === 4902) {
              await walletUtils.safeWalletCall(
                'wallet_addEthereumChain',
                [BULLRUN_CONFIG.NETWORK],
                walletProvider
              )
            } else {
              throw switchError
            }
          }
        }

        const balance = await provider.getBalance(account)
        const balanceETH = ethers.formatEther(balance)

        setWalletState({
          isConnected: true,
          isConnecting: false,
          account,
          balance: balanceETH,
          chainId,
          provider,
          signer
        })

        // 生成新手包（如果是新用户）
        if (userCards.length === 0) {
          const starterPack = await cardPackService.generateStarterPack(account)
          setUserCards(starterPack.cards)
          addNotification(`🎁 欢迎礼包已发放！获得${starterPack.cards.length}张卡牌`, 'success')
        }

        addNotification(`钱包连接成功！地址: ${utils.formatAddress(account)}`, 'success')
        return true

      } catch (error) {
        const handledError = walletUtils.handleWalletError(error)
        addNotification(handledError.message, 'error')
        
        setWalletState(prev => ({ 
          ...prev, 
          isConnecting: false,
          isConnected: false 
        }))
        return false
      } finally {
        setLoading({ show: false, message: '' })
      }
    })
  }, [monitorAsync, addNotification, userCards.length])

  // 创建手牌
  const createHand = useCallback(async () => {
    if (selectedCards.length !== 5) {
      addNotification('请选择正好5张卡牌', 'warning')
      return
    }

    try {
      setLoading({ show: true, message: '创建手牌并参与游戏...' })
      
      const handData = await gameEngine.createHand(walletState.account, selectedCards)
      
      setSelectedCards([])
      addNotification(
        `🃏 手牌创建成功！总分: ${handData.finalScore}，当前排名更新中...`, 
        'success'
      )
      
    } catch (error) {
      addNotification(`创建手牌失败: ${error.message}`, 'error')
    } finally {
      setLoading({ show: false, message: '' })
    }
  }, [selectedCards, walletState.account, addNotification])

  // 切换卡牌选择
  const toggleCardSelection = useCallback((cardIndex) => {
    setSelectedCards(prev => {
      if (prev.includes(cardIndex)) {
        return prev.filter(index => index !== cardIndex)
      } else if (prev.length < 5) {
        return [...prev, cardIndex]
      } else {
        addNotification('最多只能选择5张卡牌', 'warning')
        return prev
      }
    })
  }, [addNotification])

  // 处理重复卡牌建议
  const handleDuplicateSuggestion = useCallback((suggestion) => {
    if (suggestion.action === 'replace') {
      setSelectedCards(prev => {
        const newSelection = [...prev]
        newSelection[suggestion.position] = suggestion.newIndex
        return newSelection
      })
      addNotification('已替换重复卡牌', 'success')
    } else if (suggestion.action === 'auto_optimize') {
      // 自动优化逻辑
      const usedIndices = new Set()
      const optimizedSelection = selectedCards.map(cardIndex => {
        if (usedIndices.has(cardIndex)) {
          // 寻找替代卡牌
          for (let i = 0; i < CONFIG.SUPPORTED_COINS.length; i++) {
            if (!usedIndices.has(i) && i !== cardIndex) {
              usedIndices.add(i)
              return i
            }
          }
        }
        usedIndices.add(cardIndex)
        return cardIndex
      })
      
      setSelectedCards(optimizedSelection)
      addNotification('🔧 手牌已自动优化', 'success')
    }
  }, [selectedCards, addNotification])

  // 应用初始化
  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  // 获取卡牌信息
  const getCardInfo = useCallback((cardIndex) => {
    const coin = CONFIG.SUPPORTED_COINS[cardIndex]
    if (!coin) return null

    const priceInfo = priceData.data?.[coin.symbol] || {}
    
    return {
      ...coin,
      priceInfo,
      bullrunScore: priceInfo.bullrunScore || { total: 0 },
      rarity: priceInfo.rarity || CONFIG.RARITY.COMMON
    }
  }, [priceData])

  // 计算手牌预览分数
  const handPreviewScore = useMemo(() => {
    if (selectedCards.length === 0) return 0

    let totalScore = 0
    const cardCounts = {}

    selectedCards.forEach(cardIndex => {
      const cardInfo = getCardInfo(cardIndex)
      if (cardInfo?.priceInfo?.bullrunScore) {
        totalScore += cardInfo.priceInfo.bullrunScore.total
      }
      
      // 稀有度加成
      totalScore += (cardInfo?.rarity?.level || 1) * 10
      
      // 统计重复
      cardCounts[cardIndex] = (cardCounts[cardIndex] || 0) + 1
    })

    // 扣除重复卡牌惩罚
    Object.values(cardCounts).forEach(count => {
      if (count > 1) {
        const duplicateCount = count - 1
        const penalty = duplicateCount * 50 * duplicateCount
        totalScore -= Math.min(penalty, Math.abs(CONFIG.GAME.MAX_DUPLICATE_PENALTY))
      }
    })

    return Math.round(totalScore)
  }, [selectedCards, getCardInfo])

  if (!isInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎴</div>
          <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>
            Bullrun 卡牌世界
          </div>
          <div style={{ fontSize: '1rem', opacity: 0.8 }}>
            正在初始化游戏引擎...
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="animated-background" style={{ 
        padding: '20px', 
        minHeight: '100vh',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* 通知系统 */}
        <BullrunNotification 
          notifications={notifications} 
          removeNotification={removeNotification} 
        />
        
        {/* API状态指示器 */}
        <ApiStatusIndicator compact position="top-left" />
        
        {/* 加载指示器 */}
        {loading.show && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001
          }}>
            <div style={{
              background: 'rgba(0,0,0,0.9)',
              color: 'white',
              padding: '30px',
              borderRadius: '15px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '40px', height: '40px',
                border: '4px solid rgba(255,255,255,0.3)',
                borderTop: '4px solid #4ECDC4',
                borderRadius: '50%',
                margin: '0 auto 15px',
                animation: 'spin 1s linear infinite'
              }} />
              <div>{loading.message}</div>
            </div>
          </div>
        )}

        {/* 主标题 */}
        <header style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{
            fontSize: '3rem',
            background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            🎴 Bullrun 卡牌世界
          </h1>
          <p style={{ color: '#bbb', fontSize: '1.1rem' }}>
            基于实时加密货币价格的策略卡牌游戏
          </p>
        </header>

        {/* 连接钱包按钮 */}
        {!walletState.isConnected && (
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <button 
              onClick={connectWallet}
              disabled={walletState.isConnecting}
              style={{
                background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                cursor: 'pointer'
              }}
            >
              {walletState.isConnecting ? '🔄 连接中...' : '🔗 连接钱包开始游戏'}
            </button>
          </div>
        )}

        {/* 主要内容 */}
        {walletState.isConnected && (
          <>
            {/* 顶部信息栏 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <GameTimer compact={false} showStatus={true} />
              <GameStatusPanel compact={false} />
            </div>

            {/* 标签页导航 */}
            <nav style={{ textAlign: 'center', marginBottom: '30px' }}>
              {[
                { id: 'game', label: '🎮 游戏大厅', icon: '🎮' },
                { id: 'cards', label: '🎁 我的卡牌', icon: '🎁' },
                { id: 'leaderboard', label: '🏆 排行榜', icon: '🏆' },
                { id: 'market', label: '📊 市场行情', icon: '📊' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  style={{
                    background: currentTab === tab.id ? 
                      'linear-gradient(45deg, #9B59B6, #8E44AD)' : '#666',
                    border: 'none',
                    color: 'white',
                    padding: '12px 20px',
                    margin: '0 5px',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* 游戏大厅 */}
            {currentTab === 'game' && (
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {gameStatus?.status === GAME_STATUS.ACTIVE ? (
                  <>
                    <h2 style={{ textAlign: 'center', color: '#FFD700', marginBottom: '20px' }}>
                      🎯 选择5张卡牌创建你的手牌
                    </h2>
                    
                    {/* 手牌选择进度 */}
                    <div style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '15px',
                      padding: '20px',
                      marginBottom: '20px',
                      textAlign: 'center'
                    }}>
                      <div style={{ marginBottom: '10px' }}>
                        已选择: {selectedCards.length}/5 张卡牌
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.1)',
                        height: '8px',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: 'linear-gradient(90deg, #4ECDC4, #44A08D)',
                          height: '100%',
                          width: `${(selectedCards.length / 5) * 100}%`,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      {selectedCards.length === 5 && (
                        <div style={{
                          marginTop: '15px',
                          color: '#27AE60',
                          fontWeight: 'bold'
                        }}>
                          预计总分: {handPreviewScore}
                        </div>
                      )}
                    </div>

                    {/* 重复卡牌警告 */}
                    {selectedCards.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <DuplicateCardWarning
                          selectedCards={selectedCards}
                          allCards={CONFIG.SUPPORTED_COINS}
                          onSuggestion={handleDuplicateSuggestion}
                          showSuggestions={true}
                        />
                      </div>
                    )}

                    {/* 卡牌选择区域 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                      gap: '20px',
                      marginBottom: '30px'
                    }}>
                      {CONFIG.SUPPORTED_COINS.map((coin, index) => {
                        const cardInfo = getCardInfo(index)
                        const isSelected = selectedCards.includes(index)
                        const priceInfo = cardInfo?.priceInfo || {}
                        
                        return (
                          <div
                            key={coin.symbol}
                            onClick={() => toggleCardSelection(index)}
                            style={{
                              background: `linear-gradient(135deg, ${coin.color}30, ${coin.color}15)`,
                              border: `3px solid ${isSelected ? '#27AE60' : coin.color}`,
                              borderRadius: '15px',
                              padding: '20px',
                              textAlign: 'center',
                              cursor: 'pointer',
                              transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                              transition: 'all 0.3s ease',
                              position: 'relative'
                            }}
                          >
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                              {coin.emoji}
                            </div>
                            
                            <h3 style={{ margin: '10px 0', color: coin.color, fontWeight: 'bold' }}>
                              {coin.symbol.toUpperCase()}
                            </h3>
                            
                            <div style={{ fontSize: '0.9rem', color: '#bbb', marginBottom: '10px' }}>
                              {coin.name}
                            </div>
                            
                            {priceInfo.price && (
                              <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
                                <div style={{ color: '#fff' }}>
                                  ${priceInfo.price.toFixed(4)}
                                </div>
                                <div style={{
                                  color: priceInfo.change24h >= 0 ? '#27AE60' : '#E74C3C',
                                  fontWeight: 'bold'
                                }}>
                                  {priceInfo.change24h >= 0 ? '+' : ''}{priceInfo.change24h?.toFixed(2)}%
                                </div>
                              </div>
                            )}
                            
                            {priceInfo.bullrunScore && (
                              <div style={{
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '8px',
                                marginBottom: '10px'
                              }}>
                                <div style={{ fontSize: '0.8rem', color: '#bbb' }}>
                                  Bullrun分数
                                </div>
                                <div style={{
                                  color: priceInfo.bullrunScore.total >= 0 ? '#27AE60' : '#E74C3C',
                                  fontWeight: 'bold'
                                }}>
                                  {priceInfo.bullrunScore.total > 0 ? '+' : ''}{priceInfo.bullrunScore.total}
                                </div>
                              </div>
                            )}
                            
                            <div style={{
                              background: isSelected ? 
                                'linear-gradient(45deg, #27AE60, #2ECC71)' : 
                                'linear-gradient(45deg, #4ECDC4, #45B7B8)',
                              color: 'white',
                              padding: '8px 16px',
                              borderRadius: '20px',
                              fontSize: '0.9rem',
                              border: 'none',
                              cursor: 'pointer'
                            }}>
                              {isSelected ? '✅ 已选择' : '🎯 点击选择'}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* 创建手牌按钮 */}
                    {selectedCards.length === 5 && (
                      <div style={{ textAlign: 'center' }}>
                        <button
                          onClick={createHand}
                          style={{
                            background: 'linear-gradient(45deg, #FFD700, #FF8C00)',
                            border: 'none',
                            color: 'white',
                            padding: '15px 30px',
                            fontSize: '1.2rem',
                            borderRadius: '25px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)'
                          }}
                        >
                          🃏 创建手牌并参与游戏
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>⏰</div>
                    <h2 style={{ color: '#FFD700', marginBottom: '15px' }}>
                      {gameStatus?.status === GAME_STATUS.WAITING ? '等待下一轮游戏开始' : '游戏轮次已结束'}
                    </h2>
                    <p style={{ color: '#bbb', fontSize: '1.1rem' }}>
                      请查看排行榜了解本轮结果，下一轮即将开始
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 我的卡牌 */}
            {currentTab === 'cards' && (
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ textAlign: 'center', color: '#FFD700', marginBottom: '20px' }}>
                  🎁 我的卡牌收藏 ({userCards.length})
                </h2>
                
                {userCards.length > 0 ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '20px'
                  }}>
                    {userCards.map((card, index) => (
                      <div
                        key={card.id || index}
                        style={{
                          background: `linear-gradient(135deg, ${card.color}30, ${card.color}15)`,
                          border: `2px solid ${card.rarity?.color || card.color}`,
                          borderRadius: '15px',
                          padding: '20px',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                          {card.emoji}
                        </div>
                        <h3 style={{ margin: '10px 0', color: card.color }}>
                          {card.symbol} - {card.name}
                        </h3>
                        <div style={{
                          color: card.rarity?.color || '#bbb',
                          fontWeight: 'bold',
                          marginBottom: '10px'
                        }}>
                          {card.rarity?.name || '普通'} 稀有度
                        </div>
                        <div style={{ color: '#bbb', fontSize: '0.8rem' }}>
                          获得时间: {new Date(card.obtainedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎴</div>
                    <div style={{ color: '#bbb', fontSize: '1.1rem' }}>
                      暂无卡牌，连接钱包后将自动获得新手卡包
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 排行榜 */}
            {currentTab === 'leaderboard' && (
              <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <Leaderboard
                  playerAddress={walletState.account}
                  showRewards={true}
                  showHistory={true}
                  maxEntries={50}
                />
              </div>
            )}

            {/* 市场行情 */}
            {currentTab === 'market' && (
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h2 style={{ color: '#FFD700', margin: 0 }}>
                    📊 实时市场行情
                  </h2>
                  <button
                    onClick={() => setShowPriceCharts(!showPriceCharts)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      padding: '8px 15px',
                      borderRadius: '20px',
                      cursor: 'pointer'
                    }}
                  >
                    {showPriceCharts ? '隐藏图表' : '显示图表'}
                  </button>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: showPriceCharts ? 
                    'repeat(auto-fit, minmax(400px, 1fr))' : 
                    'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {CONFIG.SUPPORTED_COINS.slice(0, 12).map(coin => (
                    <PriceChart
                      key={coin.symbol}
                      symbol={coin.symbol}
                      compact={!showPriceCharts}
                      showBullrunScore={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CSS动画 */}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  )
}

export default BullrunApp
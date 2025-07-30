import { useState, useCallback, useEffect, Suspense, lazy } from 'react'
import { useWallet } from './hooks/useWallet'
import { useContract } from './hooks/useContract'
import LoadingScreen from './components/LoadingScreen'
import LazyCard from './components/LazyCard'
import './App.css'

// 懒加载组件
const ErrorBoundary = lazy(() => import('./components/ErrorBoundary'))

// 性能监控和优化配置
const PERFORMANCE_MARKS = {
  APP_START: 'app-start',
  WALLET_CONNECTED: 'wallet-connected',
  DATA_LOADED: 'data-loaded',
  CARDS_RENDERED: 'cards-rendered'
}

// 优化配置
const OPTIMIZATION_CONFIG = {
  CARD_BATCH_SIZE: 12,
  ANIMATION_DELAY_MS: 30,
  LOADING_TIMEOUT_MS: 500,
  RETRY_ATTEMPTS: 3,
  CACHE_DURATION_MS: 300000 // 5分钟缓存
}

function UltimateApp() {
  // 应用状态
  const [appState, setAppState] = useState({
    isInitializing: true,
    loadingStep: 'init',
    status: '启动中...',
    selectedCards: [],
    showLoadingScreen: true,
    isClaimingCards: false,
    performanceMetrics: {},
    isOptimized: false,
    renderBatch: 0,
    connectionAttempts: 0,
    lastUpdateTime: Date.now()
  })

  const [logs, setLogs] = useState([])

  // 性能标记
  const markPerformance = useCallback((mark) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(mark)
      setAppState(prev => ({
        ...prev,
        performanceMetrics: {
          ...prev.performanceMetrics,
          [mark]: Date.now()
        }
      }))
    }
  }, [])

  // 日志系统
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { message, type, timestamp, id: Date.now() }
    
    setLogs(prev => {
      const newLogs = [...prev.slice(-15), logEntry]
      
      // 控制台输出（仅开发环境）
      if (import.meta.env.DEV) {
        const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`${emoji} [${timestamp}] ${message}`)
      }
      
      return newLogs
    })
  }, [])

  // 使用自定义钩子
  const wallet = useWallet(addLog)
  const contract = useContract(wallet, addLog)

  // 状态更新函数
  const updateAppState = useCallback((updates) => {
    setAppState(prev => ({ ...prev, ...updates }))
  }, [])

  // 卡牌选择处理
  const handleCardSelection = useCallback((cardIndex) => {
    if (cardIndex >= contract.cards.length || cardIndex < 0) {
      addLog(`❌ 无效的卡牌索引: ${cardIndex}`, 'error')
      return
    }

    updateAppState(prev => {
      const currentSelected = prev.selectedCards
      let newSelected

      if (currentSelected.includes(cardIndex)) {
        // 取消选择
        newSelected = currentSelected.filter(index => index !== cardIndex)
        addLog(`➖ 取消选择卡牌 #${cardIndex}`, 'info')
      } else if (currentSelected.length < 5) {
        // 添加选择
        newSelected = [...currentSelected, cardIndex]
        addLog(`➕ 选择卡牌 #${cardIndex}`, 'info')
      } else {
        // 已选满5张
        addLog('⚠️ 已选择5张卡牌，无法继续选择', 'warning')
        return prev
      }

      return { ...prev, selectedCards: newSelected }
    })
  }, [contract.cards.length, addLog, updateAppState])

  // 领取卡牌
  const handleClaimCards = useCallback(async () => {
    if (!wallet.isConnected || appState.isClaimingCards) {
      return
    }

    try {
      updateAppState({ isClaimingCards: true })
      addLog('🎁 开始领取每日卡牌...', 'info')

      await contract.claimDailyCards()
      
      addLog('🎉 卡牌领取成功！', 'success')
      markPerformance('cards-claimed')
      
      // 清空选择的卡牌
      updateAppState({ selectedCards: [] })

    } catch (error) {
      const errorMsg = error.message || '领取失败'
      addLog(`❌ 领取失败: ${errorMsg}`, 'error')

      // 用户友好的错误提示
      if (errorMsg.includes('Already claimed') || errorMsg.includes('已领取')) {
        showNotification('今日已领取过卡牌，请明天再来！', 'warning')
      } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('余额不足')) {
        showNotification('MON余额不足，请先获取测试币', 'error')
      } else if (errorMsg.includes('user rejected') || errorMsg.includes('用户取消')) {
        showNotification('用户取消了交易', 'info')
      } else {
        showNotification(`领取失败: ${errorMsg}`, 'error')
      }
    } finally {
      updateAppState({ isClaimingCards: false })
    }
  }, [wallet.isConnected, appState.isClaimingCards, contract.claimDailyCards, addLog, updateAppState, markPerformance])

  // 通知系统
  const showNotification = useCallback((message, type = 'info') => {
    // 这里可以实现更复杂的通知系统
    if (type === 'error') {
      alert(`❌ ${message}`)
    } else if (type === 'warning') {
      alert(`⚠️ ${message}`)
    } else if (type === 'success') {
      alert(`✅ ${message}`)
    } else {
      alert(`ℹ️ ${message}`)
    }
  }, [])

  // 优化的初始化应用
  useEffect(() => {
    let mounted = true
    let initTimeout

    const initializeAppOptimized = async () => {
      try {
        markPerformance(PERFORMANCE_MARKS.APP_START)
        addLog('🚀 UltimateApp 超级优化启动...', 'info')

        // 快速环境检查
        updateAppState({ 
          loadingStep: 'environment', 
          status: '环境检查...', 
          connectionAttempts: 1 
        })
        
        await new Promise(resolve => setTimeout(resolve, 150))
        if (!mounted) return

        // 并行检测钱包和网络
        updateAppState({ 
          loadingStep: 'wallet', 
          status: '并行检测钱包...', 
          connectionAttempts: 2 
        })
        
        // 预加载关键资源
        const preloadPromises = [
          new Promise(resolve => setTimeout(resolve, 100)),
          // 预检查 MetaMask
          typeof window !== 'undefined' && window.ethereum ? Promise.resolve() : Promise.reject(new Error('NoWallet'))
        ]
        
        try {
          await Promise.allSettled(preloadPromises)
        } catch (e) {
          addLog('⚠️ 钱包预检查完成', 'warning')
        }
        
        if (!mounted) return

        // 智能合约优化连接
        updateAppState({ 
          loadingStep: 'contract', 
          status: '智能合约优化中...', 
          connectionAttempts: 3 
        })
        
        await new Promise(resolve => setTimeout(resolve, 100))
        if (!mounted) return

        // 性能优化完成
        updateAppState({ 
          loadingStep: 'ready', 
          status: '优化就绪！🚀', 
          isOptimized: true 
        })

        // 最小化等待时间
        initTimeout = setTimeout(() => {
          if (mounted) {
            updateAppState({ 
              isInitializing: false,
              showLoadingScreen: false,
              lastUpdateTime: Date.now()
            })
            markPerformance('app-ready')
            addLog('✅ 应用优化启动完成', 'success')
          }
        }, OPTIMIZATION_CONFIG.LOADING_TIMEOUT_MS)

      } catch (error) {
        addLog(`❌ 优化初始化失败: ${error.message}`, 'error')
        // 快速失败恢复
        if (mounted) {
          updateAppState({ 
            isInitializing: false,
            showLoadingScreen: false,
            connectionAttempts: 0
          })
        }
      }
    }

    initializeAppOptimized()

    return () => {
      mounted = false
      if (initTimeout) clearTimeout(initTimeout)
    }
  }, [addLog, updateAppState, markPerformance])

  // 钱包连接状态监听
  useEffect(() => {
    if (wallet.isConnected && !appState.performanceMetrics[PERFORMANCE_MARKS.WALLET_CONNECTED]) {
      markPerformance(PERFORMANCE_MARKS.WALLET_CONNECTED)
    }
  }, [wallet.isConnected, appState.performanceMetrics, markPerformance])

  // 数据加载状态监听
  useEffect(() => {
    if (contract.cards.length > 0 && !appState.performanceMetrics[PERFORMANCE_MARKS.DATA_LOADED]) {
      markPerformance(PERFORMANCE_MARKS.DATA_LOADED)
    }
  }, [contract.cards.length, appState.performanceMetrics, markPerformance])

  // 内存管理 - 清理过期日志
  useEffect(() => {
    const cleanup = () => {
      setLogs(prev => prev.slice(-10))
    }

    const interval = setInterval(cleanup, 30000) // 每30秒清理一次
    return () => clearInterval(interval)
  }, [])

  // 加载屏幕
  if (appState.showLoadingScreen) {
    return (
      <LoadingScreen
        currentStep={appState.loadingStep}
        status={appState.status}
        onComplete={() => updateAppState({ showLoadingScreen: false })}
      />
    )
  }

  return (
    <Suspense fallback={<LoadingScreen currentStep="loading" status="加载组件中..." />}>
      <div style={{
        background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
        minHeight: '100vh',
        width: '100vw',
        padding: '20px',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxSizing: 'border-box',
        animation: 'fadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* 错误通知 */}
        {(wallet.error || contract.error) && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(231, 76, 60, 0.95)',
            color: 'white',
            padding: '15px 25px',
            borderRadius: '10px',
            zIndex: 1001,
            fontSize: '14px',
            maxWidth: '90%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            animation: 'slideDown 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            ⚠️ {wallet.error || contract.error}
          </div>
        )}

        {/* 性能监控面板（开发环境） */}
        {import.meta.env.DEV && (
          <details style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.9)',
            padding: '15px',
            borderRadius: '10px',
            fontSize: '11px',
            maxWidth: '320px',
            zIndex: 1000,
            border: '1px solid #444',
            backdropFilter: 'blur(20px)'
          }}>
            <summary style={{ 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              color: '#FFD700',
              marginBottom: '10px'
            }}>
              🔍 性能监控 & 日志
            </summary>
            
            {/* 性能指标 */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ color: '#4ECDC4', fontWeight: 'bold', marginBottom: '5px' }}>
                ⚡ 性能指标:
              </div>
              {Object.entries(appState.performanceMetrics).map(([key, value]) => (
                <div key={key} style={{ fontSize: '10px', marginBottom: '2px' }}>
                  {key}: {new Date(value).toLocaleTimeString()}
                </div>
              ))}
            </div>

            {/* 系统状态 */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ color: '#FF6B6B', fontWeight: 'bold', marginBottom: '5px' }}>
                📊 系统状态:
              </div>
              <div style={{ fontSize: '10px' }}>钱包: {wallet.isConnected ? '✅' : '❌'}</div>
              <div style={{ fontSize: '10px' }}>余额: {wallet.balance} MON</div>
              <div style={{ fontSize: '10px' }}>卡牌: {contract.cards.length} 张</div>
              <div style={{ fontSize: '10px' }}>已选: {appState.selectedCards.length}/5</div>
            </div>
            
            {/* 日志记录 */}
            <div>
              <div style={{ color: '#3498DB', fontWeight: 'bold', marginBottom: '5px' }}>
                📝 最近日志:
              </div>
              <div style={{ maxHeight: '120px', overflow: 'auto' }}>
                {logs.slice(-5).map((log) => (
                  <div key={log.id} style={{ 
                    fontSize: '9px',
                    margin: '2px 0',
                    color: log.type === 'error' ? '#E74C3C' : 
                           log.type === 'success' ? '#27AE60' : 
                           log.type === 'warning' ? '#F39C12' : '#BDC3C7'
                  }}>
                    [{log.timestamp}] {log.message}
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}

        {/* 主内容区域 */}
        <div style={{ 
          maxWidth: '1400px',
          margin: '60px auto 0',
          display: 'grid',
          gridTemplateColumns: 'minmax(350px, 400px) 1fr',
          gap: '40px',
          minHeight: 'calc(100vh - 100px)',
          animation: 'slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          
          {/* 左侧控制面板 */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '30px',
            borderRadius: '25px',
            height: 'fit-content',
            border: '1px solid rgba(255,255,255,0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            position: 'sticky',
            top: '80px'
          }}>
            {/* 游戏标题 */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h1 style={{ 
                fontSize: '2.2rem', 
                margin: '0 0 15px 0',
                background: 'linear-gradient(45deg, #FFD700, #FF6B6B, #4ECDC4)',
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold',
                textShadow: '0 4px 8px rgba(0,0,0,0.3)',
                animation: 'titleGlow 3s ease-in-out infinite alternate'
              }}>
                🎴 Monad 卡牌世界
              </h1>
              
              <div style={{
                fontSize: '0.9rem',
                opacity: 0.8,
                color: '#4ECDC4',
                marginBottom: '20px'
              }}>
                Web3 加密货币卡牌竞技游戏
              </div>

              {/* 状态卡片 */}
              <div style={{ 
                background: 'rgba(0,0,0,0.4)',
                padding: '20px',
                borderRadius: '15px',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  fontSize: '0.9rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {contract.participationFee}
                    </div>
                    <div style={{ opacity: 0.8, fontSize: '0.8rem' }}>参与费用 (MON)</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#4ECDC4', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {contract.cards.length}
                    </div>
                    <div style={{ opacity: 0.8, fontSize: '0.8rem' }}>我的卡牌</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#FF6B6B', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {wallet.balance?.slice(0, 6)}
                    </div>
                    <div style={{ opacity: 0.8, fontSize: '0.8rem' }}>钱包余额</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#27AE60', fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {appState.selectedCards.length}/5
                    </div>
                    <div style={{ opacity: 0.8, fontSize: '0.8rem' }}>已选卡牌</div>
                  </div>
                </div>

                {wallet.address && (
                  <div style={{ 
                    marginTop: '15px',
                    fontSize: '0.75rem',
                    opacity: 0.7,
                    textAlign: 'center',
                    wordBreak: 'break-all'
                  }}>
                    👤 {wallet.address.slice(0,6)}...{wallet.address.slice(-4)}
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮区域 */}
            <div style={{ marginBottom: '25px' }}>
              {!wallet.isConnected ? (
                <button 
                  onClick={wallet.connectWallet}
                  disabled={wallet.isConnecting}
                  style={{
                    background: wallet.isConnecting 
                      ? 'linear-gradient(45deg, #666, #555)' 
                      : 'linear-gradient(45deg, #3498DB, #2980B9)',
                    border: 'none',
                    color: 'white',
                    padding: '18px 25px',
                    fontSize: '1.1rem',
                    borderRadius: '15px',
                    cursor: wallet.isConnecting ? 'not-allowed' : 'pointer',
                    width: '100%',
                    fontWeight: 'bold',
                    boxShadow: wallet.isConnecting 
                      ? 'none' 
                      : '0 8px 25px rgba(52, 152, 219, 0.4)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginBottom: '15px'
                  }}
                  onMouseEnter={(e) => {
                    if (!wallet.isConnecting) {
                      e.target.style.transform = 'translateY(-3px)'
                      e.target.style.boxShadow = '0 12px 35px rgba(52, 152, 219, 0.5)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!wallet.isConnecting) {
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 8px 25px rgba(52, 152, 219, 0.4)'
                    }
                  }}
                >
                  {wallet.isConnecting ? '🔄 连接中...' : '🔗 连接 MetaMask 钱包'}
                </button>
              ) : (
                <>
                  {/* 领取卡牌按钮 */}
                  <button 
                    onClick={handleClaimCards}
                    disabled={appState.isClaimingCards || contract.isLoading}
                    style={{
                      background: (appState.isClaimingCards || contract.isLoading) 
                        ? 'linear-gradient(45deg, #666, #555)' 
                        : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                      border: 'none',
                      color: 'white',
                      padding: '18px 25px',
                      fontSize: '1.1rem',
                      borderRadius: '15px',
                      cursor: (appState.isClaimingCards || contract.isLoading) ? 'not-allowed' : 'pointer',
                      width: '100%',
                      fontWeight: 'bold',
                      boxShadow: (appState.isClaimingCards || contract.isLoading) 
                        ? 'none' 
                        : '0 8px 25px rgba(255, 107, 107, 0.4)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      marginBottom: '15px',
                      opacity: (appState.isClaimingCards || contract.isLoading) ? 0.7 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!appState.isClaimingCards && !contract.isLoading) {
                        e.target.style.transform = 'translateY(-3px)'
                        e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 107, 0.5)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!appState.isClaimingCards && !contract.isLoading) {
                        e.target.style.transform = 'translateY(0)'
                        e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)'
                      }
                    }}
                  >
                    {appState.isClaimingCards ? '🔄 领取中...' : 
                     contract.isLoading ? '📊 加载中...' : 
                     '🎁 领取今日卡牌'}
                  </button>

                  {/* 刷新数据按钮 */}
                  <button 
                    onClick={() => contract.refreshData()}
                    disabled={contract.isLoading}
                    style={{
                      background: contract.isLoading 
                        ? 'linear-gradient(45deg, #444, #333)' 
                        : 'linear-gradient(45deg, #9B59B6, #8E44AD)',
                      border: 'none',
                      color: 'white',
                      padding: '12px 20px',
                      fontSize: '0.95rem',
                      borderRadius: '12px',
                      cursor: contract.isLoading ? 'not-allowed' : 'pointer',
                      width: '100%',
                      fontWeight: '500',
                      transition: 'all 0.3s ease',
                      opacity: contract.isLoading ? 0.6 : 1
                    }}
                  >
                    {contract.isLoading ? '🔄 刷新中...' : '🔄 刷新数据'}
                  </button>
                </>
              )}
            </div>

            {/* 手牌状态 */}
            {contract.activeHand?.isActive && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.2), rgba(34, 153, 84, 0.1))',
                padding: '20px',
                borderRadius: '15px',
                border: '2px solid #27AE60',
                marginBottom: '25px',
                backdropFilter: 'blur(10px)'
              }}>
                <h4 style={{ 
                  color: '#27AE60', 
                  margin: '0 0 12px 0', 
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}>
                  ✅ 当前手牌
                </h4>
                <div style={{ fontSize: '0.95rem', marginBottom: '8px' }}>
                  总分数: <span style={{ color: '#FFD700', fontWeight: 'bold' }}>
                    {contract.activeHand.totalScore}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                  创建时间: {new Date(Number(contract.activeHand.timestamp) * 1000).toLocaleString()}
                </div>
              </div>
            )}

            {/* 游戏说明 */}
            <div style={{
              background: 'rgba(52, 152, 219, 0.1)',
              padding: '20px',
              borderRadius: '15px',
              border: '1px solid rgba(52, 152, 219, 0.3)',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              backdropFilter: 'blur(10px)'
            }}>
              <h4 style={{ 
                color: '#3498DB', 
                margin: '0 0 15px 0',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}>
                🎮 游戏玩法
              </h4>
              <div style={{ opacity: 0.9 }}>
                • 每日免费领取 5 张随机加密货币卡牌<br/>
                • 卡牌包含 BTC、ETH、SOL 等 30 种主流币种<br/>
                • 5 个稀有度等级：普通→稀有→史诗→传说→神话<br/>
                • 基于真实市场价格波动的竞技系统<br/>
                • 选择 5 张卡牌组成手牌参与竞赛<br/>
                • 24 小时竞赛周期，最高分获胜
              </div>
            </div>
          </div>

          {/* 右侧卡牌展示区域 */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '30px',
            borderRadius: '25px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            minHeight: '600px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ 
              textAlign: 'center', 
              marginBottom: '30px',
              color: '#FFD700',
              fontSize: '2rem',
              fontWeight: 'bold',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)'
            }}>
              🎁 我的卡牌收藏 ({contract.cards.length})
            </h2>
            
            {/* 选择提示 */}
            {contract.cards.length > 0 && appState.selectedCards.length < 5 && (
              <div style={{
                textAlign: 'center',
                marginBottom: '25px',
                padding: '15px 20px',
                background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(255, 152, 0, 0.1))',
                borderRadius: '15px',
                border: '2px solid rgba(255, 193, 7, 0.3)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ 
                  color: '#FFC107', 
                  fontSize: '1.1rem', 
                  marginBottom: '5px',
                  fontWeight: 'bold'
                }}>
                  💡 请选择 5 张卡牌组成手牌参与竞赛
                </div>
                <div style={{ 
                  fontSize: '0.9rem', 
                  opacity: 0.8,
                  color: '#FFD700'
                }}>
                  已选择 {appState.selectedCards.length}/5 张卡牌
                </div>
              </div>
            )}

            {/* 优化的卡牌网格 - 分批渲染 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px',
              minHeight: '400px'
            }}>
              {contract.cards.length > 0 ? (
                contract.cards
                  .slice(0, (appState.renderBatch + 1) * OPTIMIZATION_CONFIG.CARD_BATCH_SIZE)
                  .map((card, index) => (
                    <LazyCard
                      key={`optimized-card-${card.id || index}-${appState.lastUpdateTime}`}
                      card={card}
                      index={index}
                      isSelected={appState.selectedCards.includes(index)}
                      onSelect={handleCardSelection}
                      animationDelay={index * OPTIMIZATION_CONFIG.ANIMATION_DELAY_MS}
                    />
                  ))
              ) : (
                /* 精美的空状态 */
                <div style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '80px 30px',
                  background: 'linear-gradient(135deg, rgba(255,193,7,0.1), rgba(255,152,0,0.05))',
                  borderRadius: '25px',
                  border: '3px dashed rgba(255,193,7,0.3)',
                  minHeight: '500px',
                  backdropFilter: 'blur(10px)',
                  animation: 'emptyStateFloat 6s ease-in-out infinite'
                }}>
                  <div style={{ 
                    fontSize: '8rem', 
                    marginBottom: '30px', 
                    opacity: 0.7,
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'bounce 3s ease-in-out infinite'
                  }}>
                    🎴
                  </div>
                  
                  <h3 style={{ 
                    color: '#FFC107', 
                    marginBottom: '20px', 
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    textShadow: '0 4px 8px rgba(0,0,0,0.3)'
                  }}>
                    {appState.isOptimized ? '🚀 优化完成 - 暂无卡牌' : '暂无卡牌'}
                  </h3>
                  
                  <p style={{ 
                    color: '#FFD700', 
                    fontSize: '1.2rem', 
                    textAlign: 'center',
                    maxWidth: '500px',
                    lineHeight: '1.6',
                    opacity: 0.9,
                    marginBottom: '30px'
                  }}>
                    {appState.isOptimized && appState.connectionAttempts > 0 ? 
                      `🚀 超级优化完成！${wallet.isConnected ? '点击左侧"🎁 领取今日卡牌"开始游戏' : '请连接 MetaMask 钱包开始体验'}` :
                      wallet.isConnected ? 
                        '点击左侧"🎁 领取今日卡牌"按钮，开始你的加密货币卡牌收藏之旅！' :
                        '请先连接 MetaMask 钱包，然后领取你的第一批卡牌！'
                  }</p>

                  {/* 空状态下的特性展示 */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '20px',
                    maxWidth: '600px',
                    width: '100%'
                  }}>
                    {[
                      { icon: '₿', title: 'Bitcoin', rarity: '神话' },
                      { icon: 'Ξ', title: 'Ethereum', rarity: '神话' },
                      { icon: '◎', title: 'Solana', rarity: '神话' }
                    ].map((preview, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))',
                          padding: '20px',
                          borderRadius: '15px',
                          textAlign: 'center',
                          border: '1px solid rgba(255,215,0,0.3)',
                          backdropFilter: 'blur(5px)',
                          animation: `previewFloat ${3 + idx}s ease-in-out infinite`
                        }}
                      >
                        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
                          {preview.icon}
                        </div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#FFD700' }}>
                          {preview.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8, color: '#FFA500' }}>
                          {preview.rarity}级
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 加载更多卡牌按钮 */}
            {contract.cards.length > (appState.renderBatch + 1) * OPTIMIZATION_CONFIG.CARD_BATCH_SIZE && (
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button
                  onClick={() => {
                    updateAppState(prev => ({ 
                      ...prev, 
                      renderBatch: prev.renderBatch + 1 
                    }))
                    addLog(`📊 加载更多卡牌 (${(appState.renderBatch + 2) * OPTIMIZATION_CONFIG.CARD_BATCH_SIZE}/${contract.cards.length})`, 'info')
                  }}
                  style={{
                    background: 'linear-gradient(45deg, #3498DB, #2980B9)',
                    border: 'none',
                    color: 'white',
                    padding: '15px 30px',
                    fontSize: '1rem',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 8px 25px rgba(52, 152, 219, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 12px 35px rgba(52, 152, 219, 0.5)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 8px 25px rgba(52, 152, 219, 0.4)'
                  }}
                >
                  📈 加载更多卡牌 ({contract.cards.length - (appState.renderBatch + 1) * OPTIMIZATION_CONFIG.CARD_BATCH_SIZE} 张)
                </button>
              </div>
            )}

            {/* 手牌创建提示 */}
            {appState.selectedCards.length === 5 && (
              <div style={{
                marginTop: '30px',
                textAlign: 'center',
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(39, 174, 96, 0.2), rgba(34, 153, 84, 0.1))',
                borderRadius: '15px',
                border: '2px solid #27AE60',
                animation: 'pulseGreen 2s ease-in-out infinite'
              }}>
                <div style={{ 
                  color: '#27AE60', 
                  fontSize: '1.2rem', 
                  marginBottom: '10px',
                  fontWeight: 'bold'
                }}>
                  🎉 已选择 5 张卡牌！
                </div>
                <div style={{ 
                  fontSize: '1rem', 
                  opacity: 0.9,
                  color: '#2ECC71'
                }}>
                  您现在可以创建手牌参与竞赛了
                </div>
                <button
                  onClick={() => {
                    // 这里可以实现创建手牌的逻辑
                    addLog('🤚 手牌创建功能即将推出！', 'info')
                  }}
                  style={{
                    marginTop: '15px',
                    background: 'linear-gradient(45deg, #27AE60, #2ECC71)',
                    border: 'none',
                    color: 'white',
                    padding: '12px 25px',
                    fontSize: '1rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 8px 25px rgba(39, 174, 96, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)'
                  }}
                >
                  🤚 创建手牌
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 优化的全局CSS动画 */}
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes slideDown {
            from { transform: translateX(-50%) translateY(-30px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
          
          @keyframes slideUp {
            from { transform: translateY(40px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          @keyframes titleGlow {
            from { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)); }
            to { filter: drop-shadow(0 0 30px rgba(255, 215, 0, 0.8)); }
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-30px); }
            60% { transform: translateY(-15px); }
          }
          
          @keyframes emptyStateFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes previewFloat {
            0%, 100% { transform: translateY(0px) rotateY(0deg); }
            50% { transform: translateY(-8px) rotateY(5deg); }
          }
          
          @keyframes pulseGreen {
            0%, 100% { box-shadow: 0 0 20px rgba(39, 174, 96, 0.3); }
            50% { box-shadow: 0 0 40px rgba(39, 174, 96, 0.6); }
          }
          
          @keyframes optimizedSlideIn {
            from { 
              opacity: 0; 
              transform: translateY(20px) scale(0.95); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1); 
            }
          }
        `}</style>
      </div>
    </Suspense>
  )
}

export default UltimateApp
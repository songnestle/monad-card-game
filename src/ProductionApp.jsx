import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import './App.css'

// 环境配置
const CONFIG = {
  RPC_URL: import.meta.env.VITE_RPC_URL || 'https://testnet-rpc.monad.xyz',
  CONTRACT_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS,
  CHAIN_ID: 10143, // Monad Testnet
  CHAIN_ID_HEX: '0x279f'
}

// 合约ABI
const CONTRACT_ABI = [
  "function claimDailyCards() public payable",
  "function createHand(uint[5] cardIndexes) public",
  "function getMyCards() public view returns (tuple(uint id, string symbol, string name, uint rarity, uint baseScore, uint level, uint timestamp)[])",
  "function getMyActiveHand() public view returns (tuple(uint[5] cardIndexes, uint totalScore, uint timestamp, bool isActive))",
  "function getCurrentContest() public view returns (uint startTime, uint endTime, uint participantCount, uint prizePool)",
  "function participationFee() public view returns (uint)"
]

function ProductionApp() {
  // 核心状态
  const [appState, setAppState] = useState({
    isLoading: true,
    error: null,
    status: '初始化中...',
    walletConnected: false,
    userAddress: '',
    cards: [],
    participationFee: '0',
    claimLoading: false
  })

  const [logs, setLogs] = useState([])

  // 安全的状态更新函数
  const updateState = useCallback((updates) => {
    setAppState(prev => ({ ...prev, ...updates }))
  }, [])

  // 日志函数
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = { message, type, timestamp }
    setLogs(prev => [...prev.slice(-8), logEntry])
    console.log(`[${timestamp}] ${message}`)
  }, [])

  // 错误处理函数
  const handleError = useCallback((error, context = '') => {
    const message = error?.message || error || '未知错误'
    addLog(`❌ ${context}${context ? ': ' : ''}${message}`, 'error')
    updateState({ error: message })
  }, [addLog, updateState])

  // 检查环境
  const checkEnvironment = useCallback(() => {
    if (typeof window === 'undefined') {
      throw new Error('请在浏览器环境中运行')
    }
    
    if (!window.ethereum) {
      throw new Error('请安装MetaMask钱包')
    }

    if (!CONFIG.CONTRACT_ADDRESS) {
      throw new Error('合约地址未配置')
    }

    addLog('✅ 环境检查通过', 'success')
    return true
  }, [addLog])

  // 连接钱包
  const connectWallet = useCallback(async () => {
    try {
      addLog('🔄 连接钱包...', 'info')
      
      // 请求账户权限
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('未获取到账户')
      }

      // 检查网络
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const currentChainId = parseInt(chainId, 16)
      
      if (currentChainId !== CONFIG.CHAIN_ID) {
        addLog(`🔄 切换网络: ${currentChainId} -> ${CONFIG.CHAIN_ID}`, 'info')
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.CHAIN_ID_HEX }]
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            addLog('➕ 添加Monad测试网...', 'info')
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: CONFIG.CHAIN_ID_HEX,
                chainName: 'Monad Testnet',
                nativeCurrency: {
                  name: 'Monad',
                  symbol: 'MON',
                  decimals: 18,
                },
                rpcUrls: [CONFIG.RPC_URL],
                blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
              }]
            })
          } else {
            throw switchError
          }
        }
      }

      updateState({
        walletConnected: true,
        userAddress: accounts[0],
        error: null
      })

      addLog(`✅ 钱包连接成功: ${accounts[0].slice(0,6)}...`, 'success')
      return true

    } catch (error) {
      handleError(error, '钱包连接失败')
      updateState({ walletConnected: false })
      return false
    }
  }, [addLog, updateState, handleError])

  // 加载合约数据
  const loadContractData = useCallback(async () => {
    try {
      if (!appState.walletConnected) {
        addLog('⚠️ 钱包未连接，跳过数据加载', 'warning')
        return
      }

      addLog('🔄 加载合约数据...', 'info')
      updateState({ status: '🔄 连接合约中...' })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      // 并行获取数据以提高性能
      const [feeResult, cardsResult] = await Promise.allSettled([
        contract.participationFee(),
        contract.getMyCards()
      ])

      // 处理参与费用
      if (feeResult.status === 'fulfilled') {
        const fee = ethers.formatEther(feeResult.value)
        updateState({ participationFee: fee })
        addLog(`✅ 参与费用: ${fee} MON`, 'success')
      } else {
        addLog(`⚠️ 获取费用失败: ${feeResult.reason?.message}`, 'warning')
      }

      // 处理卡牌数据
      if (cardsResult.status === 'fulfilled') {
        const cards = cardsResult.value || []
        updateState({ cards })
        addLog(`✅ 获取卡牌: ${cards.length} 张`, 'success')
      } else {
        addLog(`⚠️ 获取卡牌失败: ${cardsResult.reason?.message}`, 'warning')
        updateState({ cards: [] })
      }

      updateState({ 
        status: '✅ 数据加载完成',
        error: null 
      })

    } catch (error) {
      handleError(error, '合约数据加载失败')
      updateState({ status: '❌ 加载失败' })
    }
  }, [appState.walletConnected, addLog, updateState, handleError])

  // 领取卡牌
  const claimDailyCards = useCallback(async () => {
    if (!appState.walletConnected || appState.claimLoading) {
      return
    }

    try {
      updateState({ claimLoading: true })
      addLog('🎁 开始领取卡牌...', 'info')

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      // 检查余额
      const balance = await provider.getBalance(appState.userAddress)
      const feeWei = ethers.parseEther(appState.participationFee)
      
      addLog(`💰 当前余额: ${ethers.formatEther(balance)} MON`, 'info')
      addLog(`💰 需要费用: ${appState.participationFee} MON`, 'info')

      if (balance < feeWei) {
        throw new Error(`余额不足: 需要 ${appState.participationFee} MON，当前 ${ethers.formatEther(balance)} MON`)
      }

      // 发送交易
      const tx = await contract.claimDailyCards({ 
        value: feeWei,
        gasLimit: 500000
      })

      addLog(`📤 交易已发送: ${tx.hash.slice(0,10)}...`, 'info')
      updateState({ status: '⏳ 等待交易确认...' })

      const receipt = await tx.wait()
      addLog(`✅ 交易确认成功 (Gas: ${receipt.gasUsed})`, 'success')

      // 延迟重新加载数据，让区块链状态更新
      setTimeout(() => {
        loadContractData()
      }, 3000)

      updateState({ status: '✅ 领取成功！' })

    } catch (error) {
      const errorMsg = error?.message || '未知错误'
      handleError(error, '领取卡牌失败')

      // 用户友好的错误提示
      if (errorMsg.includes('Already claimed')) {
        alert('今日已领取过卡牌，请明天再来！')
      } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('余额不足')) {
        alert('MON余额不足，请先获取测试币')
      } else if (errorMsg.includes('user rejected')) {
        alert('用户取消了交易')
      } else {
        alert(`领取失败: ${errorMsg}`)
      }
    } finally {
      updateState({ claimLoading: false })
    }
  }, [appState.walletConnected, appState.claimLoading, appState.userAddress, appState.participationFee, addLog, updateState, handleError, loadContractData])

  // 应用初始化
  useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
      try {
        addLog('🚀 应用启动中...', 'info')

        // 环境检查
        checkEnvironment()

        // 模拟加载时间
        await new Promise(resolve => setTimeout(resolve, 1500))

        if (!mounted) return

        updateState({ 
          isLoading: false,
          status: '等待连接钱包...' 
        })

        // 检查是否已有连接的账户
        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' })
            if (accounts.length > 0) {
              const chainId = await window.ethereum.request({ method: 'eth_chainId' })
              if (parseInt(chainId, 16) === CONFIG.CHAIN_ID) {
                updateState({ 
                  walletConnected: true,
                  userAddress: accounts[0] 
                })
                addLog('✅ 检测到已连接的钱包', 'success')
                
                if (mounted) {
                  await loadContractData()
                }
              }
            }
          } catch (error) {
            addLog(`⚠️ 自动连接检查失败: ${error.message}`, 'warning')
          }
        }

      } catch (error) {
        handleError(error, '应用初始化失败')
        updateState({ isLoading: false })
      }
    }

    initializeApp()

    return () => {
      mounted = false
    }
  }, [checkEnvironment, updateState, handleError, addLog, loadContractData])

  // 加载屏幕
  if (appState.isLoading) {
    return (
      <div style={{
        background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '20px',
            animation: 'bounce 2s infinite'
          }}>🎴</div>
          <div style={{ fontSize: '1.5rem' }}>加载 Monad 卡牌世界...</div>
          <div style={{ 
            fontSize: '0.9rem', 
            opacity: 0.7, 
            marginTop: '10px' 
          }}>
            初始化区块链连接...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
      minHeight: '100vh',
      width: '100vw',
      padding: '20px',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* 错误提示 */}
      {appState.error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(231, 76, 60, 0.95)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          zIndex: 1001,
          fontSize: '14px',
          maxWidth: '90%',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          ⚠️ {appState.error}
        </div>
      )}

      {/* 调试面板 */}
      <details style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0,0,0,0.9)',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        maxWidth: '280px',
        zIndex: 1000,
        border: '1px solid #444'
      }}>
        <summary style={{ 
          cursor: 'pointer', 
          fontWeight: 'bold', 
          color: '#FFD700',
          marginBottom: '8px'
        }}>
          🔍 系统状态
        </summary>
        
        <div style={{ marginBottom: '4px' }}>状态: {appState.status}</div>
        <div style={{ marginBottom: '4px' }}>
          钱包: {appState.walletConnected ? '✅ 已连接' : '❌ 未连接'}
        </div>
        <div style={{ marginBottom: '8px' }}>卡牌: {appState.cards.length} 张</div>
        
        <div style={{ borderTop: '1px solid #444', paddingTop: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#3498DB' }}>
            最近日志:
          </div>
          <div style={{ maxHeight: '80px', overflow: 'auto' }}>
            {logs.slice(-3).map((log, index) => (
              <div key={index} style={{ 
                fontSize: '10px',
                margin: '2px 0',
                color: log.type === 'error' ? '#E74C3C' : 
                       log.type === 'success' ? '#27AE60' : 
                       log.type === 'warning' ? '#F39C12' : '#BDC3C7'
              }}>
                {log.message}
              </div>
            ))}
          </div>
        </div>
      </details>

      {/* 主内容 */}
      <div style={{ 
        maxWidth: '1200px',
        margin: '60px auto 0',
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: '30px',
        minHeight: 'calc(100vh - 100px)'
      }}>
        
        {/* 左侧面板 */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '25px',
          borderRadius: '20px',
          height: 'fit-content',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          {/* 标题 */}
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              margin: '0 0 15px 0',
              background: 'linear-gradient(45deg, #FFD700, #FF6B6B)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}>
              🎴 Monad 卡牌世界
            </h1>
            
            {/* 状态信息 */}
            <div style={{ 
              fontSize: '0.9rem', 
              opacity: 0.9, 
              lineHeight: '1.6',
              background: 'rgba(0,0,0,0.3)',
              padding: '15px',
              borderRadius: '10px'
            }}>
              <div style={{ marginBottom: '6px' }}>
                💰 参与费用: {appState.participationFee} MON
              </div>
              <div style={{ marginBottom: '6px' }}>
                🎴 我的卡牌: {appState.cards.length} 张
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                {appState.userAddress && (
                  <>👤 {appState.userAddress.slice(0,6)}...{appState.userAddress.slice(-4)}</>
                )}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          {!appState.walletConnected ? (
            <button 
              onClick={connectWallet}
              style={{
                background: 'linear-gradient(45deg, #3498DB, #2980B9)',
                border: 'none',
                color: 'white',
                padding: '15px 20px',
                fontSize: '1rem',
                borderRadius: '12px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              🔗 连接 MetaMask 钱包
            </button>
          ) : (
            <button 
              onClick={claimDailyCards}
              disabled={appState.claimLoading}
              style={{
                background: appState.claimLoading ? 
                  'linear-gradient(45deg, #666, #555)' : 
                  'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                border: 'none',
                color: 'white',
                padding: '15px 20px',
                fontSize: '1rem',
                borderRadius: '12px',
                cursor: appState.claimLoading ? 'not-allowed' : 'pointer',
                width: '100%',
                fontWeight: 'bold',
                boxShadow: appState.claimLoading ? 'none' : '0 4px 15px rgba(255, 107, 107, 0.3)',
                transition: 'all 0.2s',
                opacity: appState.claimLoading ? 0.7 : 1
              }}
            >
              {appState.claimLoading ? '🔄 处理中...' : '🎁 领取今日卡牌'}
            </button>
          )}

          {/* 游戏说明 */}
          <div style={{
            marginTop: '25px',
            padding: '15px',
            background: 'rgba(52, 152, 219, 0.15)',
            borderRadius: '12px',
            border: '1px solid rgba(52, 152, 219, 0.3)',
            fontSize: '0.85rem',
            lineHeight: '1.5'
          }}>
            <h4 style={{ 
              color: '#3498DB', 
              margin: '0 0 10px 0',
              fontSize: '1rem'
            }}>
              🎮 游戏玩法
            </h4>
            <div style={{ opacity: 0.9 }}>
              • 每日免费领取 5 张随机加密货币卡牌<br/>
              • 卡牌包含 BTC、ETH、SOL 等 30 种主流币种<br/>
              • 5 个稀有度等级：普通→稀有→史诗→传说→神话<br/>
              • 基于真实市场价格波动的竞技系统<br/>
              • 24 小时竞赛周期，最高分获胜
            </div>
          </div>
        </div>

        {/* 右侧卡牌区域 */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '25px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(5px)',
          minHeight: '500px'
        }}>
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: '25px',
            color: '#FFD700',
            fontSize: '1.6rem',
            fontWeight: 'bold'
          }}>
            🎁 我的卡牌收藏 ({appState.cards.length})
          </h2>
          
          {/* 卡牌网格 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '15px',
            minHeight: '300px'
          }}>
            {appState.cards.length > 0 ? (
              appState.cards.map((card, index) => (
                <div 
                  key={`card-${card.id || index}`}
                  style={{
                    background: `linear-gradient(135deg, 
                      ${card.rarity >= 5 ? '#FFD700, #FFA500' : 
                        card.rarity >= 4 ? '#9B59B6, #8E44AD' :
                        card.rarity >= 3 ? '#3498DB, #2980B9' :
                        card.rarity >= 2 ? '#27AE60, #229954' : 
                        '#95A5A6, #7F8C8D'})`,
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    padding: '15px',
                    textAlign: 'center',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-5px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  {/* 卡牌图标 */}
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
                    {card.symbol === 'BTC' ? '₿' : 
                     card.symbol === 'ETH' ? 'Ξ' : 
                     card.symbol === 'SOL' ? '◎' : 
                     card.symbol === 'BNB' ? '🟡' :
                     card.symbol === 'ADA' ? '🔵' :
                     '💰'}
                  </div>
                  
                  {/* 卡牌信息 */}
                  <h4 style={{ 
                    margin: '8px 0', 
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>
                    {card.symbol}
                  </h4>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    opacity: 0.9,
                    marginBottom: '8px'
                  }}>
                    {card.name}
                  </div>
                  
                  {/* 卡牌属性 */}
                  <div style={{ 
                    fontSize: '0.75rem', 
                    opacity: 0.8,
                    lineHeight: '1.3'
                  }}>
                    <div>⭐ 稀有度: {Number(card.rarity)}</div>
                    <div>💰 分数: {Number(card.baseScore)}</div>
                    <div>🔥 等级: {Number(card.level)}</div>
                  </div>
                </div>
              ))
            ) : (
              /* 空状态 */
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '50px 20px',
                background: 'linear-gradient(135deg, rgba(255,193,7,0.1), rgba(255,152,0,0.05))',
                borderRadius: '15px',
                border: '2px dashed rgba(255,193,7,0.3)',
                minHeight: '300px'
              }}>
                <div style={{ 
                  fontSize: '5rem', 
                  marginBottom: '20px', 
                  opacity: 0.7 
                }}>🎴</div>
                
                <h3 style={{ 
                  color: '#FFC107', 
                  marginBottom: '15px', 
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}>
                  暂无卡牌
                </h3>
                
                <p style={{ 
                  color: '#FFD700', 
                  fontSize: '1rem', 
                  textAlign: 'center',
                  maxWidth: '400px',
                  lineHeight: '1.5',
                  opacity: 0.9
                }}>
                  {appState.walletConnected ? 
                    '点击左侧"🎁 领取今日卡牌"按钮，开始你的加密货币卡牌收藏之旅！' :
                    '请先连接 MetaMask 钱包，然后领取你的第一批卡牌！'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-30px);
          }
          60% {
            transform: translateY(-15px);
          }
        }
      `}</style>
    </div>
  )
}

export default ProductionApp
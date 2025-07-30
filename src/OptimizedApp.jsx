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

function OptimizedApp() {
  // 核心状态
  const [appState, setAppState] = useState({
    isLoading: true,
    loadingStep: 'init', // init, wallet, contract, ready
    error: null,
    status: '启动中...',
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
      updateState({ status: '正在连接钱包...', loadingStep: 'wallet' })
      
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
        updateState({ status: '正在切换网络...' })
        
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CONFIG.CHAIN_ID_HEX }]
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            addLog('➕ 添加Monad测试网...', 'info')
            updateState({ status: '正在添加网络...' })
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
        error: null,
        status: '钱包连接成功',
        loadingStep: 'contract'
      })

      addLog(`✅ 钱包连接成功: ${accounts[0].slice(0,6)}...`, 'success')
      return true

    } catch (error) {
      handleError(error, '钱包连接失败')
      updateState({ walletConnected: false, loadingStep: 'init' })
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
      updateState({ status: '正在连接合约...', loadingStep: 'contract' })

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      updateState({ status: '正在获取数据...' })

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
        status: '✅ 准备就绪',
        error: null,
        loadingStep: 'ready',
        isLoading: false
      })

    } catch (error) {
      handleError(error, '合约数据加载失败')
      updateState({ status: '❌ 加载失败', loadingStep: 'init' })
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

  // 快速初始化 - 减少等待时间
  useEffect(() => {
    let mounted = true

    const quickInit = async () => {
      try {
        addLog('🚀 快速启动...', 'info')
        updateState({ status: '检查环境...', loadingStep: 'init' })

        // 环境检查
        checkEnvironment()

        // 缩短初始加载时间到800ms
        await new Promise(resolve => setTimeout(resolve, 800))

        if (!mounted) return

        updateState({ status: '检查钱包连接...' })

        // 检查是否已有连接的账户
        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' })
            if (accounts.length > 0) {
              const chainId = await window.ethereum.request({ method: 'eth_chainId' })
              if (parseInt(chainId, 16) === CONFIG.CHAIN_ID) {
                updateState({ 
                  walletConnected: true,
                  userAddress: accounts[0],
                  status: '自动连接成功',
                  loadingStep: 'contract'
                })
                addLog('✅ 检测到已连接的钱包', 'success')
                
                if (mounted) {
                  await loadContractData()
                }
              } else {
                // 网络不匹配，显示连接界面
                updateState({ 
                  isLoading: false,
                  status: '请连接正确网络...',
                  loadingStep: 'init'
                })
              }
            } else {
              // 没有连接的账户，显示连接界面
              updateState({ 
                isLoading: false,
                status: '等待连接钱包...',
                loadingStep: 'init'
              })
            }
          } catch (error) {
            addLog(`⚠️ 自动连接检查失败: ${error.message}`, 'warning')
            updateState({ 
              isLoading: false,
              status: '等待连接钱包...',
              loadingStep: 'init'
            })
          }
        }

      } catch (error) {
        handleError(error, '应用初始化失败')
        updateState({ 
          isLoading: false,
          status: '初始化失败',
          loadingStep: 'init'
        })
      }
    }

    quickInit()

    return () => {
      mounted = false
    }
  }, [checkEnvironment, updateState, handleError, addLog, loadContractData])

  // 获取加载步骤显示信息
  const getLoadingStepInfo = () => {
    switch (appState.loadingStep) {
      case 'init':
        return { icon: '🔧', text: '系统初始化中...', progress: 25 }
      case 'wallet':
        return { icon: '🔗', text: '连接钱包中...', progress: 50 }
      case 'contract':
        return { icon: '📜', text: '加载合约数据...', progress: 75 }
      case 'ready':
        return { icon: '✅', text: '准备完成！', progress: 100 }
      default:
        return { icon: '🎴', text: '启动中...', progress: 10 }
    }
  }

  // 改进的加载屏幕
  if (appState.isLoading) {
    const stepInfo = getLoadingStepInfo()
    
    return (
      <div style={{
        background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          {/* 主图标 */}
          <div style={{ 
            fontSize: '4rem', 
            marginBottom: '20px',
            animation: 'pulse 2s infinite'
          }}>
            {stepInfo.icon}
          </div>
          
          {/* 主标题 */}
          <h1 style={{
            fontSize: '2rem',
            marginBottom: '10px',
            background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            Monad 卡牌世界
          </h1>
          
          {/* 步骤信息 */}
          <div style={{ 
            fontSize: '1.2rem',
            marginBottom: '30px',
            opacity: 0.9
          }}>
            {stepInfo.text}
          </div>
          
          {/* 进度条 */}
          <div style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '20px'
          }}>
            <div style={{
              width: `${stepInfo.progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4ECDC4, #44A08D)',
              borderRadius: '3px',
              transition: 'width 0.5s ease'
            }} />
          </div>
          
          {/* 状态文本 */}
          <div style={{ 
            fontSize: '0.9rem', 
            opacity: 0.7,
            lineHeight: '1.4'
          }}>
            {appState.status}
            <br />
            <small style={{ opacity: 0.6 }}>
              正在为您准备最佳的游戏体验...
            </small>
          </div>
        </div>
        
        {/* CSS 动画 */}
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
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
      boxSizing: 'border-box',
      // 添加渐入动画
      animation: 'fadeIn 0.5s ease-in'
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
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'slideDown 0.3s ease'
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
        minHeight: 'calc(100vh - 100px)',
        // 添加渐入动画
        animation: 'slideUp 0.6s ease'
      }}>
        
        {/* 左侧面板 */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '25px',
          borderRadius: '20px',
          height: 'fit-content',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
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
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
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
              onMouseEnter={(e) => {
                if (!appState.claimLoading) e.target.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                if (!appState.claimLoading) e.target.style.transform = 'translateY(0)'
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
          minHeight: '500px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
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
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    animation: `cardSlideIn 0.6s ease ${index * 0.1}s both`
                  }}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-5px) scale(1.02)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0) scale(1)'}
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
                minHeight: '300px',
                animation: 'fadeIn 0.8s ease'
              }}>
                <div style={{ 
                  fontSize: '5rem', 
                  marginBottom: '20px', 
                  opacity: 0.7,
                  animation: 'bounce 2s infinite'
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
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes cardSlideIn {
          from { transform: translateY(20px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-20px); }
          60% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}

export default OptimizedApp
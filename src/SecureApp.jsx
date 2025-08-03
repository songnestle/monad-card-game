/**
 * SecureApp.jsx - 全面重构优化的安全卡牌游戏应用
 * 
 * 主要改进：
 * - 强化安全验证和错误处理
 * - 优化性能和内存管理
 * - 改进用户体验和可访问性
 * - 消除代码重复和技术债务
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ethers } from 'ethers'
import './App.css'

// 安全导入数据文件
import { cryptoCards, rarityNames } from './cryptoCards.js'

// 导入性能监控和测试工具
import usePerformanceMonitor, { useMemoryLeak } from './hooks/usePerformanceMonitor.js'
import { quickHealthCheck } from './utils/testUtils.js'

// 环境变量安全处理
const CONFIG = {
  RPC_URL: import.meta.env.VITE_RPC_URL,
  CONTRACT_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS,
  NETWORK: {
    chainId: 10143,
    chainIdHex: '0x279f',
    name: 'Monad Testnet',
    currency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: ['https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://testnet-explorer.monad.xyz']
  },
  TRANSACTION: {
    DEFAULT_GAS_MULTIPLIER: 1.2, // 20% 缓冲
    MAX_GAS_LIMIT: 1000000,
    RETRY_ATTEMPTS: 3,
    TIMEOUT_MS: 30000
  },
  UI: {
    NOTIFICATION_TIMEOUT: {
      success: 5000,
      warning: 7000,
      error: 10000
    },
    DEBOUNCE_MS: 300,
    POLLING_INTERVAL: 15000
  }
}

// 智能合约 ABI - 类型安全
const CONTRACT_ABI = [
  "function claimDailyCards() public payable",
  "function createHand(uint[5] cardIndexes) public",
  "function getMyCards() public view returns (tuple(uint id, string symbol, string name, uint rarity, uint baseScore, uint level, uint timestamp)[])",
  "function getMyActiveHand() public view returns (tuple(uint[5] cardIndexes, uint totalScore, uint timestamp, bool isActive))",
  "function getCurrentContest() public view returns (uint startTime, uint endTime, uint participantCount, uint prizePool)",
  "function participationFee() public view returns (uint)"
]

// 工具函数 - 安全性增强
const utils = {
  // 安全地址格式化
  formatAddress: (address) => {
    if (!address || typeof address !== 'string') return '未知地址'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  },

  // 安全数值格式化
  formatBalance: (balance, decimals = 4) => {
    try {
      const num = parseFloat(balance || '0')
      return isNaN(num) ? '0.0000' : num.toFixed(decimals)
    } catch {
      return '0.0000'
    }
  },

  // 安全文本清理
  sanitizeText: (text) => {
    if (!text || typeof text !== 'string') return ''
    return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  },

  // 网络验证
  isValidNetwork: (chainId) => chainId === CONFIG.NETWORK.chainId,

  // Gas 估算
  calculateGasLimit: (estimate) => {
    try {
      const gasLimit = estimate * BigInt(Math.floor(CONFIG.TRANSACTION.DEFAULT_GAS_MULTIPLIER * 100)) / BigInt(100)
      return gasLimit > BigInt(CONFIG.TRANSACTION.MAX_GAS_LIMIT) 
        ? BigInt(CONFIG.TRANSACTION.MAX_GAS_LIMIT) 
        : gasLimit
    } catch {
      return BigInt(500000) // 安全默认值
    }
  },

  // 错误分类
  categorizeError: (error) => {
    if (!error) return { type: 'unknown', code: 'UNKNOWN' }
    
    const message = error.message || error.toString()
    
    if (error.code === 4001 || message.includes('User rejected')) {
      return { type: 'user_rejection', code: 'USER_REJECTED' }
    }
    if (error.code === 4902 || message.includes('Unrecognized chain')) {
      return { type: 'network_error', code: 'WRONG_NETWORK' }
    }
    if (message.includes('insufficient funds')) {
      return { type: 'balance_error', code: 'INSUFFICIENT_FUNDS' }
    }
    if (message.includes('gas')) {
      return { type: 'gas_error', code: 'GAS_ERROR' }
    }
    if (message.includes('Already claimed')) {
      return { type: 'business_logic', code: 'ALREADY_CLAIMED' }
    }
    
    return { type: 'unknown', code: 'UNKNOWN', raw: error }
  }
}

// 通知组件 - 增强版
const NotificationCenter = ({ notifications, removeNotification }) => {
  if (!notifications?.length) return null

  return (
    <div 
      className="notification-center"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        maxWidth: '400px'
      }}
      role="region"
      aria-label="通知中心"
    >
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type} notification-enter`}
          style={{
            background: notification.type === 'error' ? 
              'linear-gradient(135deg, #ff4757, #ff3838)' :
              notification.type === 'warning' ?
              'linear-gradient(135deg, #ffa502, #ff6348)' :
              'linear-gradient(135deg, #2ed573, #1e90ff)',
            color: 'white',
            padding: '16px 22px',
            borderRadius: '12px',
            marginBottom: '12px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
          role="alert"
          aria-live="polite"
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '1rem' }}>
              {notification.type === 'error' ? '❌ 错误' : 
               notification.type === 'warning' ? '⚠️ 警告' : '✅ 成功'}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.95, lineHeight: '1.4' }}>
              {utils.sanitizeText(notification.message)}
            </div>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="animated-button"
            style={{
              background: 'rgba(255,255,255,0.25)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              cursor: 'pointer',
              marginLeft: '12px',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="关闭通知"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// 加载指示器组件 - 改进版
const LoadingOverlay = ({ show, message = '加载中...' }) => {
  if (!show) return null

  return (
    <div 
      className="loading-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001
      }}
      role="dialog"
      aria-label="加载中"
    >
      <div style={{
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '30px',
        borderRadius: '15px',
        textAlign: 'center',
        maxWidth: '300px',
        backdropFilter: 'blur(10px)'
      }}>
        <div 
          className="loading-spinner"
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #4ECDC4',
            borderRadius: '50%',
            margin: '0 auto 15px'
          }}
          aria-hidden="true"
        />
        <div style={{ fontSize: '1.1rem' }}>{utils.sanitizeText(message)}</div>
      </div>
    </div>
  )
}

// 钱包状态指示器 - 安全增强版
const WalletIndicator = ({ walletState }) => {
  if (!walletState.isConnected) return null

  const isCorrectNetwork = utils.isValidNetwork(walletState.chainId)

  return (
    <div 
      className={`wallet-indicator ${isCorrectNetwork ? 'wallet-connected' : 'wallet-error'}`}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: isCorrectNetwork ? 
          'linear-gradient(135deg, #2ed573, #1e90ff)' :
          'linear-gradient(135deg, #ff4757, #ff3838)',
        color: 'white',
        padding: '12px 18px',
        borderRadius: '25px',
        fontSize: '0.9rem',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        maxWidth: '280px'
      }}
      role="status"
      aria-label="钱包状态"
    >
      <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: 'white',
        animation: isCorrectNetwork ? 'pulse 2s infinite' : 'none'
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
          🔗 {utils.formatAddress(walletState.account)}
        </div>
        <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
          💰 {utils.formatBalance(walletState.balance)} MON
        </div>
        {!isCorrectNetwork && (
          <div style={{ fontSize: '0.75rem', color: '#ffeb3b' }}>
            ⚠️ 网络错误 (ID: {walletState.chainId})
          </div>
        )}
      </div>
    </div>
  )
}

// 手牌进度指示器
const HandProgress = ({ selectedCount, total = 5 }) => {
  const percentage = (selectedCount / total) * 100

  return (
    <div style={{ textAlign: 'center', marginBottom: 30, maxWidth: '600px', margin: '0 auto 30px' }}>
      <p style={{ color: '#bbb', marginBottom: '10px', fontSize: '1rem' }}>
        手牌组合进度: {selectedCount}/{total}
        {selectedCount === total && (
          <span style={{ color: '#27AE60', marginLeft: '10px' }}>✅ 可以创建手牌</span>
        )}
      </p>
      <div className="hand-progress">
        <div 
          className="hand-progress-fill" 
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={selectedCount}
          aria-valuemin="0"
          aria-valuemax={total}
        />
      </div>
    </div>
  )
}

// 主应用组件
function SecureApp() {
  // === 性能监控 ===
  const { 
    startTimer, 
    endTimer, 
    monitorAsync, 
    debounce, 
    throttle, 
    getPerformanceReport 
  } = usePerformanceMonitor('SecureApp')
  
  const { 
    safeSetTimeout, 
    safeSetInterval, 
    clearSafeTimeout, 
    clearSafeInterval 
  } = useMemoryLeak('SecureApp')

  // === 状态管理 ===
  const [cards, setCards] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [currentTab, setCurrentTab] = useState('cards')
  const [contestInfo, setContestInfo] = useState(null)
  const [dailyCardsReceived, setDailyCardsReceived] = useState(false)
  const [participationFee, setParticipationFee] = useState(0)
  
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

  // UI状态
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState({ show: false, message: '' })
  const [healthStatus, setHealthStatus] = useState(null)

  // Refs for cleanup
  const cleanupRef = useRef([])
  const notificationTimeoutRef = useRef(new Map())

  // === 通知系统 ===
  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    const notification = { id, message, type, timestamp: Date.now() }
    
    setNotifications(prev => [...prev.slice(-4), notification]) // 最多保留5个通知
    
    // 清理之前的定时器
    const existingTimeout = notificationTimeoutRef.current.get(id)
    if (existingTimeout) clearSafeTimeout(existingTimeout)
    
    // 使用安全定时器设置自动移除
    const timeout = safeSetTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
      notificationTimeoutRef.current.delete(id)
    }, CONFIG.UI.NOTIFICATION_TIMEOUT[type] || 5000)
    
    notificationTimeoutRef.current.set(id, timeout)
  }, [safeSetTimeout, clearSafeTimeout])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    const timeout = notificationTimeoutRef.current.get(id)
    if (timeout) {
      clearSafeTimeout(timeout)
      notificationTimeoutRef.current.delete(id)
    }
  }, [clearSafeTimeout])

  // 健康检查
  const performHealthCheck = useCallback(async () => {
    try {
      startTimer('health-check')
      const health = await monitorAsync('health-check', async () => {
        return quickHealthCheck()
      })
      setHealthStatus(health)
      endTimer('health-check')
      
      if (!health.metamask) {
        addNotification('MetaMask未安装或不可用', 'warning')
      }
      if (!health.networkConnected) {
        addNotification('网络连接异常', 'error')
      }
    } catch (error) {
      console.error('健康检查失败:', error)
      setHealthStatus({ error: error.message })
    }
  }, [startTimer, endTimer, monitorAsync, addNotification])

  // 加载状态管理
  const showLoading = useCallback((message) => {
    setLoading({ show: true, message })
  }, [])

  const hideLoading = useCallback(() => {
    setLoading({ show: false, message: '' })
  }, [])

  // === 网络和钱包管理 ===
  const checkMetaMaskAvailability = useCallback(() => {
    if (typeof window.ethereum === 'undefined') {
      addNotification(
        '请安装MetaMask钱包扩展。访问 metamask.io 下载安装。', 
        'error'
      )
      return false
    }
    
    if (!window.ethereum.isMetaMask) {
      addNotification('建议使用MetaMask以获得最佳体验。', 'warning')
    }
    
    return true
  }, [addNotification])

  const switchToMonadNetwork = useCallback(async () => {
    try {
      showLoading('正在切换到Monad测试网...')
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CONFIG.NETWORK.chainIdHex }]
      })
      
      addNotification('已成功切换到Monad测试网', 'success')
      return true
      
    } catch (switchError) {
      const { type, code } = utils.categorizeError(switchError)
      
      if (code === 'WRONG_NETWORK' || switchError.code === 4902) {
        try {
          showLoading('正在添加Monad测试网...')
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: CONFIG.NETWORK.chainIdHex,
              chainName: CONFIG.NETWORK.name,
              nativeCurrency: CONFIG.NETWORK.currency,
              rpcUrls: CONFIG.NETWORK.rpcUrls,
              blockExplorerUrls: CONFIG.NETWORK.blockExplorerUrls
            }]
          })
          
          addNotification('Monad测试网添加成功', 'success')
          return true
          
        } catch (addError) {
          addNotification(`添加网络失败: ${addError.message}`, 'error')
          return false
        }
      } else if (code === 'USER_REJECTED') {
        addNotification('用户取消了网络切换', 'warning')
        return false
      } else {
        addNotification(`网络切换失败: ${switchError.message}`, 'error')
        return false
      }
    } finally {
      hideLoading()
    }
  }, [addNotification, showLoading, hideLoading])

  const updateBalance = useCallback(async (provider, account) => {
    try {
      const balance = await provider.getBalance(account)
      const balanceETH = ethers.formatEther(balance)
      
      setWalletState(prev => ({ ...prev, balance: balanceETH }))
      
      // 余额警告
      if (parseFloat(balanceETH) < 0.01) {
        addNotification(
          '余额不足！请在Monad测试网水龙头获取MON代币。',
          'warning'
        )
      }
      
      return balanceETH
    } catch (error) {
      console.error('获取余额失败:', error)
      addNotification('获取余额失败，请刷新重试', 'warning')
      return '0'
    }
  }, [addNotification])

  // === 智能合约交互 ===
  const validateNetworkBeforeTransaction = useCallback(async () => {
    try {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
      const chainIdNum = parseInt(currentChainId, 16)
      
      if (!utils.isValidNetwork(chainIdNum)) {
        addNotification(
          `❌ 错误网络！当前网络ID: ${chainIdNum}，需要切换到Monad测试网 (${CONFIG.NETWORK.chainId})`,
          'error'
        )
        
        const switched = await switchToMonadNetwork()
        if (!switched) {
          throw new Error('必须切换到Monad测试网才能操作')
        }
      }
      
      return true
    } catch (error) {
      throw new Error(`网络验证失败: ${error.message}`)
    }
  }, [addNotification, switchToMonadNetwork])

  const estimateGasWithRetry = useCallback(async (contract, method, params = []) => {
    for (let attempt = 1; attempt <= CONFIG.TRANSACTION.RETRY_ATTEMPTS; attempt++) {
      try {
        const gasEstimate = await contract[method].estimateGas(...params)
        return utils.calculateGasLimit(gasEstimate)
      } catch (error) {
        if (attempt === CONFIG.TRANSACTION.RETRY_ATTEMPTS) {
          throw new Error(`Gas估算失败: ${error.message}`)
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
  }, [])

  // 连接钱包主函数 - 增强版
  const connectWallet = useCallback(async () => {
    return await monitorAsync('connect-wallet', async () => {
      if (!checkMetaMaskAvailability()) return false

      try {
        setWalletState(prev => ({ ...prev, isConnecting: true }))
        showLoading('正在连接钱包...')

        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })

        if (!accounts?.length) {
          throw new Error('未获取到账户授权')
        }

        const account = accounts[0]
        
        // 网络验证
        await validateNetworkBeforeTransaction()

        // 创建provider和signer
        const provider = new ethers.BrowserProvider(window.ethereum)
        const signer = await provider.getSigner()
        
        const chainId = await provider.getNetwork().then(n => Number(n.chainId))
        
        setWalletState({
          isConnected: true,
          isConnecting: false,
          account,
          balance: '0',
          chainId,
          provider,
          signer
        })

        await updateBalance(provider, account)
        addNotification(`钱包连接成功！地址: ${utils.formatAddress(account)}`, 'success')
        
        // 加载游戏数据
        await loadGameData(provider, signer)
        
        return true

      } catch (error) {
        const { type, code } = utils.categorizeError(error)
        
        if (code === 'USER_REJECTED') {
          addNotification('用户取消了钱包连接', 'warning')
        } else {
          addNotification(`连接失败: ${error.message}`, 'error')
        }
        
        setWalletState(prev => ({ 
          ...prev, 
          isConnecting: false,
          isConnected: false 
        }))
        
        return false
      } finally {
        hideLoading()
      }
    })
  }, [monitorAsync, checkMetaMaskAvailability, validateNetworkBeforeTransaction, updateBalance, addNotification, showLoading, hideLoading])

  const disconnectWallet = useCallback(() => {
    // 清理所有状态
    setWalletState({
      isConnected: false,
      isConnecting: false,
      account: '',
      balance: '0',
      chainId: null,
      provider: null,
      signer: null
    })
    
    setCards([])
    setSelectedCards([])
    setContestInfo(null)
    setDailyCardsReceived(false)
    setParticipationFee(0)
    
    addNotification('钱包已断开连接', 'success')
  }, [addNotification])

  const loadGameData = useCallback(async (provider, signer) => {
    if (!CONFIG.CONTRACT_ADDRESS) {
      addNotification('合约地址未配置', 'error')
      return
    }

    try {
      showLoading('正在加载游戏数据...')
      
      const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, signer)

      // 并行加载数据 - 错误隔离
      const [myCardsResult, feeResult, contestResult] = await Promise.allSettled([
        contract.getMyCards(),
        contract.participationFee(),
        contract.getCurrentContest()
      ])

      // 安全处理每个结果
      if (myCardsResult.status === 'fulfilled') {
        const cardsData = Array.from(myCardsResult.value || [])
        setCards(cardsData)
      } else {
        console.warn('获取卡牌失败:', myCardsResult.reason)
        addNotification('获取卡牌数据失败，部分功能可能受影响', 'warning')
      }

      if (feeResult.status === 'fulfilled') {
        setParticipationFee(Number(feeResult.value))
      } else {
        console.warn('获取参与费用失败:', feeResult.reason)
      }

      if (contestResult.status === 'fulfilled') {
        const contest = contestResult.value
        setContestInfo({
          participantCount: Number(contest.participantCount),
          prizePool: Number(contest.prizePool)
        })
      } else {
        console.warn('获取竞赛信息失败:', contestResult.reason)
      }

      addNotification('游戏数据加载完成', 'success')

    } catch (error) {
      console.error('加载游戏数据失败:', error)
      addNotification(`数据加载失败: ${error.message}`, 'error')
    } finally {
      hideLoading()
    }
  }, [addNotification, showLoading, hideLoading])

  // === 游戏操作 ===
  const handleClaimDailyCards = useCallback(async () => {
    if (!walletState.isConnected) {
      await connectWallet()
      return
    }

    try {
      await validateNetworkBeforeTransaction()
      showLoading('正在领取每日卡牌...')
      
      const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, walletState.signer)
      
      // 余额检查
      const balance = ethers.parseEther(walletState.balance)
      const fee = BigInt(participationFee)
      
      if (balance < fee) {
        throw new Error(`余额不足！需要 ${ethers.formatEther(fee)} MON，当前余额 ${walletState.balance} MON`)
      }

      // Gas估算
      const gasLimit = await estimateGasWithRetry(contract, 'claimDailyCards', [{ value: fee }])

      const tx = await contract.claimDailyCards({ 
        value: fee,
        gasLimit
      })
      
      addNotification(`交易已提交，哈希: ${tx.hash.slice(0,10)}...`, 'success')
      
      showLoading('等待交易确认...')
      const receipt = await tx.wait()
      
      if (receipt.status === 1) {
        setDailyCardsReceived(true)
        addNotification('🎉 每日卡牌领取成功！', 'success')
        
        // 重新加载数据
        await Promise.all([
          loadGameData(walletState.provider, walletState.signer),
          updateBalance(walletState.provider, walletState.account)
        ])
      } else {
        throw new Error('交易执行失败')
      }
      
    } catch (error) {
      const { code } = utils.categorizeError(error)
      
      if (code === 'USER_REJECTED') {
        addNotification('用户取消了交易', 'warning')
      } else if (code === 'ALREADY_CLAIMED') {
        addNotification('今日已领取过卡牌！', 'warning')
        setDailyCardsReceived(true)
      } else if (code === 'INSUFFICIENT_FUNDS') {
        addNotification('余额不足，请先获取MON代币', 'error')
      } else {
        addNotification(`领取失败: ${error.message}`, 'error')
      }
    } finally {
      hideLoading()
    }
  }, [walletState, participationFee, connectWallet, validateNetworkBeforeTransaction, estimateGasWithRetry, loadGameData, updateBalance, addNotification, showLoading, hideLoading])

  const handleCreateHand = useCallback(async () => {
    if (selectedCards.length !== 5) {
      addNotification('请选择正好5张卡牌', 'warning')
      return
    }

    try {
      await validateNetworkBeforeTransaction()
      showLoading('正在创建手牌...')
      
      const contract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CONTRACT_ABI, walletState.signer)
      
      // Gas估算
      const gasLimit = await estimateGasWithRetry(contract, 'createHand', [selectedCards])
      
      const tx = await contract.createHand(selectedCards, { gasLimit })
      
      addNotification(`手牌创建交易已提交: ${tx.hash.slice(0,10)}...`, 'success')
      
      showLoading('等待交易确认...')
      const receipt = await tx.wait()
      
      if (receipt.status === 1) {
        setSelectedCards([])
        addNotification('🃏 手牌创建成功！已自动参与赛事', 'success')
        
        // 重新加载数据
        await loadGameData(walletState.provider, walletState.signer)
      } else {
        throw new Error('交易执行失败')
      }
      
    } catch (error) {
      const { code } = utils.categorizeError(error)
      
      if (code === 'USER_REJECTED') {
        addNotification('用户取消了交易', 'warning')
      } else {
        addNotification(`创建失败: ${error.message}`, 'error')
      }
    } finally {
      hideLoading()
    }
  }, [selectedCards, walletState, validateNetworkBeforeTransaction, estimateGasWithRetry, loadGameData, addNotification, showLoading, hideLoading])

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

  // 安全的卡牌信息获取
  const getCardInfo = useCallback((card) => {
    try {
      const cardData = cryptoCards.find(c => c.symbol === card.symbol) || {}
      return {
        emoji: cardData.emoji || '💰',
        color: cardData.color || '#666',
        name: utils.sanitizeText(cardData.name || card.name || card.symbol)
      }
    } catch {
      return {
        emoji: '💰',
        color: '#666',
        name: '未知卡牌'
      }
    }
  }, [])

  // === 事件监听器 ===
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts) => {
      if (!accounts.length) {
        disconnectWallet()
        addNotification('账户已断开连接', 'warning')
      } else if (accounts[0] !== walletState.account && walletState.isConnected) {
        addNotification('检测到账户切换，正在重新连接...', 'success')
        connectWallet()
      }
    }

    const handleChainChanged = (chainId) => {
      const newChainId = parseInt(chainId, 16)
      setWalletState(prev => ({ ...prev, chainId: newChainId }))
      
      if (!utils.isValidNetwork(newChainId)) {
        addNotification('请切换回Monad测试网', 'warning')
      } else {
        addNotification('网络已切换回Monad测试网', 'success')
      }
    }

    const handleDisconnect = () => {
      disconnectWallet()
      addNotification('钱包连接已断开', 'warning')
    }

    // 添加事件监听器
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('disconnect', handleDisconnect)

    // 保存清理函数
    cleanupRef.current.push(() => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('disconnect', handleDisconnect)
      }
    })

    return () => {
      cleanupRef.current.forEach(cleanup => cleanup())
      cleanupRef.current = []
    }
  }, [walletState.account, walletState.isConnected, connectWallet, disconnectWallet, addNotification])

  // 初始化检查和定期健康监控
  useEffect(() => {
    const initCheck = async () => {
      // 首次健康检查
      await performHealthCheck()
      
      if (!window.ethereum) return

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          const currentChainId = parseInt(chainId, 16)
          
          if (utils.isValidNetwork(currentChainId)) {
            await connectWallet()
          } else {
            addNotification('检测到钱包已连接，但需要切换到Monad测试网', 'warning')
          }
        }
      } catch (error) {
        console.error('初始化检查失败:', error)
      }
    }

    // 定期健康检查 (每5分钟)
    const healthCheckInterval = safeSetInterval(() => {
      performHealthCheck()
    }, 5 * 60 * 1000)

    // 定期性能报告 (每10分钟，仅开发环境)
    let performanceReportInterval
    if (import.meta.env.DEV) {
      performanceReportInterval = safeSetInterval(() => {
        const report = getPerformanceReport()
        console.log('📊 性能报告:', report)
      }, 10 * 60 * 1000)
    }

    initCheck()

    return () => {
      clearSafeInterval(healthCheckInterval)
      if (performanceReportInterval) {
        clearSafeInterval(performanceReportInterval)
      }
    }
  }, [connectWallet, addNotification, performHealthCheck, safeSetInterval, clearSafeInterval, getPerformanceReport])

  // 组件卸载清理
  useEffect(() => {
    return () => {
      // 清理所有通知定时器
      notificationTimeoutRef.current.forEach(timeout => clearSafeTimeout(timeout))
      notificationTimeoutRef.current.clear()
      
      // 执行其他清理函数
      cleanupRef.current.forEach(cleanup => cleanup())
      
      // 最终性能报告
      if (import.meta.env.DEV) {
        const finalReport = getPerformanceReport()
        console.log('🏁 最终性能报告:', finalReport)
      }
    }
  }, [clearSafeTimeout, getPerformanceReport])

  // 性能优化 - 记忆化计算
  const networkStatus = useMemo(() => ({
    isCorrect: utils.isValidNetwork(walletState.chainId),
    chainId: walletState.chainId
  }), [walletState.chainId])

  const buttonStates = useMemo(() => ({
    canClaimCards: walletState.isConnected && !dailyCardsReceived && !loading.show,
    canCreateHand: selectedCards.length === 5 && !loading.show,
    canConnect: !walletState.isConnected && !walletState.isConnecting
  }), [walletState.isConnected, walletState.isConnecting, dailyCardsReceived, loading.show, selectedCards.length])

  // 优化的用户交互 - 防抖和节流
  const debouncedCardSelection = useMemo(
    () => debounce(toggleCardSelection, CONFIG.UI.DEBOUNCE_MS),
    [debounce, toggleCardSelection]
  )

  const throttledConnectWallet = useMemo(
    () => throttle(connectWallet, 2000), // 防止重复点击
    [throttle, connectWallet]
  )

  const throttledClaimCards = useMemo(
    () => throttle(handleClaimDailyCards, 3000), // 防止重复交易
    [throttle, handleClaimDailyCards]
  )

  const throttledCreateHand = useMemo(
    () => throttle(handleCreateHand, 3000), // 防止重复交易
    [throttle, handleCreateHand]
  )

  // === 渲染 ===
  return (
    <div className="animated-background" style={{ 
      padding: 40, 
      minHeight: '100vh',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      position: 'relative'
    }}>
      {/* 通知中心 */}
      <NotificationCenter 
        notifications={notifications} 
        removeNotification={removeNotification} 
      />
      
      {/* 钱包状态指示器 */}
      <WalletIndicator walletState={walletState} />
      
      {/* 加载指示器 */}
      <LoadingOverlay show={loading.show} message={loading.message} />

      {/* 主标题 */}
      <header style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 className="glow-text" style={{ 
          fontSize: '3rem',
          background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 10
        }}>
          🎴 Monad 卡牌世界
        </h1>
        <p style={{ color: '#bbb', fontSize: '1.2rem' }}>
          {walletState.isConnected ? (
            <>
              地址: {utils.formatAddress(walletState.account)} | 卡牌: {cards.length} 张
              <br />
              <span style={{ 
                color: networkStatus.isCorrect ? '#27AE60' : '#E74C3C',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                {networkStatus.isCorrect ? 
                  '✅ Monad测试网 (正确)' : 
                  `❌ 错误网络 (ID: ${networkStatus.chainId})`
                }
              </span>
            </>
          ) : (
            '连接钱包开始游戏'
          )}
        </p>
      </header>

      {/* 连接钱包按钮 */}
      {buttonStates.canConnect && (
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <button 
            onClick={throttledConnectWallet}
            disabled={walletState.isConnecting}
            className="animated-button ripple"
            style={{
              background: walletState.isConnecting ? 
                '#666' : 'linear-gradient(45deg, #4ECDC4, #44A08D)',
              border: 'none',
              color: 'white',
              padding: '15px 30px',
              fontSize: '1.3rem',
              borderRadius: '25px',
              cursor: walletState.isConnecting ? 'not-allowed' : 'pointer'
            }}
            aria-label="连接MetaMask钱包"
          >
            {walletState.isConnecting ? '🔄 连接中...' : '🔗 连接MetaMask钱包'}
          </button>
        </div>
      )}

      {/* 主要内容 */}
      {walletState.isConnected && (
        <main>
          {/* 功能按钮区域 */}
          <section style={{ textAlign: 'center', marginBottom: 40, display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <button 
              onClick={throttledClaimCards}
              disabled={!buttonStates.canClaimCards}
              className="animated-button ripple"
              style={{
                background: !buttonStates.canClaimCards ? '#666' : 
                  dailyCardsReceived ? '#28a745' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                cursor: !buttonStates.canClaimCards ? 'not-allowed' : 'pointer'
              }}
              aria-label={dailyCardsReceived ? '今日已领取卡牌' : '领取今日卡牌'}
            >
              {loading.show ? '⏳ 处理中...' : 
               dailyCardsReceived ? '✅ 今日已领取' : '🎁 领取今日卡牌'}
            </button>
            
            <button 
              onClick={disconnectWallet}
              className="animated-button"
              style={{
                background: 'linear-gradient(45deg, #6c757d, #495057)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.1rem',
                borderRadius: '25px',
                cursor: 'pointer'
              }}
              aria-label="断开钱包连接"
            >
              🔌 断开连接
            </button>
          </section>

          {/* 标签页导航 */}
          <nav style={{ textAlign: 'center', marginBottom: 30 }} role="tablist">
            {[
              { id: 'cards', label: '🎁 我的卡牌' },
              { id: 'contest', label: '🏆 赛事' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`tab-button animated-button ${currentTab === tab.id ? 'active' : ''}`}
                style={{
                  background: currentTab === tab.id ? 'linear-gradient(45deg, #9B59B6, #8E44AD)' : '#666',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  margin: '0 10px',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
                role="tab"
                aria-selected={currentTab === tab.id}
                aria-label={tab.label}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* 卡牌展示 */}
          {currentTab === 'cards' && (
            <section className="page-transition" role="tabpanel" aria-label="我的卡牌">
              <h2 className="glow-text" style={{ textAlign: 'center', marginBottom: 20, color: '#FFD700' }}>
                🎁 我的卡牌收藏 ({cards.length})
              </h2>
              
              {/* 手牌选择进度 */}
              {cards.length > 0 && (
                <HandProgress selectedCount={selectedCards.length} total={5} />
              )}
              
              {cards.length > 0 ? (
                <>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '20px',
                    maxWidth: '1200px',
                    margin: '0 auto'
                  }}>
                    {cards.map((card, index) => {
                      const info = getCardInfo(card)
                      const rarity = rarityNames[Number(card.rarity)] || "未知"
                      const rarityLevel = Number(card.rarity)
                      const isSelected = selectedCards.includes(index)
                      
                      return (
                        <div 
                          key={`card-${index}-${card.id}`}
                          onClick={() => debouncedCardSelection(index)}
                          className={`card-item ripple card-rarity-${rarityLevel} ${isSelected ? 'draw-card-animation' : ''}`}
                          style={{
                            background: `linear-gradient(135deg, ${info.color}30, ${info.color}15)`,
                            border: `3px solid ${isSelected ? '#27AE60' : info.color}`,
                            borderRadius: '15px',
                            padding: '20px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`${info.name} 卡牌，稀有度 ${rarity}，分数 ${Number(card.baseScore)}，${isSelected ? '已选择' : '点击选择'}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              debouncedCardSelection(index)
                            }
                          }}
                        >
                          <div style={{ fontSize: '4rem', marginBottom: '10px' }} aria-hidden="true">
                            {info.emoji}
                          </div>
                          
                          <h3 style={{ margin: '10px 0', color: info.color, fontWeight: 'bold' }}>
                            {card.symbol} - {info.name}
                          </h3>
                          
                          <div style={{ 
                            fontSize: '0.9rem', 
                            color: info.color,
                            fontWeight: 'bold',
                            marginBottom: '15px'
                          }}>
                            {rarity} - 分数: <span className="counter-animation">{Number(card.baseScore)}</span>
                          </div>
                          
                          <div className="animated-button" style={{
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
                  {buttonStates.canCreateHand && (
                    <div style={{ textAlign: 'center', marginTop: '30px' }}>
                      <button
                        onClick={throttledCreateHand}
                        disabled={!buttonStates.canCreateHand}
                        className="animated-button pulse"
                        style={{
                          background: 'linear-gradient(45deg, #FFD700, #FF8C00)',
                          border: 'none',
                          color: 'white',
                          padding: '15px 30px',
                          fontSize: '1.2rem',
                          borderRadius: '25px',
                          cursor: 'pointer',
                          boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)'
                        }}
                        aria-label="创建手牌"
                      >
                        🃏 创建手牌 (5/5)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="stats-panel" style={{ 
                  textAlign: 'center', 
                  color: '#666', 
                  fontSize: '1.2rem',
                  marginTop: '50px'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }} aria-hidden="true">🎴</div>
                  <h3 className="glow-text" style={{ color: '#FFD700' }}>暂无卡牌</h3>
                  <p>点击上方按钮领取你的第一批卡牌！</p>
                </div>
              )}
            </section>
          )}

          {/* 赛事信息 */}
          {currentTab === 'contest' && (
            <section className="page-transition" style={{ textAlign: 'center' }} role="tabpanel" aria-label="赛事信息">
              <h2 className="glow-text" style={{ color: '#FFD700', marginBottom: 30 }}>🏆 当前赛事</h2>
              {contestInfo ? (
                <div className="stats-panel" style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid #667eea',
                  borderRadius: '20px',
                  padding: '30px',
                  maxWidth: '600px',
                  margin: '0 auto',
                  boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
                }}>
                  <p style={{ fontSize: '1.2rem', marginBottom: '15px' }}>
                    🏃‍♂️ 参与人数: <span className="counter-animation">{contestInfo.participantCount}</span>
                  </p>
                  <p style={{ fontSize: '1.2rem', marginBottom: '15px' }}>
                    💰 奖金池: <span className="counter-animation">{ethers.formatEther(contestInfo.prizePool)}</span> MON
                  </p>
                  <div style={{ marginTop: '20px' }}>
                    <div className="animated-button" style={{
                      background: 'linear-gradient(45deg, #27AE60, #2ECC71)',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '15px',
                      fontSize: '1rem',
                      border: 'none'
                    }}>
                      ✅ 已参与赛事
                    </div>
                  </div>
                </div>
              ) : (
                <div className="stats-panel" style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '2px solid #666',
                  borderRadius: '20px',
                  padding: '30px',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }} aria-hidden="true">🏆</div>
                  <p style={{ color: '#bbb', fontSize: '1.1rem' }}>暂无赛事信息</p>
                  <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '10px' }}>
                    创建手牌后将自动参与下一场赛事
                  </p>
                </div>
              )}
            </section>
          )}
        </main>
      )}
    </div>
  )
}

export default SecureApp
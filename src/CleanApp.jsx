import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import './App.css'

// 导入数据文件而不是内联
import { cryptoCards, rarityNames } from './cryptoCards.js'

const RPC_URL = import.meta.env.VITE_RPC_URL
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

const abi = [
  "function claimDailyCards() public payable",
  "function createHand(uint[5] cardIndexes) public",
  "function getMyCards() public view returns (tuple(uint id, string symbol, string name, uint rarity, uint baseScore, uint level, uint timestamp)[])",
  "function getMyActiveHand() public view returns (tuple(uint[5] cardIndexes, uint totalScore, uint timestamp, bool isActive))",
  "function getCurrentContest() public view returns (uint startTime, uint endTime, uint participantCount, uint prizePool)",
  "function participationFee() public view returns (uint)"
]

// Monad测试网配置
const MONAD_NETWORK = {
  chainId: 10143,
  chainIdHex: '0x279f',
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet-explorer.monad.xyz']
}

// 通知组件
const NotificationCenter = ({ notifications, removeNotification }) => {
  if (notifications.length === 0) return null

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
          className="notification-enter"
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
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '1rem' }}>
              {notification.type === 'error' ? '❌ 错误' : 
               notification.type === 'warning' ? '⚠️ 警告' : '✅ 成功'}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.95, lineHeight: '1.4' }}>
              {notification.message}
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
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// 加载指示器组件
const LoadingSpinner = ({ message = '加载中...' }) => (
  <div style={{
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '30px',
    borderRadius: '15px',
    textAlign: 'center',
    zIndex: 1001
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid rgba(255,255,255,0.3)',
      borderTop: '4px solid #4ECDC4',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 15px'
    }}></div>
    <div>{message}</div>
  </div>
)

// 钱包状态指示器
const WalletStatusIndicator = ({ walletState, account }) => (
  <div className={walletState.isConnected ? 'wallet-connected' : ''} style={{
    position: 'fixed',
    top: '20px',
    left: '20px',
    background: walletState.isConnected ? 
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
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
  }}>
    <div style={{
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      background: 'white',
      animation: walletState.isConnected ? 'pulse 2s infinite' : 'none'
    }}></div>
    {walletState.isConnected ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ fontWeight: 'bold' }}>
          🔗 {account.slice(0,6)}...{account.slice(-4)}
        </div>
        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
          💰 {parseFloat(walletState.balance || '0').toFixed(4)} MON
        </div>
      </div>
    ) : (
      <div style={{ fontWeight: 'bold' }}>🔌 钱包未连接</div>
    )}
  </div>
)

function CleanApp() {
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

  // 通知系统
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState({ show: false, message: '' })

  // 通知管理
  const addNotification = useCallback((message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    
    // 自动移除通知
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, type === 'error' ? 8000 : 5000)
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // 显示加载状态
  const showLoading = useCallback((message) => {
    setLoading({ show: true, message })
  }, [])

  const hideLoading = useCallback(() => {
    setLoading({ show: false, message: '' })
  }, [])

  // 检查MetaMask是否安装
  const checkMetaMaskInstalled = useCallback(() => {
    if (typeof window.ethereum === 'undefined') {
      addNotification(
        '请安装MetaMask钱包扩展。访问 https://metamask.io 下载安装。', 
        'error'
      )
      return false
    }
    
    if (!window.ethereum.isMetaMask) {
      addNotification('检测到其他钱包，建议使用MetaMask以获得最佳体验。', 'warning')
    }
    
    return true
  }, [addNotification])

  // 切换到Monad网络
  const switchToMonadNetwork = useCallback(async () => {
    try {
      showLoading('正在切换到Monad测试网...')
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_NETWORK.chainIdHex }]
      })
      
      addNotification('已成功切换到Monad测试网', 'success')
      return true
      
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          showLoading('正在添加Monad测试网...')
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MONAD_NETWORK]
          })
          
          addNotification('Monad测试网添加成功', 'success')
          return true
          
        } catch (addError) {
          addNotification(`添加网络失败: ${addError.message}`, 'error')
          return false
        }
      } else if (switchError.code === 4001) {
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

  // 获取账户余额
  const updateBalance = useCallback(async (provider, account) => {
    try {
      const balance = await provider.getBalance(account)
      const balanceETH = ethers.formatEther(balance)
      
      setWalletState(prev => ({ ...prev, balance: balanceETH }))
      
      // 检查余额是否充足
      if (parseFloat(balanceETH) < 0.01) {
        addNotification(
          '余额不足！请在Monad测试网水龙头获取MON代币。',
          'warning'
        )
      }
      
      return balanceETH
    } catch (error) {
      console.error('获取余额失败:', error)
      return '0'
    }
  }, [addNotification])

  // 连接钱包主函数
  const connectWallet = useCallback(async () => {
    if (!checkMetaMaskInstalled()) return false

    try {
      setWalletState(prev => ({ ...prev, isConnecting: true }))
      showLoading('正在连接钱包...')

      // 请求账户访问
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('未获取到账户授权')
      }

      const account = accounts[0]
      
      // 检查网络
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const currentChainId = parseInt(chainId, 16)
      
      if (currentChainId !== MONAD_NETWORK.chainId) {
        const switched = await switchToMonadNetwork()
        if (!switched) {
          throw new Error('需要连接到Monad测试网才能使用游戏')
        }
      }

      // 创建provider和signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      // 更新钱包状态
      setWalletState({
        isConnected: true,
        isConnecting: false,
        account,
        balance: '0',
        chainId: MONAD_NETWORK.chainId,
        provider,
        signer
      })

      // 获取余额
      await updateBalance(provider, account)
      
      addNotification(`钱包连接成功！地址: ${account.slice(0,8)}...`, 'success')
      
      // 加载游戏数据
      await loadGameData(provider, signer)
      
      return true

    } catch (error) {
      console.error('钱包连接失败:', error)
      
      if (error.code === 4001) {
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
  }, [checkMetaMaskInstalled, switchToMonadNetwork, updateBalance, addNotification, showLoading, hideLoading])

  // 断开钱包连接
  const disconnectWallet = useCallback(() => {
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
    
    addNotification('钱包已断开连接', 'success')
  }, [addNotification])

  // 加载游戏数据
  const loadGameData = useCallback(async (provider, signer) => {
    if (!CONTRACT_ADDRESS) {
      addNotification('合约地址未配置', 'error')
      return
    }

    try {
      showLoading('正在加载游戏数据...')
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      // 并行加载数据
      const [myCards, fee, contest] = await Promise.allSettled([
        contract.getMyCards(),
        contract.participationFee(),
        contract.getCurrentContest()
      ])

      // 处理卡牌数据
      if (myCards.status === 'fulfilled') {
        setCards(Array.from(myCards.value || []))
      } else {
        console.warn('获取卡牌失败:', myCards.reason)
      }

      // 处理参与费用
      if (fee.status === 'fulfilled') {
        setParticipationFee(Number(fee.value))
      } else {
        console.warn('获取参与费用失败:', fee.reason)
      }

      // 处理竞赛信息
      if (contest.status === 'fulfilled') {
        setContestInfo({
          participantCount: Number(contest.value.participantCount),
          prizePool: Number(contest.value.prizePool)
        })
      } else {
        console.warn('获取竞赛信息失败:', contest.reason)
      }

      addNotification('游戏数据加载完成', 'success')

    } catch (error) {
      console.error('加载游戏数据失败:', error)
      addNotification(`数据加载失败: ${error.message}`, 'error')
    } finally {
      hideLoading()
    }
  }, [addNotification, showLoading, hideLoading])

  // 领取每日卡牌
  const handleClaimDailyCards = useCallback(async () => {
    if (!walletState.isConnected) {
      await connectWallet()
      return
    }

    try {
      // 🚨 紧急网络验证
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
      const chainIdNum = parseInt(currentChainId, 16)
      
      if (chainIdNum !== MONAD_NETWORK.chainId) {
        addNotification(
          `❌ 错误网络！当前网络ID: ${chainIdNum}，需要切换到Monad测试网 (${MONAD_NETWORK.chainId})`,
          'error'
        )
        const switched = await switchToMonadNetwork()
        if (!switched) {
          throw new Error('必须切换到Monad测试网才能操作')
        }
      }
      
      showLoading('正在领取每日卡牌...')
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, walletState.signer)
      
      // 检查余额
      const balance = ethers.parseEther(walletState.balance)
      const fee = BigInt(participationFee)
      
      if (balance < fee) {
        throw new Error(`余额不足！需要 ${ethers.formatEther(fee)} MON，当前余额 ${walletState.balance} MON`)
      }

      const tx = await contract.claimDailyCards({ 
        value: fee,
        gasLimit: 500000
      })
      
      addNotification(`交易已提交，哈希: ${tx.hash.slice(0,10)}...`, 'success')
      
      showLoading('等待交易确认...')
      const receipt = await tx.wait()
      
      if (receipt.status === 1) {
        setDailyCardsReceived(true)
        addNotification('🎉 每日卡牌领取成功！', 'success')
        
        // 重新加载数据
        await loadGameData(walletState.provider, walletState.signer)
        await updateBalance(walletState.provider, walletState.account)
      } else {
        throw new Error('交易执行失败')
      }
      
    } catch (error) {
      console.error('领取卡牌失败:', error)
      
      if (error.code === 4001) {
        addNotification('用户取消了交易', 'warning')
      } else if (error.reason?.includes('Already claimed')) {
        addNotification('今日已领取过卡牌！', 'warning')
        setDailyCardsReceived(true)
      } else {
        addNotification(`领取失败: ${error.reason || error.message}`, 'error')
      }
    } finally {
      hideLoading()
    }
  }, [walletState, participationFee, connectWallet, loadGameData, updateBalance, addNotification, showLoading, hideLoading])

  // 创建手牌
  const handleCreateHand = useCallback(async () => {
    if (selectedCards.length !== 5) {
      addNotification('请选择正好5张卡牌', 'warning')
      return
    }

    try {
      // 🚨 紧急网络验证
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
      const chainIdNum = parseInt(currentChainId, 16)
      
      if (chainIdNum !== MONAD_NETWORK.chainId) {
        addNotification(
          `❌ 错误网络！当前网络ID: ${chainIdNum}，需要切换到Monad测试网 (${MONAD_NETWORK.chainId})`,
          'error'
        )
        const switched = await switchToMonadNetwork()
        if (!switched) {
          throw new Error('必须切换到Monad测试网才能操作')
        }
      }
      
      showLoading('正在创建手牌...')
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, walletState.signer)
      
      const tx = await contract.createHand(selectedCards, { gasLimit: 500000 })
      
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
      console.error('创建手牌失败:', error)
      
      if (error.code === 4001) {
        addNotification('用户取消了交易', 'warning')
      } else {
        addNotification(`创建失败: ${error.reason || error.message}`, 'error')
      }
    } finally {
      hideLoading()
    }
  }, [selectedCards, walletState, loadGameData, addNotification, showLoading, hideLoading])

  // 选择卡牌
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

  // 获取卡牌信息
  const getCardInfo = useCallback((card) => {
    const cardData = cryptoCards.find(c => c.symbol === card.symbol) || {}
    return {
      emoji: cardData.emoji || '💰',
      color: cardData.color || '#666',
      name: cardData.name || card.name || card.symbol
    }
  }, [])

  // 监听账户和网络变化
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet()
        addNotification('账户已断开连接', 'warning')
      } else if (accounts[0] !== walletState.account) {
        addNotification('检测到账户切换，正在重新连接...', 'success')
        connectWallet()
      }
    }

    const handleChainChanged = (chainId) => {
      const newChainId = parseInt(chainId, 16)
      if (newChainId !== MONAD_NETWORK.chainId) {
        addNotification('请切换回Monad测试网', 'warning')
        setWalletState(prev => ({ ...prev, chainId: newChainId }))
      } else {
        addNotification('网络已切换回Monad测试网', 'success')
        setWalletState(prev => ({ ...prev, chainId: newChainId }))
      }
    }

    const handleDisconnect = () => {
      disconnectWallet()
      addNotification('钱包连接已断开', 'warning')
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('disconnect', handleDisconnect)

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [walletState.account, connectWallet, disconnectWallet, addNotification])

  // 初始化检查
  useEffect(() => {
    const initCheck = async () => {
      if (!window.ethereum) return

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          const chainId = await window.ethereum.request({ method: 'eth_chainId' })
          const currentChainId = parseInt(chainId, 16)
          
          if (currentChainId === MONAD_NETWORK.chainId) {
            // 自动重连
            await connectWallet()
          } else {
            addNotification('检测到钱包已连接，但需要切换到Monad测试网', 'warning')
          }
        }
      } catch (error) {
        console.error('初始化检查失败:', error)
      }
    }

    initCheck()
  }, [connectWallet, addNotification])

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
      {walletState.isConnected && (
        <WalletStatusIndicator 
          walletState={walletState} 
          account={walletState.account} 
        />
      )}
      
      {/* 加载指示器 */}
      {loading.show && (
        <LoadingSpinner message={loading.message} />
      )}

      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
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
              地址: {walletState.account.slice(0,8)}... | 卡牌: {cards.length} 张
              <br />
              <span style={{ 
                color: walletState.chainId === MONAD_NETWORK.chainId ? '#27AE60' : '#E74C3C',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                {walletState.chainId === MONAD_NETWORK.chainId ? 
                  '✅ Monad测试网 (正确)' : 
                  `❌ 错误网络 (ID: ${walletState.chainId})`
                }
              </span>
            </>
          ) : (
            '连接钱包开始游戏'
          )}
        </p>
      </div>

      {/* 连接钱包按钮 */}
      {!walletState.isConnected && (
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <button 
            onClick={connectWallet}
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
          >
            {walletState.isConnecting ? '🔄 连接中...' : '🔗 连接MetaMask钱包'}
          </button>
        </div>
      )}

      {/* 主要内容 */}
      {walletState.isConnected && (
        <>
          {/* 功能按钮区域 */}
          <div style={{ textAlign: 'center', marginBottom: 40, display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <button 
              onClick={handleClaimDailyCards}
              disabled={loading.show || dailyCardsReceived}
              className="animated-button ripple"
              style={{
                background: loading.show ? '#666' : dailyCardsReceived ? '#28a745' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                cursor: (loading.show || dailyCardsReceived) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading.show ? '⏳ 处理中...' : dailyCardsReceived ? '✅ 今日已领取' : `🎁 领取今日卡牌`}
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
            >
              🔌 断开连接
            </button>
          </div>

          {/* 标签页 */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            {['cards', 'contest'].map(tab => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={`tab-button animated-button ${currentTab === tab ? 'active' : ''}`}
                style={{
                  background: currentTab === tab ? 'linear-gradient(45deg, #9B59B6, #8E44AD)' : '#666',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  margin: '0 10px',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                {tab === 'cards' ? '🎁 我的卡牌' : '🏆 赛事'}
              </button>
            ))}
          </div>

          {/* 卡牌展示 */}
          {currentTab === 'cards' && (
            <div className="page-transition">
              <h2 className="glow-text" style={{ textAlign: 'center', marginBottom: 20, color: '#FFD700' }}>
                🎁 我的卡牌收藏 ({cards.length})
              </h2>
              
              {/* 手牌选择进度指示器 */}
              {cards.length > 0 && (
                <div style={{ textAlign: 'center', marginBottom: 30, maxWidth: '600px', margin: '0 auto 30px' }}>
                  <p style={{ color: '#bbb', marginBottom: '10px', fontSize: '1rem' }}>
                    手牌组合进度: {selectedCards.length}/5 
                    {selectedCards.length === 5 && <span style={{ color: '#27AE60', marginLeft: '10px' }}>✅ 可以创建手牌</span>}
                  </p>
                  <div className="hand-progress">
                    <div 
                      className="hand-progress-fill" 
                      style={{ width: `${(selectedCards.length / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
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
                  
                  return (
                    <div 
                      key={index}
                      onClick={() => toggleCardSelection(index)}
                      className={`card-item ripple card-rarity-${rarityLevel} ${selectedCards.includes(index) ? 'draw-card-animation' : ''}`}
                      style={{
                        background: `linear-gradient(135deg, ${info.color}30, ${info.color}15)`,
                        border: `3px solid ${selectedCards.includes(index) ? '#27AE60' : info.color}`,
                        borderRadius: '15px',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transform: selectedCards.includes(index) ? 'scale(1.05)' : 'scale(1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
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
                        background: selectedCards.includes(index) ? 
                          'linear-gradient(45deg, #27AE60, #2ECC71)' : 
                          'linear-gradient(45deg, #4ECDC4, #45B7B8)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '0.9rem',
                        border: 'none',
                        cursor: 'pointer'
                      }}>
                        {selectedCards.includes(index) ? '✅ 已选择' : '🎯 点击选择'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 创建手牌按钮 */}
              {selectedCards.length === 5 && (
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <button
                    onClick={handleCreateHand}
                    disabled={loading.show}
                    className="animated-button pulse"
                    style={{
                      background: 'linear-gradient(45deg, #FFD700, #FF8C00)',
                      border: 'none',
                      color: 'white',
                      padding: '15px 30px',
                      fontSize: '1.2rem',
                      borderRadius: '25px',
                      cursor: loading.show ? 'not-allowed' : 'pointer',
                      boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)'
                    }}
                  >
                    {loading.show ? '⏳ 创建中...' : '🃏 创建手牌 (5/5)'}
                  </button>
                </div>
              )}

              {cards.length === 0 && !loading.show && (
                <div className="stats-panel" style={{ 
                  textAlign: 'center', 
                  color: '#666', 
                  fontSize: '1.2rem',
                  marginTop: '50px'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎴</div>
                  <h3 className="glow-text" style={{ color: '#FFD700' }}>暂无卡牌</h3>
                  <p>点击上方按钮领取你的第一批卡牌！</p>
                </div>
              )}
            </div>
          )}

          {/* 赛事信息 */}
          {currentTab === 'contest' && (
            <div className="page-transition" style={{ textAlign: 'center' }}>
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
                  <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏆</div>
                  <p style={{ color: '#bbb', fontSize: '1.1rem' }}>暂无赛事信息</p>
                  <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '10px' }}>
                    创建手牌后将自动参与下一场赛事
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CleanApp
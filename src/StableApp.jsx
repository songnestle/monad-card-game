import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import './App.css'

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

function StableApp() {
  // 基础状态
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('初始化中...')
  
  // 核心数据
  const [cards, setCards] = useState([])
  const [selectedCards, setSelectedCards] = useState([])
  const [participationFee, setParticipationFee] = useState('0')
  const [walletConnected, setWalletConnected] = useState(false)
  const [userAddress, setUserAddress] = useState('')
  
  // 操作状态
  const [claimLoading, setClaimLoading] = useState(false)
  
  // 调试日志
  const [logs, setLogs] = useState([])

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-10), { message, type, timestamp }])
    console.log(`[${timestamp}] ${message}`)
  }, [])

  // 安全的异步状态更新
  const safeSetState = useCallback((setter, value) => {
    try {
      setter(value)
    } catch (err) {
      console.error('State update error:', err)
    }
  }, [])

  // 检查钱包连接
  const checkWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error('请安装MetaMask钱包')
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length === 0) {
        throw new Error('请连接MetaMask钱包')
      }

      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const currentChainId = parseInt(chainId, 16)
      
      if (currentChainId !== 10143) {
        addLog(`当前网络: ${currentChainId}, 需要: 10143`, 'warning')
        throw new Error(`请切换到Monad测试网 (Chain ID: 10143)`)
      }

      safeSetState(setUserAddress, accounts[0])
      safeSetState(setWalletConnected, true)
      addLog('✅ 钱包连接成功', 'success')
      return true

    } catch (err) {
      addLog(`❌ 钱包检查失败: ${err.message}`, 'error')
      safeSetState(setError, err.message)
      safeSetState(setWalletConnected, false)
      return false
    }
  }, [addLog, safeSetState])

  // 连接钱包
  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error('请安装MetaMask钱包')
      }

      // 请求连接
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // 检查并切换网络
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (parseInt(chainId, 16) !== 10143) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x279f' }], // 10143 in hex
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x279f',
                chainName: 'Monad Testnet',
                nativeCurrency: {
                  name: 'Monad',
                  symbol: 'MON',
                  decimals: 18,
                },
                rpcUrls: ['https://testnet-rpc.monad.xyz'],
                blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
              }],
            })
          } else {
            throw switchError
          }
        }
      }

      return await checkWallet()
    } catch (err) {
      addLog(`❌ 连接失败: ${err.message}`, 'error')
      safeSetState(setError, err.message)
      return false
    }
  }, [checkWallet, addLog, safeSetState])

  // 加载合约数据
  const loadContractData = useCallback(async () => {
    try {
      if (!walletConnected || !CONTRACT_ADDRESS) {
        return
      }

      addLog('🔄 加载合约数据...', 'info')
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      // 获取参与费用
      try {
        const fee = await contract.participationFee()
        safeSetState(setParticipationFee, ethers.formatEther(fee))
        addLog(`✅ 参与费用: ${ethers.formatEther(fee)} MON`, 'success')
      } catch (feeError) {
        addLog(`⚠️ 获取费用失败: ${feeError.message}`, 'warning')
      }

      // 获取卡牌
      try {
        const myCards = await contract.getMyCards()
        safeSetState(setCards, myCards || [])
        addLog(`✅ 获取卡牌: ${myCards.length} 张`, 'success')
      } catch (cardsError) {
        addLog(`⚠️ 获取卡牌失败: ${cardsError.message}`, 'warning')
        safeSetState(setCards, [])
      }

      safeSetState(setError, null)
      safeSetState(setStatus, '✅ 数据加载完成')

    } catch (err) {
      addLog(`❌ 合约数据加载失败: ${err.message}`, 'error')
      safeSetState(setError, `合约连接失败: ${err.message}`)
      safeSetState(setStatus, '❌ 加载失败')
    }
  }, [walletConnected, addLog, safeSetState])

  // 领取卡牌
  const claimCards = useCallback(async () => {
    if (!walletConnected || claimLoading) return

    try {
      safeSetState(setClaimLoading, true)
      addLog('🎁 开始领取卡牌...', 'info')

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const feeWei = ethers.parseEther(participationFee)
      const tx = await contract.claimDailyCards({ 
        value: feeWei,
        gasLimit: 500000
      })

      addLog('📤 交易已发送，等待确认...', 'info')
      await tx.wait()
      
      addLog('✅ 领取成功！', 'success')
      
      // 重新加载数据
      setTimeout(() => {
        loadContractData()
      }, 2000)

    } catch (err) {
      addLog(`❌ 领取失败: ${err.message}`, 'error')
      
      if (err.message.includes('Already claimed')) {
        alert('今日已领取过卡牌')
      } else if (err.message.includes('insufficient funds')) {
        alert('MON余额不足')
      } else {
        alert(`领取失败: ${err.message}`)
      }
    } finally {
      safeSetState(setClaimLoading, false)
    }
  }, [walletConnected, claimLoading, participationFee, addLog, safeSetState, loadContractData])

  // 初始化
  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        addLog('🚀 应用启动中...', 'info')

        // 检查基础环境
        if (!window.ethereum) {
          safeSetState(setError, '请安装MetaMask钱包')
          safeSetState(setStatus, '❌ 需要MetaMask')
          return
        }

        if (!CONTRACT_ADDRESS) {
          safeSetState(setError, '合约地址未配置')
          safeSetState(setStatus, '❌ 合约未配置')
          return
        }

        // 等待初始化完成
        setTimeout(async () => {
          if (!mounted) return

          safeSetState(setIsLoading, false)
          safeSetState(setStatus, '等待钱包连接...')

          // 检查是否已连接
          const connected = await checkWallet()
          if (connected && mounted) {
            await loadContractData()
          }
        }, 1500)

      } catch (err) {
        addLog(`❌ 初始化失败: ${err.message}`, 'error')
        safeSetState(setError, err.message)
        safeSetState(setIsLoading, false)
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [checkWallet, loadContractData, addLog, safeSetState])

  // 加载屏幕
  if (isLoading) {
    return (
      <div style={{
        background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '2rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎴</div>
          <div>正在加载魔法世界...</div>
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
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* 状态提醒 */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(231, 76, 60, 0.9)',
          color: 'white',
          padding: '15px 25px',
          borderRadius: '10px',
          zIndex: 1001,
          textAlign: 'center',
          fontSize: '14px',
          maxWidth: '80%'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 调试面板 */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.9)',
        padding: '15px',
        borderRadius: '10px',
        fontSize: '11px',
        maxWidth: '300px',
        maxHeight: '200px',
        overflow: 'auto',
        zIndex: 1000,
        border: '1px solid #444'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#FFD700' }}>
          🔍 状态监控
        </div>
        <div style={{ marginBottom: '5px' }}>状态: {status}</div>
        <div style={{ marginBottom: '5px' }}>钱包: {walletConnected ? '✅' : '❌'}</div>
        <div style={{ marginBottom: '5px' }}>卡牌: {cards.length} 张</div>
        
        <details>
          <summary style={{ cursor: 'pointer', color: '#3498DB', fontSize: '10px' }}>
            日志 ({logs.length})
          </summary>
          <div style={{ maxHeight: '80px', overflow: 'auto', marginTop: '5px' }}>
            {logs.slice(-5).map((log, index) => (
              <div key={index} style={{ 
                margin: '1px 0', 
                fontSize: '9px',
                color: log.type === 'error' ? '#E74C3C' : 
                       log.type === 'success' ? '#27AE60' : 
                       log.type === 'warning' ? '#F39C12' : '#BDC3C7'
              }}>
                [{log.timestamp}] {log.message}
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* 主内容区域 */}
      <div style={{ 
        display: 'flex', 
        gap: '30px',
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 40px)'
      }}>
        
        {/* 左侧控制面板 */}
        <div style={{
          width: '350px',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.08)',
          padding: '25px',
          borderRadius: '20px',
          height: 'fit-content',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              marginBottom: '15px', 
              background: 'linear-gradient(45deg, #FFD700, #FF6B6B)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              🎴 Monad 卡牌世界
            </h1>
            <div style={{ fontSize: '0.9rem', opacity: 0.9, lineHeight: '1.5' }}>
              <div style={{ marginBottom: '8px' }}>参与费用: {participationFee} MON</div>
              <div style={{ marginBottom: '8px' }}>卡牌数量: {cards.length} 张</div>
              <div>用户地址: {userAddress ? `${userAddress.slice(0,6)}...${userAddress.slice(-4)}` : '未连接'}</div>
            </div>
          </div>

          {!walletConnected ? (
            <button 
              onClick={connectWallet}
              style={{
                background: 'linear-gradient(45deg, #3498DB, #2980B9)',
                border: 'none',
                color: 'white',
                padding: '15px 20px',
                fontSize: '1.1rem',
                borderRadius: '25px',
                cursor: 'pointer',
                width: '100%',
                marginBottom: '15px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
              }}
            >
              🔗 连接MetaMask钱包
            </button>
          ) : (
            <button 
              onClick={claimCards}
              disabled={claimLoading}
              style={{
                background: claimLoading ? '#666' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                border: 'none',
                color: 'white',
                padding: '15px 20px',
                fontSize: '1.1rem',
                borderRadius: '25px',
                cursor: claimLoading ? 'not-allowed' : 'pointer',
                width: '100%',
                marginBottom: '15px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
              }}
            >
              {claimLoading ? '🔄 处理中...' : '🎁 领取今日卡牌'}
            </button>
          )}

          {/* 游戏说明 */}
          <div style={{
            marginTop: '25px',
            padding: '15px',
            background: 'rgba(52, 152, 219, 0.1)',
            borderRadius: '10px',
            border: '1px solid #3498DB',
            fontSize: '0.85rem',
            lineHeight: '1.4'
          }}>
            <h4 style={{ color: '#3498DB', margin: '0 0 10px 0' }}>🎮 游戏说明</h4>
            <div>• 每日领取5张随机加密货币卡牌</div>
            <div>• 选择5张卡牌组成手牌参与竞赛</div>
            <div>• 根据价格波动获得积分</div>
            <div>• 24小时一轮，最高分获胜</div>
          </div>
        </div>

        {/* 右侧卡牌展示区域 */}
        <div style={{
          flex: 1,
          background: 'rgba(255,255,255,0.04)',
          padding: '25px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          minHeight: '600px'
        }}>
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: '25px',
            color: '#FFD700',
            fontSize: '1.8rem'
          }}>
            🎁 我的卡牌收藏 ({cards.length})
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px',
            minHeight: '400px'
          }}>
            {cards.length > 0 ? (
              cards.map((card, index) => (
                <div 
                  key={`card-${index}`}
                  style={{
                    background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
                    border: '3px solid #fff',
                    borderRadius: '15px',
                    padding: '20px',
                    textAlign: 'center',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
                  }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
                    {card.symbol === 'BTC' ? '₿' : 
                     card.symbol === 'ETH' ? 'Ξ' : 
                     card.symbol === 'SOL' ? '◎' : '💰'}
                  </div>
                  
                  <h4 style={{ margin: '10px 0', fontSize: '1.1rem' }}>
                    {card.symbol} - {card.name}
                  </h4>
                  
                  <div style={{ fontSize: '0.85rem', opacity: 0.9, marginBottom: '12px' }}>
                    <div>稀有度: ⭐{Number(card.rarity)}</div>
                    <div>分数: 💰{Number(card.baseScore)}</div>
                    <div>等级: 🔥{Number(card.level)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                gridColumn: '1 / -1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 30px',
                background: 'linear-gradient(135deg, rgba(255,193,7,0.15), rgba(255,152,0,0.08))',
                borderRadius: '20px',
                border: '3px dashed #FFC107',
                minHeight: '400px'
              }}>
                <div style={{ fontSize: '6rem', marginBottom: '25px', opacity: 0.8 }}>🎴</div>
                <h3 style={{ color: '#FFC107', marginBottom: '20px', fontSize: '2rem' }}>
                  暂无卡牌
                </h3>
                <p style={{ color: '#FFD700', marginBottom: '25px', fontSize: '1.2rem', textAlign: 'center' }}>
                  {walletConnected ? 
                    '点击左侧"🎁 领取今日卡牌"按钮获取你的第一批加密货币卡牌！' :
                    '请先连接MetaMask钱包，然后领取卡牌开始游戏！'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default StableApp
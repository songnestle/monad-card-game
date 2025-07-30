import { useState, useEffect } from 'react'
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

function FixedApp() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [participationFee, setParticipationFee] = useState(0)
  const [activeHand, setActiveHand] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [debugLog, setDebugLog] = useState([])
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('初始化中...')
  const [walletConnected, setWalletConnected] = useState(false)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLog(prev => [...prev.slice(-15), { message, type, timestamp }])
    console.log(`[${timestamp}] ${message}`)
  }

  // 自动连接钱包和切换网络
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('未检测到Web3钱包，请安装MetaMask')
      setConnectionStatus('❌ 钱包未安装')
      addLog('❌ 未检测到Web3钱包', 'error')
      return false
    }

    try {
      addLog('🔄 连接钱包...', 'info')
      
      // 请求连接钱包
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // 检查网络 - Monad 测试网
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      addLog(`📡 当前网络ID: ${parseInt(chainId, 16)}`, 'info')
      
      // Monad 测试网 Chain ID = 10143 (实际部署的网络)
      if (parseInt(chainId, 16) !== 10143) {
        addLog('🔄 切换到Monad测试网...', 'info')
        try {
          // 尝试切换到Monad测试网
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x279f' }], // 10143 in hex
          })
        } catch (switchError) {
          // 如果网络不存在，添加网络
          if (switchError.code === 4902) {
            addLog('➕ 添加Monad测试网...', 'info')
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

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const userAddress = await signer.getAddress()
      
      setWalletConnected(true)
      addLog(`✅ 钱包已连接: ${userAddress.slice(0,10)}...`, 'success')
      return true
      
    } catch (err) {
      addLog(`❌ 钱包连接失败: ${err.message}`, 'error')
      setError('钱包连接失败: ' + err.message)
      return false
    }
  }

  const loadData = async () => {
    try {
      addLog('🔄 开始加载数据...', 'info')
      
      if (!CONTRACT_ADDRESS) {
        setError('合约地址未配置 - 请检查.env文件')
        setConnectionStatus('❌ 合约地址缺失')
        addLog('❌ 合约地址未配置', 'error')
        return
      }

    // 确保钱包已连接
    const connected = await connectWallet()
    if (!connected) {
      setConnectionStatus('❌ 钱包连接失败')
      return
    }

      setConnectionStatus('🔄 连接合约中...')
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)
      
      addLog(`✅ 合约实例创建成功: ${CONTRACT_ADDRESS}`, 'success')

      setConnectionStatus('🔄 获取参与费用...')
      addLog('🔄 获取参与费用...', 'info')
      
      const fee = await contract.participationFee()
      setParticipationFee(Number(fee))
      addLog(`✅ 参与费用: ${ethers.formatEther(fee)} MON`, 'success')

      setConnectionStatus('🔄 获取卡牌数据...')
      addLog('🔄 获取我的卡牌...', 'info')
      
      const myCards = await contract.getMyCards()
      setCards(myCards)
      addLog(`✅ 获得 ${myCards.length} 张卡牌`, 'success')

      setConnectionStatus('🔄 获取手牌数据...')
      try {
        const myHand = await contract.getMyActiveHand()
        setActiveHand(myHand)
        addLog(`✅ 手牌状态: ${myHand.isActive ? '激活' : '未激活'}`, 'success')
      } catch (err) {
        addLog(`⚠️ 获取手牌失败: ${err.message}`, 'warning')
      }

      setConnectionStatus('✅ 数据加载完成')
      addLog('🎉 所有数据加载完成', 'success')
      setError(null)
      
    } catch (err) {
      console.error("数据加载失败:", err)
      const errorMsg = err.message || '未知错误'
      setError('数据加载失败: ' + errorMsg)
      setConnectionStatus('❌ 加载失败')
      addLog(`❌ 数据加载失败: ${errorMsg}`, 'error')
      
      // 防止闪退 - 设置默认状态
      setWalletConnected(false)
      setCards([])
      setParticipationFee(0)
    }
  }

  useEffect(() => {
    let mounted = true
    
    const initApp = async () => {
      if (!mounted) return
      
      addLog('🚀 应用启动中...', 'info')
      
      // 检查基本环境
      if (typeof window === 'undefined') {
        addLog('❌ 浏览器环境检查失败', 'error')
        return
      }
      
      setTimeout(async () => {
        if (!mounted) return
        
        setIsLoading(false)
        addLog('✅ 启动动画完成，开始加载数据', 'info')
        
        try {
          await loadData()
        } catch (err) {
          addLog(`❌ 初始化失败: ${err.message}`, 'error')
          setError('应用初始化失败: ' + err.message)
        }
      }, 2000)
    }
    
    initApp()
    
    return () => {
      mounted = false
    }
  }, [])

  const handleClaimDailyCards = async () => {
    if (!walletConnected) {
      addLog('❌ 请先连接钱包', 'error')
      alert('请先连接MetaMask钱包')
      return
    }
    
    if (!CONTRACT_ADDRESS) {
      addLog('❌ 合约地址未配置', 'error')
      alert('合约未部署，请联系管理员')
      return
    }
    
    try {
      setLoading(true)
      addLog('🎁 开始领取卡牌...', 'info')
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const userAddress = await signer.getAddress()
      const balance = await provider.getBalance(userAddress)
      addLog(`💰 账户余额: ${ethers.formatEther(balance)} MON`, 'info')
      addLog(`💰 所需费用: ${ethers.formatEther(participationFee)} MON`, 'info')
      
      if (BigInt(balance) < BigInt(participationFee)) {
        const msg = `MON余额不足：需要 ${ethers.formatEther(participationFee)} MON，当前 ${ethers.formatEther(balance)} MON`
        addLog(`❌ ${msg}`, 'error')
        throw new Error(msg)
      }

      addLog('📤 发送交易中...', 'info')
      const tx = await contract.claimDailyCards({ 
        value: participationFee,
        gasLimit: 500000
      })
      
      addLog(`📝 交易已发送: ${tx.hash}`, 'info')
      await tx.wait()
      addLog('✅ 交易确认成功', 'success')
      
      await loadData()
      alert('成功领取5张卡牌！')
    } catch (err) {
      console.error("领取失败:", err)
      const errorMsg = err.message || '未知错误'
      addLog(`❌ 领取失赅: ${errorMsg}`, 'error')
      
      if (errorMsg.includes('Already claimed') || errorMsg.includes('已领取')) {
        alert("今日已领取过卡牌")
      } else if (errorMsg.includes('insufficient funds') || errorMsg.includes('余额不足')) {
        alert("余额不足，请先获取更多 MON 测试币")
      } else if (errorMsg.includes('user rejected') || errorMsg.includes('User denied')) {
        alert("用户取消了交易")
      } else {
        alert("领取失败：" + errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleCardSelection = (cardIndex) => {
    try {
      if (cardIndex >= cards.length || cardIndex < 0) {
        addLog(`❌ 无效的卡牌索引: ${cardIndex}`, 'error')
        return
      }
      
      addLog(`🎯 切换卡牌选择: 索引 ${cardIndex}`, 'info')
      setSelectedCards(prev => {
        if (prev.includes(cardIndex)) {
          addLog(`➖ 取消选择卡牌: ${cardIndex}`, 'info')
          return prev.filter(index => index !== cardIndex)
        } else if (prev.length < 5) {
          addLog(`➕ 选择卡牌: ${cardIndex}`, 'info')
          return [...prev, cardIndex]
        } else {
          addLog(`⚠️ 已选择5张卡牌，无法继续选择`, 'warning')
        }
        return prev
      })
    } catch (err) {
      addLog(`❌ 卡牌选择错误: ${err.message}`, 'error')
    }
  }

  // 测试卡牌数据
  const testCards = [
    { id: 1, symbol: 'BTC', name: 'Bitcoin', rarity: 5, baseScore: 100, level: 1 },
    { id: 2, symbol: 'ETH', name: 'Ethereum', rarity: 5, baseScore: 95, level: 1 },
    { id: 3, symbol: 'SOL', name: 'Solana', rarity: 5, baseScore: 80, level: 1 }
  ]

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
      width: '100vw', // 确保全屏宽度
      padding: '20px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* 网络状态提醒 */}
      {!walletConnected && (
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
          fontSize: '14px'
        }}>
          ⚠️ 请连接MetaMask钱包并切换到Monad测试网 (Chain ID: 10143)
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
        maxWidth: '350px',
        maxHeight: '250px',
        overflow: 'auto',
        zIndex: 1000,
        border: '1px solid #444'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#FFD700' }}>
          🔍 系统状态
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          状态: {connectionStatus}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          钱包: {walletConnected ? '✅ 已连接' : '❌ 未连接'}
        </div>
        
        <div style={{ marginBottom: '8px' }}>
          卡牌: {cards.length} 张
        </div>
        
        {error && (
          <div style={{ color: '#E74C3C', marginBottom: '8px', fontSize: '10px' }}>
            错误: {error}
          </div>
        )}
        
        <details>
          <summary style={{ cursor: 'pointer', color: '#3498DB', fontSize: '10px' }}>
            详细日志 ({debugLog.length})
          </summary>
          <div style={{ maxHeight: '100px', overflow: 'auto', marginTop: '5px' }}>
            {debugLog.slice(-8).map((log, index) => (
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

      {/* 主内容区域 - 修复布局 */}
      <div style={{ 
        display: 'flex', 
        gap: '30px',
        maxWidth: '1600px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 40px)'
      }}>
        
        {/* 左侧控制面板 */}
        <div style={{
          width: '380px',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.08)',
          padding: '25px',
          borderRadius: '20px',
          height: 'fit-content',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '25px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '15px', background: 'linear-gradient(45deg, #FFD700, #FF6B6B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🎴 Monad 卡牌世界
            </h1>
            <div style={{ fontSize: '0.95rem', opacity: 0.9, lineHeight: '1.5' }}>
              <div style={{ marginBottom: '8px' }}>参与费用: {ethers.formatEther(participationFee)} MON</div>
              <div style={{ marginBottom: '8px' }}>卡牌数量: {cards.length} 张</div>
              <div>选中卡牌: {selectedCards.length}/5 张</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={handleClaimDailyCards} 
              disabled={loading || !walletConnected}
              style={{
                background: loading ? '#666' : !walletConnected ? '#E74C3C' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                border: 'none',
                color: 'white',
                padding: '15px 20px',
                fontSize: '1.1rem',
                borderRadius: '25px',
                cursor: (loading || !walletConnected) ? 'not-allowed' : 'pointer',
                width: '100%',
                marginBottom: '15px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
              }}
            >
              {loading ? '🔄 处理中...' : 
               !walletConnected ? '⚠️ 请先连接钱包' :
               `🎁 领取今日卡牌`}
            </button>

            <button 
              onClick={() => {
                addLog('🧪 加载测试数据', 'info')
                setCards(testCards)
              }}
              style={{
                background: 'linear-gradient(45deg, #9B59B6, #8E44AD)',
                border: 'none',
                color: 'white',
                padding: '12px 18px',
                fontSize: '0.95rem',
                borderRadius: '20px',
                cursor: 'pointer',
                width: '100%',
                marginBottom: '15px'
              }}
            >
              🧪 测试卡牌渲染
            </button>

            <button 
              onClick={loadData}
              style={{
                background: 'linear-gradient(45deg, #3498DB, #2980B9)',
                border: 'none',
                color: 'white',
                padding: '10px 15px',
                fontSize: '0.9rem',
                borderRadius: '15px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              🔄 重新连接
            </button>
          </div>

          {activeHand && activeHand.isActive && (
            <div style={{
              background: 'rgba(39, 174, 96, 0.2)',
              padding: '18px',
              borderRadius: '15px',
              border: '2px solid #27AE60'
            }}>
              <h4 style={{ color: '#27AE60', margin: '0 0 10px 0', fontSize: '1.1rem' }}>✅ 当前手牌</h4>
              <div style={{ fontSize: '0.95rem' }}>总分数: {activeHand.totalScore}</div>
            </div>
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

        {/* 右侧卡牌展示区域 - 修复布局 */}
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
          
          {/* 卡牌网格或空状态 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '20px',
            minHeight: '400px'
          }}>
            {cards.length > 0 ? (
              cards.map((card, index) => (
                <div 
                  key={`card-${index}-${card.id || index}`} 
                  onClick={() => toggleCardSelection(index)}
                  style={{
                    background: selectedCards.includes(index) 
                      ? 'linear-gradient(135deg, #27AE60, #229954)'
                      : 'linear-gradient(135deg, #4ECDC4, #44A08D)',
                    border: '3px solid #fff',
                    borderRadius: '15px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: selectedCards.includes(index) ? 'scale(1.05)' : 'scale(1)',
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
                  
                  <div style={{ 
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    {selectedCards.includes(index) ? '✅ 已选择' : '🎯 点击选择'}
                  </div>
                </div>
              ))
            ) : (
              // 增强版空状态
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
                  点击左侧"🎁 领取今日卡牌"按钮<br/>获取你的第一批加密货币卡牌！
                </p>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '20px', 
                  borderRadius: '15px',
                  textAlign: 'center',
                  maxWidth: '500px'
                }}>
                  <div style={{ fontSize: '1rem', marginBottom: '15px', color: '#FFD700' }}>
                    💡 温馨提示：
                  </div>
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.8', opacity: 0.9 }}>
                    • 确保MetaMask已连接到Monad测试网<br/>
                    • 网络ID需要设置为 10143 (Monad Testnet)<br/>
                    • 每日可免费领取5张随机卡牌<br/>
                    • 选择5张卡牌组成手牌参与竞赛
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 选择提示 */}
          {cards.length > 0 && selectedCards.length < 5 && (
            <div style={{
              textAlign: 'center',
              marginTop: '25px',
              padding: '20px',
              background: 'rgba(255, 193, 7, 0.15)',
              borderRadius: '15px',
              border: '2px solid #FFC107'
            }}>
              <div style={{ color: '#FFC107', fontSize: '1.1rem', marginBottom: '8px' }}>
                💡 请选择5张卡牌组成手牌参与竞赛
              </div>
              <div style={{ fontSize: '0.95rem', opacity: 0.8 }}>
                已选择 {selectedCards.length}/5 张卡牌
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FixedApp
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

function DiagnosticApp() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [participationFee, setParticipationFee] = useState(0)
  const [activeHand, setActiveHand] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [debugLog, setDebugLog] = useState([])
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('初始化中...')
  const [renderTest, setRenderTest] = useState('测试组件')

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLog(prev => [...prev.slice(-20), { message, type, timestamp }])
    console.log(`[${timestamp}] ${message}`)
  }

  const loadData = async () => {
    addLog('🔄 开始加载数据...', 'info')
    
    if (!window.ethereum) {
      setError('未检测到Web3钱包')
      setConnectionStatus('❌ 钱包未安装')
      addLog('❌ 未检测到Web3钱包', 'error')
      return
    }

    if (!CONTRACT_ADDRESS) {
      setError('合约地址未配置: ' + CONTRACT_ADDRESS)
      setConnectionStatus('❌ 合约地址缺失')
      addLog('❌ 合约地址未配置', 'error')
      return
    }

    try {
      setConnectionStatus('🔄 连接钱包中...')
      addLog('🔄 连接钱包...', 'info')
      
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const userAddress = await signer.getAddress()
      
      addLog(`✅ 钱包已连接: ${userAddress.slice(0,10)}...`, 'success')
      setConnectionStatus('🔄 连接合约中...')

      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)
      addLog(`✅ 合约实例创建成功: ${CONTRACT_ADDRESS.slice(0,10)}...`, 'success')

      // 检查网络
      const network = await provider.getNetwork()
      addLog(`📡 网络ID: ${network.chainId}`, 'info')
      
      if (network.chainId !== 31337n) {
        setError(`网络错误: 当前${network.chainId}, 需要31337`)
        setConnectionStatus('❌ 网络错误')
        addLog(`❌ 网络ID错误: ${network.chainId}`, 'error')
        return
      }

      setConnectionStatus('🔄 获取参与费用...')
      addLog('🔄 获取参与费用...', 'info')
      
      // 获取参与费用
      const fee = await contract.participationFee()
      setParticipationFee(Number(fee))
      addLog(`✅ 参与费用: ${ethers.formatEther(fee)} ETH`, 'success')

      setConnectionStatus('🔄 获取卡牌数据...')
      addLog('🔄 获取我的卡牌...', 'info')
      
      // 获取我的卡牌
      const myCards = await contract.getMyCards()
      addLog(`📊 卡牌数据原始格式: ${JSON.stringify(myCards.length)}`, 'info')
      addLog(`📊 卡牌数组类型: ${Array.isArray(myCards)}`, 'info')
      
      if (myCards && myCards.length > 0) {
        addLog(`📊 第一张卡牌数据: ${JSON.stringify({
          id: Number(myCards[0].id),
          symbol: myCards[0].symbol,
          name: myCards[0].name,
          rarity: Number(myCards[0].rarity)
        })}`, 'info')
      }
      
      setCards(myCards)
      addLog(`✅ 获得 ${myCards.length} 张卡牌`, 'success')

      setConnectionStatus('🔄 获取手牌数据...')
      addLog('🔄 获取活跃手牌...', 'info')
      
      // 获取活跃手牌
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
      setError('数据加载失败: ' + err.message)
      setConnectionStatus('❌ 加载失败')
      addLog(`❌ 数据加载失败: ${err.message}`, 'error')
    }
  }

  useEffect(() => {
    addLog('🚀 应用启动中...', 'info')
    
    // 测试渲染
    setRenderTest('组件已挂载')
    
    setTimeout(() => {
      setIsLoading(false)
      addLog('✅ 启动动画完成，开始加载数据', 'info')
      loadData()
    }, 2000)
  }, [])

  const handleClaimDailyCards = async () => {
    try {
      setLoading(true)
      addLog('🎁 开始领取卡牌...', 'info')
      
      if (!window.ethereum) {
        throw new Error("请安装MetaMask钱包")
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const balance = await provider.getBalance(await signer.getAddress())
      addLog(`💰 账户余额: ${ethers.formatEther(balance)} ETH`, 'info')
      
      if (balance < participationFee) {
        throw new Error("ETH余额不足")
      }

      addLog('📤 发送交易中...', 'info')
      const tx = await contract.claimDailyCards({ 
        value: participationFee,
        gasLimit: 500000
      })
      
      addLog(`📝 交易已发送: ${tx.hash}`, 'info')
      await tx.wait()
      addLog('✅ 交易确认成功', 'success')
      
      // 重新加载数据
      await loadData()
      alert('成功领取5张卡牌！')
    } catch (err) {
      console.error("领取失败:", err)
      addLog(`❌ 领取失败: ${err.message}`, 'error')
      
      if (err.message.includes('Already claimed')) {
        alert("今日已领取过卡牌")
        addLog('ℹ️ 今日已领取过卡牌', 'warning')
      } else {
        alert("领取失败：" + err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleCardSelection = (cardIndex) => {
    addLog(`🎯 切换卡牌选择: 索引 ${cardIndex}`, 'info')
    setSelectedCards(prev => {
      if (prev.includes(cardIndex)) {
        return prev.filter(index => index !== cardIndex)
      } else if (prev.length < 5) {
        return [...prev, cardIndex]
      }
      return prev
    })
  }

  // 强制渲染测试数据
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
        <div>
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
      padding: '20px',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* 详细调试面板 */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.9)',
        padding: '15px',
        borderRadius: '10px',
        fontSize: '11px',
        maxWidth: '400px',
        maxHeight: '300px',
        overflow: 'auto',
        zIndex: 1000,
        border: '1px solid #444'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#FFD700' }}>
          🔍 实时诊断面板
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <strong>状态:</strong> {connectionStatus}
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <strong>卡牌数量:</strong> {cards.length} 张
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <strong>渲染测试:</strong> {renderTest}
        </div>
        
        {error && (
          <div style={{ color: '#E74C3C', marginBottom: '10px' }}>
            <strong>错误:</strong> {error}
          </div>
        )}
        
        <details>
          <summary style={{ cursor: 'pointer', color: '#3498DB' }}>
            详细日志 ({debugLog.length})
          </summary>
          <div style={{ maxHeight: '150px', overflow: 'auto', marginTop: '5px' }}>
            {debugLog.slice(-10).map((log, index) => (
              <div key={index} style={{ 
                margin: '2px 0', 
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
        display: 'grid', 
        gridTemplateColumns: '350px 1fr', 
        gap: '30px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        
        {/* 左侧控制面板 */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '20px',
          borderRadius: '15px',
          height: 'fit-content'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>
              🎴 Monad 卡牌世界
            </h1>
            <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '15px' }}>
              <div>参与费用: {ethers.formatEther(participationFee)} ETH</div>
              <div>卡牌数量: {cards.length} 张</div>
              <div>选中卡牌: {selectedCards.length}/5 张</div>
            </div>
          </div>

          <button 
            onClick={handleClaimDailyCards} 
            disabled={loading}
            style={{
              background: loading ? '#666' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
              border: 'none',
              color: 'white',
              padding: '12px 20px',
              fontSize: '1rem',
              borderRadius: '20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              marginBottom: '15px'
            }}
          >
            {loading ? '处理中...' : `🎁 领取今日卡牌`}
          </button>

          {/* 测试按钮 */}
          <button 
            onClick={() => {
              addLog('🧪 使用测试数据', 'info')
              setCards(testCards)
            }}
            style={{
              background: 'linear-gradient(45deg, #9B59B6, #8E44AD)',
              border: 'none',
              color: 'white',
              padding: '10px 15px',
              fontSize: '0.9rem',
              borderRadius: '15px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '15px'
            }}
          >
            🧪 加载测试卡牌
          </button>

          {activeHand && activeHand.isActive && (
            <div style={{
              background: 'rgba(39, 174, 96, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              border: '2px solid #27AE60'
            }}>
              <h4 style={{ color: '#27AE60', margin: '0 0 8px 0' }}>✅ 当前手牌</h4>
              <div>总分数: {activeHand.totalScore}</div>
            </div>
          )}
        </div>

        {/* 右侧卡牌展示区域 */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          padding: '20px',
          borderRadius: '15px',
          minHeight: '500px'
        }}>
          <h2 style={{ 
            textAlign: 'center', 
            marginBottom: '20px',
            color: '#FFD700'
          }}>
            🎁 我的卡牌收藏 ({cards.length})
          </h2>
          
          {/* 调试信息显示 */}
          <div style={{
            background: 'rgba(52, 152, 219, 0.1)',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '20px',
            fontSize: '0.8rem',
            border: '1px solid #3498DB'
          }}>
            <strong>🔍 渲染调试:</strong> cards数组长度={cards.length}, 
            类型={Array.isArray(cards) ? 'Array' : typeof cards}, 
            状态={connectionStatus}
          </div>
          
          {/* 卡牌网格 */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '15px',
            minHeight: '300px'
          }}>
            {cards.length > 0 ? (
              cards.map((card, index) => {
                addLog(`🎴 渲染卡牌 ${index}: ${card.symbol}`, 'info')
                return (
                  <div 
                    key={index} 
                    onClick={() => toggleCardSelection(index)}
                    style={{
                      background: selectedCards.includes(index) 
                        ? 'linear-gradient(135deg, #27AE60, #229954)'
                        : 'linear-gradient(135deg, #4ECDC4, #44A08D)',
                      border: '2px solid #fff',
                      borderRadius: '12px',
                      padding: '15px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      transform: selectedCards.includes(index) ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                      {card.symbol === 'BTC' ? '₿' : 
                       card.symbol === 'ETH' ? 'Ξ' : 
                       card.symbol === 'SOL' ? '◎' : '💰'}
                    </div>
                    
                    <h4 style={{ margin: '8px 0', fontSize: '0.9rem' }}>
                      {card.symbol} - {card.name}
                    </h4>
                    
                    <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                      <div>稀有度: ⭐{Number(card.rarity)}</div>
                      <div>分数: 💰{Number(card.baseScore)}</div>
                      <div>等级: 🔥{Number(card.level)}</div>
                    </div>
                    
                    <div style={{ 
                      marginTop: '8px', 
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}>
                      {selectedCards.includes(index) ? '✅ 已选择' : '🎯 点击选择'}
                    </div>
                  </div>
                )
              })
            ) : (
              // 强化版空状态
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '40px 20px',
                background: 'linear-gradient(135deg, rgba(255,193,7,0.1), rgba(255,152,0,0.05))',
                borderRadius: '15px',
                border: '2px dashed #FFC107'
              }}>
                <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🎴</div>
                <h3 style={{ color: '#FFC107', marginBottom: '15px', fontSize: '1.5rem' }}>
                  暂无卡牌
                </h3>
                <p style={{ color: '#FFD700', marginBottom: '20px', fontSize: '1.1rem' }}>
                  点击左侧按钮领取你的第一批卡牌吧！
                </p>
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: '15px', 
                  borderRadius: '10px',
                  marginTop: '20px'
                }}>
                  <div style={{ fontSize: '0.9rem', marginBottom: '10px' }}>
                    🎮 游戏说明：
                  </div>
                  <div style={{ fontSize: '0.8rem', lineHeight: '1.6' }}>
                    • 每日可领取5张随机加密货币卡牌<br/>
                    • 选择5张卡牌组成手牌参与竞赛<br/>
                    • 根据价格波动获得积分
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 选择提示 */}
          {cards.length > 0 && selectedCards.length < 5 && (
            <div style={{
              textAlign: 'center',
              marginTop: '20px',
              padding: '15px',
              background: 'rgba(255, 193, 7, 0.1)',
              borderRadius: '10px',
              border: '1px solid #FFC107'
            }}>
              <div style={{ color: '#FFC107' }}>
                💡 请选择5张卡牌组成手牌参与竞赛
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '5px' }}>
                已选择 {selectedCards.length}/5 张
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DiagnosticApp
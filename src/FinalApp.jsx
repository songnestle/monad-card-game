import { useState, useCallback, useEffect } from 'react'

// 直接在组件内定义数据，避免外部依赖问题
const cryptoCardsData = [
  // Tier 1: Top 5 - 最高稀有度 (Mythical)
  { id: 1, symbol: 'BTC', name: 'Bitcoin', rarity: 5, emoji: '₿', color: '#F7931A' },
  { id: 2, symbol: 'ETH', name: 'Ethereum', rarity: 5, emoji: 'Ξ', color: '#627EEA' },
  { id: 3, symbol: 'USDT', name: 'Tether', rarity: 5, emoji: '₮', color: '#26A17B' },
  { id: 4, symbol: 'BNB', name: 'BNB', rarity: 5, emoji: '🟨', color: '#F3BA2F' },
  { id: 5, symbol: 'SOL', name: 'Solana', rarity: 5, emoji: '◎', color: '#9945FF' },

  // Tier 2: 6-10 - 传说级 (Legendary)
  { id: 6, symbol: 'USDC', name: 'USD Coin', rarity: 4, emoji: '🔵', color: '#2775CA' },
  { id: 7, symbol: 'XRP', name: 'Ripple', rarity: 4, emoji: '💧', color: '#23292F' },
  { id: 8, symbol: 'DOGE', name: 'Dogecoin', rarity: 4, emoji: '🐕', color: '#C2A633' },
  { id: 9, symbol: 'TON', name: 'Toncoin', rarity: 4, emoji: '💎', color: '#0088CC' },
  { id: 10, symbol: 'ADA', name: 'Cardano', rarity: 4, emoji: '🌊', color: '#0033AD' },

  // Tier 3: 11-20 - 史诗级 (Epic)
  { id: 11, symbol: 'AVAX', name: 'Avalanche', rarity: 3, emoji: '🔺', color: '#E84142' },
  { id: 12, symbol: 'WETH', name: 'Wrapped Ethereum', rarity: 3, emoji: '🔄', color: '#FF6B9D' },
  { id: 13, symbol: 'SHIB', name: 'Shiba Inu', rarity: 3, emoji: '🐕‍🦺', color: '#FFA409' },
  { id: 14, symbol: 'DOT', name: 'Polkadot', rarity: 3, emoji: '⚫', color: '#E6007A' },
  { id: 15, symbol: 'LINK', name: 'Chainlink', rarity: 3, emoji: '🔗', color: '#375BD2' },

  // Tier 4: 21-25 - 稀有级 (Rare)
  { id: 16, symbol: 'MATIC', name: 'Polygon', rarity: 2, emoji: '🟣', color: '#8247E5' },
  { id: 17, symbol: 'LTC', name: 'Litecoin', rarity: 2, emoji: 'Ł', color: '#BFBBBB' },
  { id: 18, symbol: 'ICP', name: 'Internet Computer', rarity: 2, emoji: '∞', color: '#29ABE2' },
  { id: 19, symbol: 'APT', name: 'Aptos', rarity: 2, emoji: '🅰', color: '#000000' },
  { id: 20, symbol: 'DAI', name: 'Dai', rarity: 2, emoji: '◈', color: '#F5AC37' },

  // Tier 5: 26-30 - 普通级 (Common)
  { id: 21, symbol: 'ETC', name: 'Ethereum Classic', rarity: 1, emoji: '💎', color: '#328332' },
  { id: 22, symbol: 'ATOM', name: 'Cosmos', rarity: 1, emoji: '⚛️', color: '#2E3148' },
  { id: 23, symbol: 'XLM', name: 'Stellar', rarity: 1, emoji: '⭐', color: '#7D00FF' },
  { id: 24, symbol: 'XMR', name: 'Monero', rarity: 1, emoji: '👤', color: '#FF6600' },
  { id: 25, symbol: 'OKB', name: 'OKB', rarity: 1, emoji: '🅾️', color: '#3075EE' }
]

const rarityNames = {
  1: "普通", 2: "稀有", 3: "史诗", 4: "传说", 5: "神话"
}

function FinalApp() {
  console.log('FinalApp 开始渲染')

  // 状态管理
  const [selectedCards, setSelectedCards] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentTab, setCurrentTab] = useState('cards')
  const [walletAddress, setWalletAddress] = useState('')
  const [balance, setBalance] = useState('0.0')
  const [ownedCards, setOwnedCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // 启动屏幕效果
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // 卡牌选择处理
  const handleCardSelection = useCallback((cardIndex) => {
    setSelectedCards(prev => {
      if (prev.includes(cardIndex)) {
        return prev.filter(index => index !== cardIndex)
      } else if (prev.length < 5) {
        return [...prev, cardIndex]
      }
      return prev
    })
  }, [])

  // 连接钱包
  const handleConnectWallet = useCallback(async () => {
    if (!window.ethereum) {
      alert('请安装 MetaMask 钱包')
      return
    }

    try {
      setLoading(true)
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        setIsConnected(true)
        
        // 模拟获取余额
        const provider = new (await import('ethers')).ethers.BrowserProvider(window.ethereum)
        const balance = await provider.getBalance(accounts[0])
        setBalance((await import('ethers')).ethers.formatEther(balance))
        
        // 模拟拥有一些卡牌
        setOwnedCards(cryptoCardsData.slice(0, 10).map((card, index) => ({
          ...card,
          baseScore: 50 + card.rarity * 10,
          level: 1,
          timestamp: Date.now()
        })))
        
        console.log('钱包连接成功:', accounts[0])
      }
    } catch (error) {
      console.error('连接钱包失败:', error)
      alert('连接钱包失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // 领取卡牌
  const handleClaimCards = useCallback(async () => {
    if (!isConnected) return
    
    try {
      setLoading(true)
      
      // 模拟领取过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 随机生成5张新卡牌
      const newCards = []
      for (let i = 0; i < 5; i++) {
        const randomCard = cryptoCardsData[Math.floor(Math.random() * cryptoCardsData.length)]
        newCards.push({
          ...randomCard,
          baseScore: 40 + randomCard.rarity * 12 + Math.floor(Math.random() * 20),
          level: 1,
          timestamp: Date.now()
        })
      }
      
      setOwnedCards(prev => [...prev, ...newCards])
      alert('🎉 成功领取 5 张卡牌!')
      
    } catch (error) {
      console.error('领取卡牌失败:', error)
      alert('领取失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }, [isConnected])

  // 创建手牌
  const handleCreateHand = useCallback(() => {
    if (selectedCards.length !== 5) {
      alert('请选择正好5张卡牌')
      return
    }
    
    const selectedCardData = selectedCards.map(index => ownedCards[index])
    const totalScore = selectedCardData.reduce((sum, card) => sum + (card.baseScore || 0), 0)
    
    alert(`🃏 手牌创建成功！\n总分数: ${totalScore}\n已参与竞赛！`)
    setSelectedCards([])
  }, [selectedCards, ownedCards])

  // 启动屏幕
  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        color: 'white'
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '30px',
          animation: 'pulse 2s infinite'
        }}>
          🎴
        </div>
        <h1 style={{
          fontSize: '3rem',
          background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '20px'
        }}>
          Monad 卡牌世界
        </h1>
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px'
        }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                width: '15px',
                height: '15px',
                background: '#FFD700',
                borderRadius: '50%',
                animation: `pulse 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`
              }}
            />
          ))}
        </div>
        <p style={{
          fontSize: '1.2rem',
          opacity: 0.8
        }}>
          正在进入魔法世界...
        </p>
      </div>
    )
  }

  try {
    return (
      <div style={{
        background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
        minHeight: '100vh',
        width: '100vw',
        margin: 0,
        padding: '20px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        position: 'relative',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '3rem',
            background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            🎴 Monad 卡牌世界
          </h1>
          <p style={{ color: '#bbb', fontSize: '1.2rem' }}>
            参与费用: 0.01 MON | 卡牌数量: {ownedCards.length} 张 | 已选: {selectedCards.length}/5
          </p>
        </div>

        {/* 主要按钮 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          {!isConnected ? (
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              style={{
                background: loading ? '#666' : 'linear-gradient(45deg, #3498DB, #2980B9)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)'
              }}
            >
              {loading ? '🔄 连接中...' : '🔗 连接 MetaMask 钱包'}
            </button>
          ) : (
            <button
              onClick={handleClaimCards}
              disabled={loading}
              style={{
                background: loading ? '#666' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)'
              }}
            >
              {loading ? '🔄 领取中...' : '🎁 领取今日卡牌 (0.01 MON)'}
            </button>
          )}
        </div>

        {/* 标签页导航 */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          {['cards', 'contest', 'leaderboard'].map(tab => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
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
              {tab === 'cards' ? '🎁 我的卡牌' : tab === 'contest' ? '🏆 赛事' : '📈 排行榜'}
            </button>
          ))}
        </div>

        {/* 卡牌页面 */}
        {currentTab === 'cards' && (
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#FFD700' }}>
              🎁 我的卡牌收藏 ({ownedCards.length})
            </h2>

            {ownedCards.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '20px'
              }}>
                {ownedCards.map((card, index) => {
                  const isSelected = selectedCards.includes(index)
                  const rarity = rarityNames[card.rarity] || "未知"

                  return (
                    <div
                      key={index}
                      onClick={() => handleCardSelection(index)}
                      style={{
                        background: `linear-gradient(135deg, ${card.color}30, ${card.color}10)`,
                        border: isSelected ? `3px solid ${card.color}` : `2px solid ${card.color}60`,
                        borderRadius: '15px',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: isSelected ? 
                          `0 8px 25px ${card.color}40` : 
                          '0 4px 15px rgba(0,0,0,0.2)',
                        position: 'relative'
                      }}
                    >
                      {/* 选中指示器 */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: card.color,
                          color: 'white',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </div>
                      )}

                      {/* 稀有度标识 */}
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0,0,0,0.7)',
                        color: card.color,
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {rarity}
                      </div>

                      {/* 卡牌图标 */}
                      <div style={{
                        fontSize: '3.5rem',
                        marginBottom: '15px',
                        textShadow: `0 0 20px ${card.color}80`
                      }}>
                        {card.emoji}
                      </div>

                      {/* 卡牌信息 */}
                      <h4 style={{ 
                        margin: '10px 0', 
                        color: card.color,
                        fontSize: '1.1rem'
                      }}>
                        {card.symbol}
                      </h4>

                      <div style={{ 
                        fontSize: '0.8rem', 
                        opacity: 0.9,
                        marginBottom: '15px'
                      }}>
                        {card.name}
                      </div>

                      {/* 卡牌属性 */}
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        padding: '10px',
                        borderRadius: '8px',
                        fontSize: '0.75rem'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          marginBottom: '4px'
                        }}>
                          <span>💰 分数</span>
                          <span style={{ fontWeight: 'bold', color: '#FFD700' }}>
                            {card.baseScore || 50}
                          </span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between'
                        }}>
                          <span>🔥 等级</span>
                          <span style={{ fontWeight: 'bold', color: '#FF6B6B' }}>
                            {card.level || 1}
                          </span>
                        </div>
                      </div>

                      {/* 选择状态 */}
                      <div style={{
                        marginTop: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        color: isSelected ? card.color : 'rgba(255,255,255,0.8)'
                      }}>
                        {isSelected ? '✅ 已选择' : '🎯 点击选择'}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '20px',
                border: '2px dashed #666'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎴</div>
                <h3 style={{ color: '#FFD700', marginBottom: '20px' }}>暂无卡牌</h3>
                <p style={{ fontSize: '1.2rem' }}>
                  {isConnected ? '点击上方"🎁 领取今日卡牌"开始游戏！' : '请先连接 MetaMask 钱包'}
                </p>
              </div>
            )}

            {/* 手牌创建按钮 */}
            {selectedCards.length === 5 && (
              <div style={{ textAlign: 'center', marginTop: '30px' }}>
                <button
                  onClick={handleCreateHand}
                  style={{
                    background: 'linear-gradient(45deg, #FFD700, #FF8C00)',
                    border: 'none',
                    color: 'white',
                    padding: '15px 30px',
                    fontSize: '1.2rem',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
                  }}
                >
                  🃏 创建手牌 (5/5)
                </button>
              </div>
            )}
          </div>
        )}

        {/* 赛事页面 */}
        {currentTab === 'contest' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ color: '#FFD700', marginBottom: '30px' }}>🏆 赛事系统</h2>
            <p style={{ fontSize: '1.2rem' }}>赛事功能开发中...</p>
          </div>
        )}

        {/* 排行榜页面 */}
        {currentTab === 'leaderboard' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ color: '#FFD700', marginBottom: '30px' }}>📈 排行榜</h2>
            <p style={{ fontSize: '1.2rem' }}>排行榜功能开发中...</p>
          </div>
        )}

        {/* 钱包信息显示 */}
        {isConnected && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(0,0,0,0.8)',
            padding: '15px',
            borderRadius: '10px',
            fontSize: '12px'
          }}>
            <div>🔗 已连接</div>
            <div>👤 {walletAddress.slice(0,6)}...{walletAddress.slice(-4)}</div>
            <div>💰 {parseFloat(balance).toFixed(4)} MON</div>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('FinalApp 渲染错误:', error)
    return (
      <div style={{ 
        color: 'red', 
        padding: '20px', 
        background: 'white',
        minHeight: '100vh'
      }}>
        <h1>应用错误</h1>
        <p>错误信息: {error.message}</p>
      </div>
    )
  }
}

export default FinalApp
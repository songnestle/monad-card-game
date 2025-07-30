import { useState, useCallback } from 'react'

// 安全的卡牌应用 - 不依赖外部文件
function SafeApp() {
  console.log('SafeApp 开始渲染')

  const [selectedCards, setSelectedCards] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)

  // 模拟卡牌数据
  const mockCards = [
    { id: 1, symbol: 'BTC', name: 'Bitcoin', rarity: 5, emoji: '₿', color: '#F7931A', baseScore: 100, level: 1 },
    { id: 2, symbol: 'ETH', name: 'Ethereum', rarity: 5, emoji: 'Ξ', color: '#627EEA', baseScore: 90, level: 1 },
    { id: 3, symbol: 'SOL', name: 'Solana', rarity: 4, emoji: '◎', color: '#9945FF', baseScore: 80, level: 1 },
    { id: 4, symbol: 'DOGE', name: 'Dogecoin', rarity: 3, emoji: '🐕', color: '#C2A633', baseScore: 70, level: 1 },
    { id: 5, symbol: 'SHIB', name: 'Shiba Inu', rarity: 2, emoji: '🐕‍🦺', color: '#FFA409', baseScore: 60, level: 1 }
  ]

  const rarityNames = {
    1: "普通", 2: "稀有", 3: "史诗", 4: "传说", 5: "神话"
  }

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

  // 模拟连接钱包
  const handleConnectWallet = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setIsConnected(true)
      setLoading(false)
      console.log('钱包连接成功')
    }, 1000)
  }, [])

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
        position: 'fixed',
        top: 0,
        left: 0,
        boxSizing: 'border-box',
        overflowY: 'auto'
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
            Web3 加密货币卡牌竞技游戏
          </p>
        </div>

        {/* 控制面板 */}
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '30px'
        }}>
          
          {/* 左侧面板 */}
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '30px',
            borderRadius: '20px',
            height: 'fit-content'
          }}>
            <h3 style={{ color: '#FFD700', marginBottom: '20px' }}>🎮 游戏控制</h3>
            
            <div style={{ marginBottom: '20px', fontSize: '0.9rem' }}>
              <div>钱包状态: {isConnected ? '✅ 已连接' : '❌ 未连接'}</div>
              <div>卡牌数量: {mockCards.length} 张</div>
              <div>已选择: {selectedCards.length}/5</div>
            </div>

            {!isConnected ? (
              <button
                onClick={handleConnectWallet}
                disabled={loading}
                style={{
                  background: loading ? '#666' : 'linear-gradient(45deg, #3498DB, #2980B9)',
                  border: 'none',
                  color: 'white',
                  padding: '15px 20px',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  width: '100%',
                  fontSize: '1rem'
                }}
              >
                {loading ? '连接中...' : '🔗 连接钱包'}
              </button>
            ) : (
              <div style={{
                background: 'rgba(39, 174, 96, 0.2)',
                padding: '15px',
                borderRadius: '10px',
                border: '2px solid #27AE60',
                textAlign: 'center'
              }}>
                <div style={{ color: '#27AE60', fontWeight: 'bold' }}>
                  ✅ 钱包已连接
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                  准备开始游戏！
                </div>
              </div>
            )}

            {selectedCards.length === 5 && (
              <div style={{
                marginTop: '20px',
                background: 'rgba(255, 215, 0, 0.2)',
                padding: '15px',
                borderRadius: '10px',
                border: '2px solid #FFD700',
                textAlign: 'center'
              }}>
                <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
                  🎉 已选择5张卡牌！
                </div>
                <button style={{
                  background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}>
                  🃏 创建手牌
                </button>
              </div>
            )}
          </div>

          {/* 卡牌展示区 */}
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '30px',
            borderRadius: '20px'
          }}>
            <h2 style={{ 
              textAlign: 'center', 
              marginBottom: '30px',
              color: '#FFD700'
            }}>
              🎁 我的卡牌收藏 ({mockCards.length})
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {mockCards.map((card, index) => {
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
                        '0 4px 15px rgba(0,0,0,0.2)'
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
                      fontSize: '3rem',
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
                          {card.baseScore}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between'
                      }}>
                        <span>🔥 等级</span>
                        <span style={{ fontWeight: 'bold', color: '#FF6B6B' }}>
                          {card.level}
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
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('SafeApp 渲染错误:', error)
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

export default SafeApp
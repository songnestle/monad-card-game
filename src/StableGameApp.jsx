/**
 * StableGameApp.jsx - 稳定的游戏应用版本
 * 
 * 解决持久的React错误：
 * 1. 使用经典JSX运行时确保React全局可用
 * 2. 安全的window.ethereum访问
 * 3. 完整的错误边界保护
 * 4. 渐进式初始化
 */

import React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'
import WalletConnector from './components/WalletConnector.jsx'

// 内联样式避免CSS依赖
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    padding: '20px'
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px'
  },
  title: {
    fontSize: '3rem',
    background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '20px'
  },
  card: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '15px',
    padding: '30px',
    marginBottom: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
  },
  button: {
    background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
    border: 'none',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '25px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    margin: '5px',
    boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)'
  },
  errorCard: {
    background: 'rgba(231, 76, 60, 0.2)',
    border: '2px solid rgba(231, 76, 60, 0.5)',
    borderRadius: '15px',
    padding: '20px',
    marginBottom: '20px'
  },
  cryptoCard: {
    background: 'rgba(255,255,255,0.1)',
    border: '2px solid rgba(78, 205, 196, 0.5)',
    borderRadius: '15px',
    padding: '20px',
    margin: '10px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    minWidth: '200px'
  }
}

// 加密货币数据
const CRYPTO_CARDS = [
  { symbol: 'BTC', name: 'Bitcoin', emoji: '₿', color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', emoji: '⟠', color: '#627EEA' },
  { symbol: 'SOL', name: 'Solana', emoji: '◎', color: '#9945FF' },
  { symbol: 'ADA', name: 'Cardano', emoji: '₳', color: '#0033AD' },
  { symbol: 'DOT', name: 'Polkadot', emoji: '●', color: '#E6007A' },
  { symbol: 'MATIC', name: 'Polygon', emoji: '⬟', color: '#8247E5' },
  { symbol: 'AVAX', name: 'Avalanche', emoji: '🔺', color: '#E84142' },
  { symbol: 'LINK', name: 'Chainlink', emoji: '🔗', color: '#375BD2' },
  { symbol: 'UNI', name: 'Uniswap', emoji: '🦄', color: '#FF007A' },
  { symbol: 'ATOM', name: 'Cosmos', emoji: '⚛', color: '#2E3148' }
]

// 安全的错误边界
class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('游戏错误边界捕获错误:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={{ color: '#E74C3C', marginBottom: '20px' }}>🚨 游戏遇到错误</h2>
            <p style={{ marginBottom: '20px' }}>
              游戏组件发生了意外错误，但您的钱包和数据是安全的。
            </p>
            
            <div style={styles.errorCard}>
              <h4>错误详情:</h4>
              <p><strong>消息:</strong> {this.state.error?.message}</p>
              <p><strong>React状态:</strong> {typeof React !== 'undefined' ? '✅ 可用' : '❌ 不可用'}</p>
            </div>

            <button 
              onClick={() => window.location.reload()} 
              style={styles.button}
            >
              🔄 重新加载游戏
            </button>
            
            <button 
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} 
              style={styles.button}
            >
              🛠️ 尝试恢复
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 安全的钱包访问
const safeGetEthereum = () => {
  try {
    if (typeof window === 'undefined') return null
    
    // 安全访问window.ethereum
    const ethereum = window.ethereum
    if (!ethereum) return null
    
    return {
      isAvailable: true,
      isMetaMask: !!ethereum.isMetaMask,
      isNightly: !!ethereum.isNightly,
      isCoinbase: !!ethereum.isCoinbaseWallet,
      provider: ethereum
    }
  } catch (error) {
    console.warn('钱包访问错误:', error)
    return null
  }
}

// 主应用组件
function StableGameApp() {
  const [gameState, setGameState] = useState('initializing')
  const [walletInfo, setWalletInfo] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // 初始化检查
  useEffect(() => {
    const initGame = async () => {
      try {
        console.log('🎮 StableGameApp 初始化开始...')
        
        // 检查React
        if (typeof React === 'undefined') {
          throw new Error('React未正确加载')
        }
        
        // 检查钱包
        await new Promise(resolve => setTimeout(resolve, 500)) // 等待扩展加载
        const wallet = safeGetEthereum()
        setWalletInfo(wallet)
        
        setGameState('ready')
        console.log('✅ StableGameApp 初始化完成')
        
      } catch (err) {
        console.error('❌ 游戏初始化失败:', err)
        setError(err.message)
        setGameState('error')
      }
    }

    initGame()
  }, [])

  // 钱包连接
  const connectWallet = useCallback(async () => {
    if (!walletInfo?.isAvailable) {
      setError('未检测到Web3钱包，请安装MetaMask')
      return
    }

    setIsConnecting(true)
    setError('')

    try {
      const accounts = await walletInfo.provider.request({
        method: 'eth_requestAccounts'
      })

      if (accounts && accounts.length > 0) {
        const account = accounts[0]
        alert(`🎉 钱包连接成功!\n\n账户: ${account.slice(0, 6)}...${account.slice(-4)}\n\n现在您可以开始游戏了！`)
      }
    } catch (err) {
      if (err.code === 4001) {
        setError('您取消了钱包连接')
      } else {
        setError(`连接失败: ${err.message}`)
      }
    } finally {
      setIsConnecting(false)
    }
  }, [walletInfo])

  // 卡牌选择
  const toggleCard = useCallback((cardIndex) => {
    setSelectedCards(prev => {
      if (prev.includes(cardIndex)) {
        return prev.filter(i => i !== cardIndex)
      } else if (prev.length < 5) {
        return [...prev, cardIndex]
      } else {
        setError('最多只能选择5张卡牌')
        return prev
      }
    })
  }, [])

  // 创建手牌
  const createHand = useCallback(() => {
    if (selectedCards.length !== 5) {
      setError('请选择正好5张卡牌')
      return
    }
    
    const selectedCardNames = selectedCards.map(i => CRYPTO_CARDS[i].symbol).join(', ')
    alert(`🃏 手牌创建成功!\n\n您选择的卡牌: ${selectedCardNames}\n\n总分数计算中...`)
    setSelectedCards([])
  }, [selectedCards])

  if (gameState === 'initializing') {
    return (
      <div style={styles.container}>
        <div style={{ textAlign: 'center', paddingTop: '200px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '6px solid rgba(255,255,255,0.3)',
            borderTop: '6px solid #4ECDC4',
            borderRadius: '50%',
            margin: '0 auto 30px',
            animation: 'spin 1s linear infinite'
          }} />
          <h2>🎮 正在初始化游戏...</h2>
          <p>React状态: {typeof React !== 'undefined' ? '✅ 已加载' : '❌ 加载中'}</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (gameState === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={{ color: '#E74C3C' }}>❌ 初始化失败</h2>
          <div style={styles.errorCard}>
            <p><strong>错误:</strong> {error}</p>
            <p><strong>React状态:</strong> {typeof React !== 'undefined' ? '✅ 已加载' : '❌ 未加载'}</p>
            <p><strong>建议:</strong> 刷新页面或检查网络连接</p>
          </div>
          <button onClick={() => window.location.reload()} style={styles.button}>
            🔄 重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <GameErrorBoundary>
      <div style={styles.container}>
        {/* 头部 */}
        <div style={styles.header}>
          <h1 style={styles.title}>🎴 Monad 卡牌世界</h1>
          <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
            Web3 加密货币卡牌竞技游戏
          </p>
        </div>

        {/* 系统状态 */}
        <div style={styles.card}>
          <h3 style={{ color: '#4ECDC4', marginBottom: '20px' }}>📊 系统状态</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div>
              <strong>React:</strong> {typeof React !== 'undefined' ? '✅ 正常' : '❌ 错误'}
            </div>
            <div>
              <strong>钱包:</strong> {walletInfo?.isAvailable ? 
                `✅ ${walletInfo.isMetaMask ? 'MetaMask' : walletInfo.isNightly ? 'Nightly' : 'Unknown'}` : 
                '❌ 未检测到'
              }
            </div>
            <div>
              <strong>已选卡牌:</strong> {selectedCards.length}/5
            </div>
            <div>
              <strong>游戏状态:</strong> ✅ 运行中
            </div>
          </div>
        </div>

        {/* 错误显示 */}
        {error && (
          <div style={styles.errorCard}>
            <h4>⚠️ 注意</h4>
            <p>{error}</p>
            <button onClick={() => setError('')} style={styles.button}>
              ✅ 知道了
            </button>
          </div>
        )}

        {/* 钱包连接 */}
        {walletInfo?.isAvailable && (
          <div style={styles.card}>
            <h3 style={{ color: '#4ECDC4', marginBottom: '20px' }}>🔗 钱包连接</h3>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              style={{
                ...styles.button,
                opacity: isConnecting ? 0.7 : 1,
                fontSize: '1.1rem',
                padding: '15px 30px'
              }}
            >
              {isConnecting ? '🔄 连接中...' : '🔗 连接钱包开始游戏'}
            </button>
          </div>
        )}

        {/* 卡牌选择 */}
        <div style={styles.card}>
          <h3 style={{ color: '#4ECDC4', marginBottom: '20px' }}>
            🎯 选择卡牌 ({selectedCards.length}/5)
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '30px'
          }}>
            {CRYPTO_CARDS.map((card, index) => (
              <div
                key={card.symbol}
                onClick={() => toggleCard(index)}
                style={{
                  ...styles.cryptoCard,
                  borderColor: selectedCards.includes(index) ? '#27AE60' : card.color,
                  transform: selectedCards.includes(index) ? 'scale(1.05)' : 'scale(1)',
                  background: selectedCards.includes(index) ? 
                    'rgba(39, 174, 96, 0.2)' : 'rgba(255,255,255,0.1)'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{card.emoji}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: card.color }}>
                  {card.symbol}
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  {card.name}
                </div>
                <div style={{ 
                  marginTop: '10px', 
                  padding: '5px 10px', 
                  borderRadius: '15px',
                  background: selectedCards.includes(index) ? '#27AE60' : card.color,
                  color: 'white',
                  fontSize: '0.8rem'
                }}>
                  {selectedCards.includes(index) ? '✅ 已选择' : '点击选择'}
                </div>
              </div>
            ))}
          </div>

          {selectedCards.length === 5 && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={createHand} style={{
                ...styles.button,
                background: 'linear-gradient(45deg, #FFD700, #FF8C00)',
                fontSize: '1.2rem',
                padding: '15px 30px'
              }}>
                🃏 创建手牌参与游戏
              </button>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div style={{
          textAlign: 'center',
          padding: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          marginTop: '40px'
        }}>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            Monad Card Game v1.0.3 - Stable Version | 
            React: {typeof React !== 'undefined' ? React.version || 'Loaded' : 'Not Loaded'} | 
            {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </GameErrorBoundary>
  )
}

export default StableGameApp
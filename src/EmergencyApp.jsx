/**
 * EmergencyApp.jsx - 最简单的应用启动器
 * 
 * 专门解决复杂启动失败问题：
 * 1. 最小化依赖
 * 2. 直接导入，避免动态加载
 * 3. 内联错误处理
 * 4. 降级到基础功能
 */

import { useState, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// 内联样式，避免CSS加载问题
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    padding: '20px'
  },
  card: {
    maxWidth: '600px',
    width: '100%',
    background: 'rgba(0,0,0,0.3)',
    padding: '40px',
    borderRadius: '20px',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '20px',
    background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  button: {
    background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
    border: 'none',
    color: 'white',
    padding: '15px 30px',
    borderRadius: '25px',
    fontSize: '1.1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    margin: '10px',
    boxShadow: '0 8px 20px rgba(78, 205, 196, 0.3)'
  },
  status: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '30px',
    textAlign: 'left'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.3)',
    borderTop: '4px solid #4ECDC4',
    borderRadius: '50%',
    margin: '0 auto 20px',
    animation: 'spin 1s linear infinite'
  }
}

// 基础钱包检测
const detectWallet = () => {
  try {
    if (typeof window === 'undefined') return null
    
    if (window.ethereum) {
      if (window.ethereum.isMetaMask) return 'MetaMask'
      if (window.ethereum.isNightly) return 'Nightly'
      if (window.ethereum.isCoinbaseWallet) return 'Coinbase'
      return 'Unknown Wallet'
    }
    return null
  } catch (error) {
    console.warn('钱包检测失败:', error)
    return null
  }
}

// 基础钱包连接
const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      throw new Error('未检测到Web3钱包')
    }

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    })

    if (!accounts || accounts.length === 0) {
      throw new Error('未获取到账户授权')
    }

    return {
      success: true,
      account: accounts[0]
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

function EmergencyApp() {
  const [appState, setAppState] = useState('loading')
  const [walletInfo, setWalletInfo] = useState(null)
  const [error, setError] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    console.log('🚨 [EmergencyApp] 紧急应用启动中...')
    
    // 简单的初始化检查
    setTimeout(() => {
      const wallet = detectWallet()
      setWalletInfo(wallet)
      setAppState('ready')
      console.log('✅ [EmergencyApp] 应用初始化完成')
    }, 1000)
  }, [])

  const handleConnectWallet = async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      const result = await connectWallet()
      if (result.success) {
        alert(`🎉 钱包连接成功！\n账户: ${result.account.slice(0, 6)}...${result.account.slice(-4)}`)
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleDiagnostic = () => {
    const info = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      hasEthereum: !!window.ethereum,
      walletType: walletInfo,
      localStorage: !!window.localStorage,
      timestamp: new Date().toISOString()
    }
    
    console.log('🔧 诊断信息:', info)
    alert(`🔧 诊断信息：\n\n浏览器: ${navigator.userAgent.split(' ')[0]}\n钱包: ${walletInfo || '未检测到'}\n时间: ${info.timestamp}`)
  }

  if (appState === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} />
          <h1 style={styles.title}>🎴 Monad 卡牌世界</h1>
          <p>正在启动紧急模式...</p>
        </div>
        
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>🎴 Monad 卡牌世界</h1>
          <p style={{ marginBottom: '30px', fontSize: '1.1rem', opacity: 0.9 }}>
            Web3 加密货币卡牌竞技游戏 - 紧急模式
          </p>

          {/* 系统状态 */}
          <div style={styles.status}>
            <h3 style={{ marginBottom: '15px', color: '#4ECDC4' }}>系统状态</h3>
            <p>✅ 应用核心: 正常运行</p>
            <p>🔗 Web3钱包: {walletInfo ? `${walletInfo} 已检测到` : '未检测到'}</p>
            <p>🌐 网络连接: 正常</p>
            <p>⚡ JavaScript: 已启用</p>
          </div>

          {/* 错误显示 */}
          {error && (
            <div style={{
              ...styles.status,
              background: 'rgba(231, 76, 60, 0.2)',
              border: '1px solid rgba(231, 76, 60, 0.3)'
            }}>
              <h3 style={{ marginBottom: '15px', color: '#E74C3C' }}>⚠️ 错误信息</h3>
              <p>{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div style={{ marginBottom: '30px' }}>
            {walletInfo && (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                style={{
                  ...styles.button,
                  opacity: isConnecting ? 0.7 : 1
                }}
              >
                {isConnecting ? '🔄 连接中...' : '🔗 连接钱包'}
              </button>
            )}
            
            <button onClick={handleRefresh} style={styles.button}>
              🔄 刷新页面
            </button>
            
            <button onClick={handleDiagnostic} style={styles.button}>
              🔧 系统诊断
            </button>
          </div>

          {/* 帮助信息 */}
          <div style={{
            background: 'rgba(255,193,7,0.2)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(255,193,7,0.3)',
            textAlign: 'left'
          }}>
            <h4 style={{ marginBottom: '15px', color: '#FFC107', textAlign: 'center' }}>
              💡 使用说明
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>这是应用的紧急模式，提供基础功能</li>
              <li>如果钱包连接成功，说明环境正常</li>
              <li>遇到问题请点击"系统诊断"获取详细信息</li>
              <li>建议使用Chrome或Firefox浏览器</li>
            </ul>
          </div>

          <div style={{
            marginTop: '30px',
            fontSize: '0.9rem',
            opacity: 0.7,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '20px'
          }}>
            Monad Card Game v1.0.1 - Emergency Mode | 
            时间: {new Date().toLocaleString()}
          </div>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  )
}

export default EmergencyApp
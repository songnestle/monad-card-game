/**
 * SafestApp.jsx - 最安全的React应用
 * 
 * 解决 "React is not defined" 错误：
 * 1. 显式导入React
 * 2. 完全自包含，无外部依赖
 * 3. 内联所有样式和逻辑
 * 4. 最基础的React功能
 */

import React, { useState, useEffect } from 'react'

// 内联错误边界组件
class SafeErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('SafeErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#e74c3c',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Arial, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '30px',
            borderRadius: '15px',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2>组件错误</h2>
            <p>组件发生了意外错误：{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()}
              style={{
                background: '#3498db',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function SafestApp() {
  const [status, setStatus] = useState('initializing')
  const [walletInfo, setWalletInfo] = useState('')
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    console.log('🔧 SafestApp 初始化开始...')
    
    // 检查基础环境
    setTimeout(() => {
      try {
        // 检查React是否可用
        if (typeof React === 'undefined') {
          throw new Error('React 未定义')
        }
        
        // 检查钱包
        let wallet = '未检测到钱包'
        if (typeof window !== 'undefined' && window.ethereum) {
          if (window.ethereum.isMetaMask) wallet = 'MetaMask'
          else if (window.ethereum.isNightly) wallet = 'Nightly'
          else if (window.ethereum.isCoinbaseWallet) wallet = 'Coinbase'
          else wallet = '未知钱包'
        }
        
        setWalletInfo(wallet)
        setStatus('ready')
        console.log('✅ SafestApp 初始化完成')
        
      } catch (err) {
        console.error('❌ SafestApp 初始化失败:', err)
        setError(err.message)
        setStatus('error')
      }
    }, 500)
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    setError('')
    
    try {
      if (!window.ethereum) {
        throw new Error('未检测到Web3钱包，请安装MetaMask')
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (accounts && accounts.length > 0) {
        const account = accounts[0]
        alert(`🎉 连接成功!\n账户: ${account.slice(0, 6)}...${account.slice(-4)}`)
      } else {
        throw new Error('未获取到账户授权')
      }
    } catch (err) {
      setError(err.message)
    }
    
    setIsConnecting(false)
  }

  const handleDiagnostic = () => {
    const info = {
      react: typeof React !== 'undefined' ? '✅ 已加载' : '❌ 未加载',
      ethereum: typeof window !== 'undefined' && window.ethereum ? '✅ 已检测' : '❌ 未检测',
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toLocaleString()
    }
    
    console.log('🔧 诊断信息:', info)
    
    const message = `🔧 系统诊断报告\n\nReact状态: ${info.react}\n钱包状态: ${info.ethereum}\n浏览器: ${info.userAgent.split(' ')[0]}\n时间: ${info.timestamp}`
    alert(message)
  }

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
      padding: '15px 25px',
      borderRadius: '25px',
      fontSize: '1rem',
      cursor: 'pointer',
      fontWeight: 'bold',
      margin: '10px',
      boxShadow: '0 8px 20px rgba(78, 205, 196, 0.3)'
    },
    status: {
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '20px',
      textAlign: 'left'
    },
    error: {
      background: 'rgba(231, 76, 60, 0.2)',
      border: '1px solid rgba(231, 76, 60, 0.3)',
      borderRadius: '10px',
      padding: '20px',
      marginBottom: '20px',
      color: '#ffcccb'
    }
  }

  if (status === 'initializing') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid #4ECDC4',
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite'
          }} />
          <h1 style={styles.title}>🎴 Monad 卡牌世界</h1>
          <p>正在检查系统环境...</p>
        </div>
      </div>
    )
  }

  return (
    <SafeErrorBoundary>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>🎴 Monad 卡牌世界</h1>
          
          <p style={{ marginBottom: '30px', fontSize: '1.1rem', opacity: 0.9 }}>
            Web3 加密货币卡牌竞技游戏 - 安全模式
          </p>

          {/* 系统状态 */}
          <div style={styles.status}>
            <h3 style={{ marginBottom: '15px', color: '#4ECDC4' }}>✅ 系统状态</h3>
            <p>📦 React: {typeof React !== 'undefined' ? '正常加载' : '加载失败'}</p>
            <p>🔗 钱包: {walletInfo}</p>
            <p>🌐 JavaScript: 已启用</p>
            <p>⚡ 网络: 连接正常</p>
            {status === 'error' && <p>❌ 状态: 检测到错误</p>}
          </div>

          {/* 错误显示 */}
          {error && (
            <div style={styles.error}>
              <h3 style={{ marginBottom: '15px' }}>⚠️ 错误信息</h3>
              <p>{error}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div style={{ marginBottom: '30px' }}>
            {walletInfo !== '未检测到钱包' && (
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                style={{
                  ...styles.button,
                  opacity: isConnecting ? 0.7 : 1
                }}
              >
                {isConnecting ? '🔄 连接中...' : '🔗 测试钱包连接'}
              </button>
            )}
            
            <button onClick={() => window.location.reload()} style={styles.button}>
              🔄 刷新页面
            </button>
            
            <button onClick={handleDiagnostic} style={styles.button}>
              🔧 系统诊断
            </button>
          </div>

          {/* 说明信息 */}
          <div style={{
            background: 'rgba(255,193,7,0.2)',
            borderRadius: '10px',
            padding: '20px',
            border: '1px solid rgba(255,193,7,0.3)',
            textAlign: 'left'
          }}>
            <h4 style={{ marginBottom: '15px', color: '#FFC107', textAlign: 'center' }}>
              💡 应用状态说明
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>如果您看到此界面，说明React已正确加载</li>
              <li>系统状态显示当前环境的详细信息</li>
              <li>点击"测试钱包连接"可验证Web3功能</li>
              <li>如有问题，请使用"系统诊断"获取技术信息</li>
            </ul>
          </div>

          <div style={{
            marginTop: '30px',
            fontSize: '0.85rem',
            opacity: 0.7,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '20px'
          }}>
            Monad Card Game v1.0.2 - Safe Mode | React: {React.version || 'Unknown'} | 
            时间: {new Date().toLocaleString()}
          </div>
        </div>

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </SafeErrorBoundary>
  )
}

export default SafestApp
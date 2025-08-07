/**
 * CriticalApp.jsx - 危机响应应用启动器
 * 
 * 专门解决用户报告的严重问题：
 * 1. SyntaxError: Unexpected token '<' 
 * 2. 空白页面崩溃
 * 3. 钱包连接冲突
 * 4. 缺乏错误反馈
 */

import { useState, useEffect, useCallback } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// 全局错误捕获
window.addEventListener('error', (event) => {
  if (event.filename && event.filename.includes('chrome-extension://')) {
    event.preventDefault()
    return true
  }
  
  console.error('🚨 Critical Error Caught:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  })
})

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('MetaMask') || 
      event.reason?.message?.includes('ethereum')) {
    console.warn('⚠️  Wallet Promise Rejection (Handled):', event.reason.message)
    event.preventDefault()
    return
  }
  
  console.error('🚨 Unhandled Promise Rejection:', event.reason)
})

// 诊断工具
const DiagnosticInfo = ({ onClose }) => (
  <div style={{
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(0,0,0,0.95)',
    color: 'white',
    padding: '30px',
    borderRadius: '15px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    overflow: 'auto',
    zIndex: 10000,
    fontFamily: 'monospace',
    fontSize: '14px',
    border: '2px solid #ff6b6b'
  }}>
    <h3 style={{ color: '#ff6b6b', marginBottom: '20px' }}>🔧 系统诊断报告</h3>
    
    <div style={{ marginBottom: '15px' }}>
      <strong style={{ color: '#4ecdc4' }}>浏览器信息:</strong><br />
      用户代理: {navigator.userAgent}<br />
      语言: {navigator.language}<br />
      在线状态: {navigator.onLine ? '✅ 在线' : '❌ 离线'}
    </div>
    
    <div style={{ marginBottom: '15px' }}>
      <strong style={{ color: '#4ecdc4' }}>页面信息:</strong><br />
      URL: {window.location.href}<br />
      协议: {window.location.protocol}<br />
      主机: {window.location.host}
    </div>
    
    <div style={{ marginBottom: '15px' }}>
      <strong style={{ color: '#4ecdc4' }}>Web3环境:</strong><br />
      window.ethereum: {window.ethereum ? '✅ 可用' : '❌ 不可用'}<br />
      {window.ethereum && (
        <>
          MetaMask: {window.ethereum.isMetaMask ? '✅' : '❌'}<br />
          Nightly: {window.ethereum.isNightly ? '✅' : '❌'}<br />
          Coinbase: {window.ethereum.isCoinbaseWallet ? '✅' : '❌'}<br />
          多提供者: {window.ethereum.providers?.length || 0} 个
        </>
      )}
    </div>
    
    <div style={{ marginBottom: '15px' }}>
      <strong style={{ color: '#4ecdc4' }}>本地存储:</strong><br />
      localStorage: {window.localStorage ? '✅ 可用' : '❌ 不可用'}<br />
      sessionStorage: {window.sessionStorage ? '✅ 可用' : '❌ 不可用'}<br />
      indexedDB: {window.indexedDB ? '✅ 可用' : '❌ 不可用'}
    </div>
    
    <button
      onClick={onClose}
      style={{
        background: '#ff6b6b',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '20px'
      }}
    >
      关闭诊断
    </button>
  </div>
)

// 钱包选择器
const WalletSelector = ({ onSelect, onCancel }) => {
  const [wallets, setWallets] = useState([])
  
  useEffect(() => {
    const detectedWallets = []
    
    if (window.ethereum) {
      if (window.ethereum.providers) {
        window.ethereum.providers.forEach((provider, index) => {
          const walletInfo = {
            id: `provider_${index}`,
            name: provider.isMetaMask ? 'MetaMask' : 
                  provider.isNightly ? 'Nightly Wallet' :
                  provider.isCoinbaseWallet ? 'Coinbase Wallet' : '未知钱包',
            provider: provider,
            isPreferred: provider.isMetaMask && !provider.isNightly
          }
          detectedWallets.push(walletInfo)
        })
      } else {
        const walletInfo = {
          id: 'single_provider',
          name: window.ethereum.isMetaMask ? 'MetaMask' : 
                window.ethereum.isNightly ? 'Nightly Wallet' :
                window.ethereum.isCoinbaseWallet ? 'Coinbase Wallet' : '默认钱包',
          provider: window.ethereum,
          isPreferred: window.ethereum.isMetaMask && !window.ethereum.isNightly
        }
        detectedWallets.push(walletInfo)
      }
    }
    
    // 按优先级排序
    detectedWallets.sort((a, b) => (b.isPreferred ? 1 : 0) - (a.isPreferred ? 1 : 0))
    setWallets(detectedWallets)
  }, [])
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        borderRadius: '15px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%'
      }}>
        <h2 style={{ marginBottom: '20px', textAlign: 'center', color: '#333' }}>
          🔗 选择钱包
        </h2>
        
        <p style={{ color: '#666', textAlign: 'center', marginBottom: '25px' }}>
          检测到多个钱包，请选择您要使用的钱包：
        </p>
        
        {wallets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            未检测到任何钱包<br />
            请安装 MetaMask 或其他 Web3 钱包
          </div>
        ) : (
          wallets.map(wallet => (
            <button
              key={wallet.id}
              onClick={() => onSelect(wallet)}
              style={{
                width: '100%',
                padding: '15px',
                marginBottom: '10px',
                border: wallet.isPreferred ? '2px solid #4ecdc4' : '1px solid #ddd',
                borderRadius: '8px',
                background: wallet.isPreferred ? '#f0fffb' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <span style={{ fontWeight: 'bold', color: '#333' }}>
                {wallet.name}
              </span>
              {wallet.isPreferred && (
                <span style={{
                  background: '#4ecdc4',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}>
                  推荐
                </span>
              )}
            </button>
          ))
        )}
        
        <button
          onClick={onCancel}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '15px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            background: 'white',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          取消
        </button>
      </div>
    </div>
  )
}

function CriticalApp() {
  const [appState, setAppState] = useState('initializing')
  const [error, setError] = useState(null)
  const [MainApp, setMainApp] = useState(null)
  const [showDiagnostic, setShowDiagnostic] = useState(false)
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState(null)
  const [retryCount, setRetryCount] = useState(0)

  // 安全加载主应用
  const loadMainApp = useCallback(async () => {
    try {
      console.log('🚀 [CriticalApp] 开始安全加载主应用...')
      setAppState('loading')
      setError(null)
      
      // 延迟确保DOM完全就绪
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 动态导入主应用
      console.log('📦 [CriticalApp] 动态导入 BullrunApp...')
      const { default: BullrunApp } = await import('./BullrunApp.jsx')
      
      console.log('✅ [CriticalApp] 主应用导入成功!')
      setMainApp(() => BullrunApp)
      setAppState('loaded')
      
    } catch (err) {
      console.error('❌ [CriticalApp] 主应用加载失败:', err)
      setError({
        type: 'CRITICAL_LOAD_ERROR',
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
        retry: retryCount
      })
      setAppState('error')
    }
  }, [retryCount])

  // 处理重试
  const handleRetry = useCallback(() => {
    console.log(`🔄 [CriticalApp] 开始第 ${retryCount + 1} 次重试...`)
    setRetryCount(prev => prev + 1)
    loadMainApp()
  }, [loadMainApp, retryCount])

  // 处理钱包选择
  const handleWalletSelect = useCallback((wallet) => {
    console.log('🔗 [CriticalApp] 用户选择钱包:', wallet.name)
    setSelectedWallet(wallet)
    setShowWalletSelector(false)
    
    // 将选择的钱包设置为优先提供者
    if (wallet.provider) {
      window.__preferred_ethereum = wallet.provider
    }
    
    loadMainApp()
  }, [loadMainApp])

  // 组件初始化
  useEffect(() => {
    console.log('🎬 [CriticalApp] 组件初始化开始...')
    
    // 检查是否有多个钱包
    const hasMultipleWallets = window.ethereum?.providers?.length > 1
    
    if (hasMultipleWallets) {
      console.log('🔀 [CriticalApp] 检测到多个钱包，显示选择器')
      setShowWalletSelector(true)
      setAppState('wallet_selection')
    } else {
      console.log('🚀 [CriticalApp] 单钱包或无钱包，直接加载应用')
      loadMainApp()
    }
  }, [loadMainApp])

  // 钱包选择状态
  if (showWalletSelector) {
    return (
      <WalletSelector 
        onSelect={handleWalletSelect}
        onCancel={() => {
          setShowWalletSelector(false)
          loadMainApp()
        }}
      />
    )
  }

  // 诊断模式
  if (showDiagnostic) {
    return <DiagnosticInfo onClose={() => setShowDiagnostic(false)} />
  }

  // 加载状态
  if (appState === 'initializing' || appState === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '6px solid rgba(255,255,255,0.3)',
            borderTop: '6px solid #fff',
            borderRadius: '50%',
            margin: '0 auto 25px',
            animation: 'spin 1s linear infinite'
          }} />
          
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '15px',
            background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎴 Monad 卡牌世界
          </h1>
          
          <p style={{ opacity: 0.9, marginBottom: '10px', fontSize: '1.1rem' }}>
            {appState === 'initializing' ? '正在初始化安全环境...' : 
             `正在加载游戏... ${retryCount > 0 ? `(重试 ${retryCount}/3)` : ''}`}
          </p>
          
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            Web3 加密货币卡牌竞技游戏
          </p>
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

  // 错误状态
  if (appState === 'error' && error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '800px',
          width: '100%',
          background: 'rgba(0,0,0,0.4)',
          padding: '40px',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '20px' }}>💥</div>
          
          <h1 style={{
            fontSize: '3rem',
            marginBottom: '25px',
            background: 'linear-gradient(45deg, #fff, #ffcccb)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            应用启动失败
          </h1>
          
          <p style={{
            fontSize: '1.2rem',
            marginBottom: '30px',
            opacity: 0.9,
            lineHeight: '1.6'
          }}>
            很抱歉，应用在启动时遇到了问题。<br />
            这通常是由于网络连接、浏览器兼容性或钱包冲突引起的。
          </p>

          {/* 错误详情 */}
          <details style={{
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '30px',
            textAlign: 'left'
          }}>
            <summary style={{
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#ffcccb',
              marginBottom: '15px'
            }}>
              🔍 查看技术详情
            </summary>
            
            <div style={{ fontSize: '0.9rem', fontFamily: 'monospace' }}>
              <p><strong>错误类型:</strong> {error.type}</p>
              <p><strong>错误消息:</strong> {error.message}</p>
              <p><strong>发生时间:</strong> {new Date(error.timestamp).toLocaleString()}</p>
              <p><strong>重试次数:</strong> {error.retry}/3</p>
              {error.stack && (
                <div>
                  <strong>调用栈:</strong>
                  <pre style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: '10px',
                    borderRadius: '5px',
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    maxHeight: '200px',
                    marginTop: '5px'
                  }}>
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>

          {/* 操作按钮 */}
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            justifyContent: 'center', 
            flexWrap: 'wrap',
            marginBottom: '30px'
          }}>
            {retryCount < 3 && (
              <button
                onClick={handleRetry}
                style={{
                  background: 'linear-gradient(45deg, #27AE60, #2ECC71)',
                  border: 'none',
                  color: 'white',
                  padding: '15px 25px',
                  borderRadius: '25px',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 8px 20px rgba(39, 174, 96, 0.3)'
                }}
              >
                🔄 重试启动 ({3 - retryCount} 次剩余)
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(45deg, #3498DB, #2980B9)',
                border: 'none',
                color: 'white',
                padding: '15px 25px',
                borderRadius: '25px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 8px 20px rgba(52, 152, 219, 0.3)'
              }}
            >
              🔄 刷新页面
            </button>
            
            <button
              onClick={() => setShowDiagnostic(true)}
              style={{
                background: 'linear-gradient(45deg, #9B59B6, #8E44AD)',
                border: 'none',
                color: 'white',
                padding: '15px 25px',
                borderRadius: '25px',
                fontSize: '1.1rem',
                cursor: 'pointer',
                fontWeight: 'bold',
                boxShadow: '0 8px 20px rgba(155, 89, 182, 0.3)'
              }}
            >
              🔧 系统诊断
            </button>
          </div>

          {/* 解决建议 */}
          <div style={{
            background: 'rgba(255,193,7,0.2)',
            borderRadius: '15px',
            padding: '25px',
            textAlign: 'left',
            border: '1px solid rgba(255,193,7,0.3)'
          }}>
            <h4 style={{ 
              marginBottom: '20px', 
              color: '#FFC107',
              textAlign: 'center',
              fontSize: '1.3rem'
            }}>
              💡 故障排除建议
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '15px'
            }}>
              <div>
                <strong style={{ color: '#fff' }}>网络问题:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>检查网络连接</li>
                  <li>尝试使用VPN</li>
                  <li>刷新DNS缓存</li>
                </ul>
              </div>
              
              <div>
                <strong style={{ color: '#fff' }}>浏览器问题:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>清除缓存和Cookie</li>
                  <li>禁用广告拦截器</li>
                  <li>尝试隐身模式</li>
                </ul>
              </div>
              
              <div>
                <strong style={{ color: '#fff' }}>钱包问题:</strong>
                <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                  <li>更新钱包扩展</li>
                  <li>重启浏览器</li>
                  <li>禁用其他钱包扩展</li>
                </ul>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '30px',
            fontSize: '0.9rem',
            opacity: 0.7,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '20px'
          }}>
            错误ID: {error.timestamp.split('T')[0]} | Monad Card Game v1.0.1 | 
            技术支持: <a href="mailto:support@monad-card-game.com" style={{ color: '#4ecdc4' }}>
              support@monad-card-game.com
            </a>
          </div>
        </div>
      </div>
    )
  }

  // 成功加载主应用
  if (appState === 'loaded' && MainApp) {
    console.log('✅ [CriticalApp] 渲染主应用组件')
    return (
      <ErrorBoundary development={import.meta.env.DEV}>
        <MainApp />
      </ErrorBoundary>
    )
  }

  // 兜底状态（理论上不应该到达）
  return (
    <div style={{
      minHeight: '100vh',
      background: '#333',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🤔</div>
        <h2>未知状态</h2>
        <p>应用处于未知状态，请刷新页面</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          刷新页面
        </button>
      </div>
    </div>
  )
}

export default CriticalApp
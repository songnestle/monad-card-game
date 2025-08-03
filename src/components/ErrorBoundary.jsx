/**
 * ErrorBoundary.jsx - React错误边界组件
 * 捕获和处理应用中的JavaScript错误，防止整个应用崩溃
 */

import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error) {
    // 更新 state 使下一次渲染显示降级后的 UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // 这里可以将错误日志上报给日志服务
    this.reportError(error, errorInfo)
  }

  reportError = (error, errorInfo) => {
    // 安全的错误报告，不包含敏感信息
    const errorReport = {
      message: error.message,
      stack: error.stack?.slice(0, 1000), // 限制堆栈长度
      componentStack: errorInfo.componentStack?.slice(0, 1000),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // 这里可以发送到错误追踪服务
    console.warn('Error Report:', errorReport)
  }

  handleRetry = () => {
    if (this.state.retryCount < 3) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    } else {
      // 超过重试次数，刷新页面
      window.location.reload()
    }
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state

      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.3)',
            padding: '40px',
            borderRadius: '20px',
            border: '2px solid #ff4757'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>😵</div>
            
            <h1 style={{ 
              color: '#ff4757',
              marginBottom: '20px',
              fontSize: '2rem'
            }}>
              糟糕！出现了意外错误
            </h1>
            
            <p style={{ 
              color: '#bbb',
              marginBottom: '30px',
              fontSize: '1.1rem',
              lineHeight: '1.6'
            }}>
              应用遇到了一个问题，但不用担心，您的钱包和资金是安全的。
              <br />
              请尝试刷新页面或联系技术支持。
            </p>

            {this.props.development && (
              <details style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  开发者信息 (点击查看)
                </summary>
                <pre style={{
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  maxHeight: '200px',
                  marginTop: '10px',
                  padding: '10px',
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '5px'
                }}>
                  {error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {retryCount < 3 ? (
                <button
                  onClick={this.handleRetry}
                  style={{
                    background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                    border: 'none',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '25px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 重试 ({3 - retryCount} 次剩余)
                </button>
              ) : (
                <button
                  onClick={this.handleRefresh}
                  style={{
                    background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                    border: 'none',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '25px',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  🔄 刷新页面
                </button>
              )}
              
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  background: 'linear-gradient(45deg, #6c757d, #495057)',
                  border: 'none',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                🏠 返回首页
              </button>
            </div>

            <div style={{
              marginTop: '30px',
              padding: '15px',
              background: 'rgba(255,193,7,0.2)',
              borderRadius: '10px',
              fontSize: '0.9rem'
            }}>
              <strong>💡 提示：</strong>
              <br />
              • 确保钱包仍连接到 Monad 测试网
              <br />
              • 检查网络连接是否稳定
              <br />
              • 如果问题持续，请联系技术支持
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
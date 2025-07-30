import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })

    // 在开发环境下记录错误
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
          color: 'white',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '600px',
            background: 'rgba(255,255,255,0.1)',
            padding: '40px',
            borderRadius: '20px',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>💥</div>
            <h1 style={{ fontSize: '2rem', marginBottom: '20px', color: '#FF6B6B' }}>
              哎呀！出现了错误
            </h1>
            <p style={{ fontSize: '1.1rem', marginBottom: '30px', opacity: 0.9 }}>
              应用遇到了一个意外错误，我们正在努力修复中...
            </p>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '20px'
              }}
            >
              🔄 刷新页面
            </button>

            {import.meta.env.DEV && this.state.error && (
              <details style={{ 
                marginTop: '20px', 
                textAlign: 'left',
                background: 'rgba(0,0,0,0.3)',
                padding: '15px',
                borderRadius: '10px',
                fontSize: '0.8rem'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                  错误详情 (开发模式)
                </summary>
                <pre style={{ 
                  marginTop: '10px', 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
import { useState } from 'react'

function MinimalApp() {
  const [message, setMessage] = useState('🎴 Monad Card Game - 加载成功!')

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      background: 'linear-gradient(135deg, #1e3c72, #2a5298)',
      minHeight: '100vh',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>
        {message}
      </h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
        如果您看到这个消息，说明JavaScript加载成功！
      </p>
      <button 
        onClick={() => setMessage('✅ React 状态更新正常!')}
        style={{
          background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
          border: 'none',
          color: 'white',
          padding: '15px 30px',
          fontSize: '1.1rem',
          borderRadius: '25px',
          cursor: 'pointer'
        }}
      >
        🔧 测试React功能
      </button>
      
      <div style={{ marginTop: '40px', opacity: 0.8 }}>
        <p>构建时间: {new Date().toLocaleString()}</p>
        <p>如果此页面正常显示，说明MIME类型问题已解决</p>
      </div>
    </div>
  )
}

export default MinimalApp
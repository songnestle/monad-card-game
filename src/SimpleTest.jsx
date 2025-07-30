import { useState } from 'react'

function SimpleTest() {
  const [count, setCount] = useState(0)

  return (
    <div style={{
      background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
      minHeight: '100vh',
      width: '100vw',
      margin: 0,
      padding: '40px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '30px' }}>
        🎴 Monad 卡牌测试
      </h1>
      
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '20px',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2>应用正常运行！</h2>
        <p>点击次数: {count}</p>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
            border: 'none',
            color: 'white',
            padding: '15px 30px',
            borderRadius: '10px',
            fontSize: '16px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          点击测试 (+1)
        </button>
        
        <div style={{ marginTop: '30px', fontSize: '14px', opacity: 0.8 }}>
          <p>✅ React 正常工作</p>
          <p>✅ 状态管理正常</p>
          <p>✅ 样式渲染正常</p>
          <p>✅ 事件处理正常</p>
        </div>
      </div>
      
      <div style={{ marginTop: '30px', fontSize: '12px', opacity: 0.6 }}>
        如果你能看到这个页面，说明基础功能正常。
        <br />
        服务器: http://localhost:9999
      </div>
    </div>
  )
}

export default SimpleTest
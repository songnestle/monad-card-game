import { useState } from 'react'

function TestApp() {
  const [message, setMessage] = useState('🎴 Monad Card Game 测试页面加载成功！')

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 3s ease infinite',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      margin: 0,
      padding: 0
    }}>
      <style>
        {`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; }
          #root { width: 100%; height: 100%; }
        `}
      </style>
      
      <div style={{ fontSize: '4rem', marginBottom: '30px' }}>
        🎴
      </div>
      
      <h1 style={{
        fontSize: '3rem',
        background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        {message}
      </h1>
      
      <div style={{ 
        background: 'rgba(255,255,255,0.1)',
        padding: '30px',
        borderRadius: '20px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '20px'
      }}>
        <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>✅ 部署状态检查</h3>
        <p style={{ marginBottom: '10px' }}>✅ React 组件正常</p>
        <p style={{ marginBottom: '10px' }}>✅ CSS 样式正常</p>
        <p style={{ marginBottom: '10px' }}>✅ 动画效果正常</p>
        <p style={{ marginBottom: '20px' }}>✅ Vercel 部署成功</p>
        
        <button
          onClick={() => setMessage('🎮 准备加载完整游戏...')}
          style={{
            background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
            border: 'none',
            color: 'white',
            padding: '15px 30px',
            fontSize: '1.2rem',
            borderRadius: '25px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)'
          }}
        >
          🚀 测试交互功能
        </button>
      </div>
      
      <div style={{ 
        position: 'absolute',
        bottom: '20px',
        fontSize: '0.9rem',
        opacity: 0.7,
        textAlign: 'center'
      }}>
        Environment: {import.meta.env.MODE || 'production'}<br/>
        RPC: {import.meta.env.VITE_RPC_URL ? '✅ 已配置' : '❌ 未配置'}<br/>
        Contract: {import.meta.env.VITE_CONTRACT_ADDRESS ? '✅ 已配置' : '❌ 未配置'}
      </div>
    </div>
  )
}

export default TestApp
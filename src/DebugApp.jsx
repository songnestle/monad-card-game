import { useState } from 'react'

function DebugApp() {
  console.log('DebugApp 组件开始渲染')
  
  const [step, setStep] = useState(1)
  
  try {
    console.log('DebugApp 渲染步骤:', step)
    
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
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '30px' }}>
          🎴 Monad 卡牌调试版本
        </h1>
        
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '30px',
          borderRadius: '20px',
          textAlign: 'center'
        }}>
          <p>当前步骤: {step}</p>
          <button
            onClick={() => setStep(step + 1)}
            style={{
              background: '#4ECDC4',
              border: 'none',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            下一步 ({step + 1})
          </button>
          
          <div style={{ marginTop: '20px', fontSize: '14px' }}>
            {step >= 1 && <div>✅ 组件基础渲染正常</div>}
            {step >= 2 && <div>✅ 状态管理正常</div>}
            {step >= 3 && <div>✅ 事件处理正常</div>}
            {step >= 4 && <div>✅ 样式应用正常</div>}
            {step >= 5 && <div>✅ 所有功能测试完成！</div>}
          </div>
          
          {step >= 5 && (
            <div style={{ marginTop: '30px' }}>
              <button
                onClick={() => {
                  console.log('准备加载完整应用')
                  alert('调试完成！准备切换到完整应用')
                }}
                style={{
                  background: '#FF6B6B',
                  border: 'none',
                  color: 'white',
                  padding: '15px 30px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                🚀 加载完整应用
              </button>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    console.error('DebugApp 渲染错误:', error)
    return (
      <div style={{ 
        color: 'red', 
        padding: '20px', 
        background: 'white',
        minHeight: '100vh'
      }}>
        <h1>调试错误</h1>
        <p>错误信息: {error.message}</p>
        <p>错误堆栈: {error.stack}</p>
      </div>
    )
  }
}

export default DebugApp
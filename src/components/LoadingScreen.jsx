import { memo, useState, useEffect } from 'react'

// 加载步骤配置
const LOADING_STEPS = [
  { 
    key: 'init', 
    icon: '🔧', 
    title: '系统检查',
    subtitle: '验证运行环境...',
    progress: 15,
    duration: 500
  },
  { 
    key: 'environment', 
    icon: '🌐', 
    title: '环境初始化',
    subtitle: '连接区块链网络...',
    progress: 35,
    duration: 400
  },
  { 
    key: 'wallet', 
    icon: '🔗', 
    title: '钱包检测',
    subtitle: '寻找MetaMask连接...',
    progress: 60,
    duration: 300
  },
  { 
    key: 'contract', 
    icon: '📜', 
    title: '合约连接',
    subtitle: '加载智能合约...',
    progress: 85,
    duration: 200
  },
  { 
    key: 'ready', 
    icon: '✨', 
    title: '准备完成',
    subtitle: '进入魔法世界...',
    progress: 100,
    duration: 300
  }
]

// 炫酷提示语
const LOADING_TIPS = [
  '💎 在Monad网络上，每一张卡牌都是独一无二的NFT',
  '🚀 基于真实市场数据的价格波动机制',
  '⚡ 超低gas费用，极速交易确认',
  '🎯 5个稀有度等级，神话卡牌万里挑一',
  '🏆 24小时竞赛制，实时排行榜',
  '💰 丰厚奖池等你瓜分',
  '🎨 精美的卡牌设计与动画效果'
]

const LoadingScreen = memo(({ 
  currentStep = 'init', 
  status = '启动中...',
  onComplete
}) => {
  const [displayStep, setDisplayStep] = useState(0)
  const [currentTip, setCurrentTip] = useState(0)
  const [particles, setParticles] = useState([])
  
  // 找到当前步骤索引
  const currentStepIndex = LOADING_STEPS.findIndex(step => step.key === currentStep)
  const stepInfo = LOADING_STEPS[Math.max(0, currentStepIndex)] || LOADING_STEPS[0]

  // 创建粒子效果
  useEffect(() => {
    const createParticles = () => {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 1,
        speed: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.2
      }))
      setParticles(newParticles)
    }

    createParticles()
    const interval = setInterval(createParticles, 8000)
    return () => clearInterval(interval)
  }, [])

  // 步骤动画
  useEffect(() => {
    if (currentStepIndex >= 0) {
      const timer = setTimeout(() => {
        setDisplayStep(currentStepIndex)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [currentStepIndex])

  // 提示语轮播
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % LOADING_TIPS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // 完成回调
  useEffect(() => {
    if (currentStep === 'ready' && onComplete) {
      const timer = setTimeout(onComplete, 1000)
      return () => clearTimeout(timer)
    }
  }, [currentStep, onComplete])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden',
      zIndex: 9999
    }}>
      {/* 背景粒子 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        opacity: 0.3
      }}>
        {particles.map(particle => (
          <div
            key={particle.id}
            style={{
              position: 'absolute',
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: '#FFD700',
              borderRadius: '50%',
              opacity: particle.opacity,
              animation: `float ${particle.speed + 3}s infinite linear`,
              boxShadow: '0 0 6px #FFD700'
            }}
          />
        ))}
      </div>

      {/* 主内容容器 */}
      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
        padding: '40px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '25px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Logo区域 */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ 
            fontSize: '5rem', 
            marginBottom: '15px',
            background: 'linear-gradient(45deg, #FFD700, #FF6B6B, #4ECDC4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'glow 2s ease-in-out infinite alternate'
          }}>
            {stepInfo.icon}
          </div>
          
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '10px',
            background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            Monad 卡牌世界
          </h1>
          
          <div style={{
            fontSize: '0.9rem',
            opacity: 0.8,
            color: '#4ECDC4'
          }}>
            Web3 加密货币卡牌竞技游戏
          </div>
        </div>

        {/* 步骤信息 */}
        <div style={{ marginBottom: '35px' }}>
          <div style={{ 
            fontSize: '1.4rem',
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            {stepInfo.title}
          </div>
          
          <div style={{ 
            fontSize: '1rem',
            opacity: 0.8,
            color: '#FFD700'
          }}>
            {stepInfo.subtitle}
          </div>
        </div>

        {/* 进度条 */}
        <div style={{ marginBottom: '30px' }}>
          {/* 步骤指示器 */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
            gap: '10px'
          }}>
            {LOADING_STEPS.map((step, index) => (
              <div
                key={step.key}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: index <= displayStep 
                    ? 'linear-gradient(45deg, #4ECDC4, #44A08D)' 
                    : 'rgba(255,255,255,0.3)',
                  transition: 'all 0.5s ease',
                  boxShadow: index === displayStep 
                    ? '0 0 15px #4ECDC4' 
                    : 'none',
                  transform: index === displayStep ? 'scale(1.3)' : 'scale(1)'
                }}
              />
            ))}
          </div>

          {/* 主进度条 */}
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${stepInfo.progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4ECDC4, #44A08D, #FFD700)',
              borderRadius: '4px',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 10px rgba(78, 205, 196, 0.5)',
              position: 'relative'
            }}>
              {/* 进度条光效 */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shimmer 2s infinite'
              }} />
            </div>
          </div>

          {/* 百分比显示 */}
          <div style={{
            marginTop: '10px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#4ECDC4'
          }}>
            {stepInfo.progress}%
          </div>
        </div>

        {/* 状态文字 */}
        <div style={{ 
          fontSize: '1rem',
          marginBottom: '25px',
          opacity: 0.9,
          minHeight: '24px'
        }}>
          {status}
        </div>

        {/* 提示语 */}
        <div style={{
          padding: '20px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '15px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            fontSize: '0.85rem',
            opacity: 0.8,
            marginBottom: '8px',
            color: '#4ECDC4',
            fontWeight: '500'
          }}>
            💡 游戏提示
          </div>
          
          <div style={{
            fontSize: '0.9rem',
            lineHeight: '1.4',
            color: '#FFD700',
            minHeight: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeInOut 3s infinite'
          }}>
            {LOADING_TIPS[currentTip]}
          </div>
        </div>

        {/* 跳过按钮（仅在较慢步骤显示） */}
        {(currentStep === 'contract' || currentStep === 'wallet') && (
          <button
            onClick={onComplete}
            style={{
              marginTop: '20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'rgba(255,255,255,0.7)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)'
              e.target.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent'
              e.target.style.color = 'rgba(255,255,255,0.7)'
            }}
          >
            跳过动画
          </button>
        )}
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes glow {
          from { filter: brightness(1) drop-shadow(0 0 20px rgba(255, 215, 0, 0.5)); }
          to { filter: brightness(1.2) drop-shadow(0 0 30px rgba(255, 215, 0, 0.8)); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes float {
          from { transform: translateY(0px); }
          to { transform: translateY(-100vh); }
        }
        
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
})

LoadingScreen.displayName = 'LoadingScreen'

export default LoadingScreen
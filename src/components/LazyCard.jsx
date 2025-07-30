import { memo, useState, useCallback, useRef, useEffect } from 'react'

// 卡牌稀有度配置
const RARITY_CONFIG = {
  5: { name: '神话', gradient: ['#FFD700', '#FFA500'], glow: '#FFD700' },
  4: { name: '传说', gradient: ['#9B59B6', '#8E44AD'], glow: '#9B59B6' },
  3: { name: '史诗', gradient: ['#3498DB', '#2980B9'], glow: '#3498DB' },
  2: { name: '稀有', gradient: ['#27AE60', '#229954'], glow: '#27AE60' },
  1: { name: '普通', gradient: ['#95A5A6', '#7F8C8D'], glow: '#95A5A6' }
}

// 加密货币图标映射 - 使用更准确的符号和图标
const CRYPTO_ICONS = {
  'BTC': '₿',      // Bitcoin - 官方符号
  'ETH': 'Ξ',      // Ethereum - 官方符号  
  'SOL': '◎',      // Solana - 类似官方logo
  'BNB': '🟨',     // Binance Coin - 黄色方块代表币安
  'ADA': '🌊',     // Cardano - 波浪代表其流动性
  'DOT': '⚫',     // Polkadot - 圆点代表其多链特性
  'LINK': '🔗',    // Chainlink - 链条符号
  'UNI': '🦄',     // Uniswap - 独角兽
  'AVAX': '🔺',    // Avalanche - 雪崩三角形
  'MATIC': '🟣',   // Polygon/Matic - 紫色多边形
  'ATOM': '⚛️',    // Cosmos - 原子符号
  'XRP': '💧',     // Ripple - 水滴代表流动性
  'LTC': 'Ł',      // Litecoin - 官方符号
  'BCH': '🅱️',     // Bitcoin Cash - B符号
  'TRX': '🎯',     // Tron - 目标符号
  'XLM': '⭐',     // Stellar - 星形
  'XMR': '👤',     // Monero - 隐私人形
  'ETC': '💎',     // Ethereum Classic - 钻石
  'DOGE': '🐕',    // Dogecoin - 狗
  'SHIB': '🐕‍🦺',   // Shiba Inu - 服务犬
  'ALGO': '🔶',    // Algorand - 橙色菱形
  'LUNA': '🌙',    // Terra Luna - 月亮
  'FTT': '🏛️',     // FTX Token - 交易所大楼
  'NEAR': '🌐',    // Near Protocol - 全球网络
  'FIL': '💾',     // Filecoin - 存储设备
  'MANA': '🏰',    // Decentraland - 虚拟城堡
  'SAND': '🏖️',    // The Sandbox - 沙滩
  'CRO': '💳',     // Crypto.com Coin - 信用卡
  'APE': '🦍',     // ApeCoin - 猩猩
  'LDO': '🛡️'      // Lido - 盾牌代表质押保护
}

const LazyCard = memo(({ 
  card, 
  index, 
  isSelected = false, 
  onSelect, 
  animationDelay = 0,
  className = '',
  style = {}
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef(null)
  const intersectionObserverRef = useRef(null)

  // 获取卡牌配置
  const rarity = Number(card.rarity) || 1
  const config = RARITY_CONFIG[rarity] || RARITY_CONFIG[1]
  const icon = CRYPTO_ICONS[card.symbol] || '💰'

  // Intersection Observer 用于懒加载
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true)
            // 添加加载延迟以创建瀑布效果
            setTimeout(() => {
              setIsLoaded(true)
            }, animationDelay)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
      intersectionObserverRef.current = observer
    }

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect()
      }
    }
  }, [isVisible, animationDelay])

  // 点击处理
  const handleClick = useCallback(() => {
    if (onSelect && typeof onSelect === 'function') {
      onSelect(index)
    }
  }, [onSelect, index])

  // 鼠标事件处理
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  // 卡牌样式
  const cardStyle = {
    background: `linear-gradient(135deg, ${config.gradient[0]}, ${config.gradient[1]})`,
    border: isSelected ? `3px solid ${config.glow}` : '2px solid rgba(255,255,255,0.3)',
    borderRadius: '15px',
    padding: '18px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: `translateY(${isLoaded ? 0 : 20}px) scale(${isHovered ? 1.05 : 1}) ${isSelected ? 'scale(1.03)' : ''}`,
    opacity: isLoaded ? 1 : 0,
    boxShadow: isHovered 
      ? `0 20px 40px rgba(0,0,0,0.4), 0 0 20px ${config.glow}40`
      : isSelected 
        ? `0 15px 30px rgba(0,0,0,0.3), 0 0 15px ${config.glow}30`
        : '0 8px 25px rgba(0,0,0,0.2)',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    ...style
  }

  // 悬停光效
  const glowStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at center, ${config.glow}20 0%, transparent 70%)`,
    opacity: isHovered ? 1 : 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none',
    borderRadius: '15px'
  }

  // 加载占位符
  if (!isVisible) {
    return (
      <div 
        ref={cardRef}
        className={className}
        style={{
          minHeight: '200px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '15px',
          border: '2px solid rgba(255,255,255,0.1)',
          ...style
        }}
      />
    )
  }

  return (
    <div 
      ref={cardRef}
      className={className}
      style={cardStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`${card.name} 卡牌，稀有度 ${rarity}`}
    >
      {/* 悬停光效 */}
      <div style={glowStyle} />
      
      {/* 选中指示器 */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: config.glow,
          color: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          animation: 'pulse 2s infinite'
        }}>
          ✓
        </div>
      )}

      {/* 稀有度标识 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.7)',
        color: config.glow,
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '10px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {config.name}
      </div>

      {/* 卡牌图标 */}
      <div style={{ 
        fontSize: '3.5rem', 
        marginBottom: '15px',
        filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
        transition: 'filter 0.3s ease',
        textShadow: `0 0 20px ${config.glow}80`
      }}>
        {icon}
      </div>
      
      {/* 卡牌标题 */}
      <h4 style={{ 
        margin: '12px 0 8px 0', 
        fontSize: '1.1rem',
        fontWeight: 'bold',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        color: 'white'
      }}>
        {card.symbol}
      </h4>
      
      {/* 卡牌副标题 */}
      <div style={{ 
        fontSize: '0.8rem', 
        opacity: 0.9,
        marginBottom: '15px',
        color: 'rgba(255,255,255,0.9)'
      }}>
        {card.name}
      </div>
      
      {/* 卡牌属性 */}
      <div style={{ 
        fontSize: '0.75rem', 
        opacity: 0.85,
        lineHeight: '1.4',
        background: 'rgba(0,0,0,0.3)',
        padding: '10px',
        borderRadius: '8px',
        backdropFilter: 'blur(5px)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <span>⭐ 稀有度</span>
          <span style={{ fontWeight: 'bold', color: config.glow }}>
            {rarity}
          </span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <span>💰 分数</span>
          <span style={{ fontWeight: 'bold', color: '#FFD700' }}>
            {Number(card.baseScore)}
          </span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between'
        }}>
          <span>🔥 等级</span>
          <span style={{ fontWeight: 'bold', color: '#FF6B6B' }}>
            {Number(card.level)}
          </span>
        </div>
      </div>
      
      {/* 选择状态文字 */}
      <div style={{ 
        marginTop: '12px',
        fontSize: '0.8rem',
        fontWeight: 'bold',
        color: isSelected ? config.glow : 'rgba(255,255,255,0.8)',
        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        transition: 'color 0.3s ease'
      }}>
        {isSelected ? '✅ 已选择' : isHovered ? '🎯 点击选择' : '💎 珍贵卡牌'}
      </div>

      {/* CSS 动画样式 */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
})

LazyCard.displayName = 'LazyCard'

export default LazyCard
/**
 * PriceChart.jsx - 集成Coingecko API的价格图表组件
 * 
 * 功能特性：
 * - 实时价格数据显示
 * - Coingecko API集成
 * - 多时间周期支持
 * - 交互式图表
 * - 响应式设计
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { priceService } from '../services/PriceService.js'
import { CONFIG } from '../config/BullrunConfig.js'

// 简化的图表组件（避免依赖外部图表库）
const SimpleChart = ({ data, symbol, color = '#4ECDC4' }) => {
  const canvasRef = useRef()

  useEffect(() => {
    if (!data || data.length === 0 || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 找到数据范围
    const prices = data.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1

    // 绘制网格线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    
    // 水平网格线
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    
    // 垂直网格线
    for (let i = 1; i < 4; i++) {
      const x = (width / 4) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    // 绘制价格线
    if (data.length > 1) {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()

      data.forEach((point, index) => {
        const x = (index / (data.length - 1)) * width
        const y = height - ((point.price - minPrice) / priceRange) * height
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()

      // 绘制最后一个点
      const lastPoint = data[data.length - 1]
      const lastX = width
      const lastY = height - ((lastPoint.price - minPrice) / priceRange) * height
      
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI)
      ctx.fill()
    }

    // 绘制价格标签
    ctx.fillStyle = 'white'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    
    // 最高价标签
    ctx.fillText(`$${maxPrice.toFixed(4)}`, width - 5, 15)
    
    // 最低价标签
    ctx.fillText(`$${minPrice.toFixed(4)}`, width - 5, height - 5)

  }, [data, color])

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={150}
      style={{
        width: '100%',
        height: '150px',
        maxWidth: '300px'
      }}
    />
  )
}

// 实时价格显示组件
const LivePriceDisplay = ({ symbol, priceInfo }) => {
  if (!priceInfo) return null

  const changeColor = priceInfo.change24h >= 0 ? '#27AE60' : '#E74C3C'
  const changeSymbol = priceInfo.change24h >= 0 ? '+' : ''

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '1.5rem' }}>{priceInfo.emoji || '💰'}</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
            {symbol.toUpperCase()}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#bbb' }}>
            {priceInfo.name}
          </div>
        </div>
      </div>
      
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          ${priceInfo.price?.toFixed(4) || '0.0000'}
        </div>
        <div style={{ 
          fontSize: '0.9rem', 
          color: changeColor,
          fontWeight: 'bold'
        }}>
          {changeSymbol}{priceInfo.change24h?.toFixed(2) || '0.00'}%
        </div>
      </div>
    </div>
  )
}

// Bullrun评分显示组件
const BullrunScoreDisplay = ({ bullrunScore }) => {
  if (!bullrunScore) return null

  const { total, breakdown } = bullrunScore
  const scoreColor = total >= 0 ? '#27AE60' : '#E74C3C'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '10px',
      padding: '15px',
      marginTop: '10px'
    }}>
      <div style={{ 
        fontSize: '1.1rem', 
        fontWeight: 'bold', 
        marginBottom: '10px',
        color: scoreColor
      }}>
        🎯 Bullrun分数: {total}
      </div>
      
      <div style={{ fontSize: '0.9rem', color: '#bbb' }}>
        <div>基础分数: {breakdown.base || 0}</div>
        <div>波动性加成: {breakdown.volatility || 0}</div>
        <div>趋势加成: {breakdown.trend || 0}</div>
        <div>24h变化: {breakdown.change24h || 0}</div>
      </div>
    </div>
  )
}

// 主要的价格图表组件
const PriceChart = ({ symbol, compact = false, showBullrunScore = true }) => {
  const [priceInfo, setPriceInfo] = useState(null)
  const [chartData, setChartData] = useState([])
  const [timeframe, setTimeframe] = useState('1h')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const intervalRef = useRef()

  // 获取价格数据
  const fetchPriceData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 从价格服务获取当前价格
      const currentPrice = priceService.getPriceInfo(symbol)
      if (currentPrice) {
        setPriceInfo(currentPrice)
      }

      // 构建历史数据（模拟，实际应用中应该从API获取）
      const mockHistoricalData = generateMockHistoricalData(currentPrice, timeframe)
      setChartData(mockHistoricalData)

    } catch (err) {
      console.error('获取价格数据失败:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe])

  // 生成模拟历史数据
  const generateMockHistoricalData = (currentPrice, timeframe) => {
    if (!currentPrice || !currentPrice.price) return []

    const dataPoints = timeframe === '1h' ? 12 : timeframe === '24h' ? 24 : 7
    const data = []
    
    const currentPriceValue = currentPrice.price
    const volatility = Math.abs(currentPrice.change24h || 1) / 100

    for (let i = 0; i < dataPoints; i++) {
      const timeAgo = (dataPoints - 1 - i) * (timeframe === '1h' ? 5 : timeframe === '24h' ? 60 : 1440) // 分钟
      const randomVariation = (Math.random() - 0.5) * volatility * currentPriceValue
      const price = Math.max(0.0001, currentPriceValue + randomVariation)
      
      data.push({
        timestamp: Date.now() - timeAgo * 60 * 1000,
        price: price
      })
    }

    // 确保最后一个数据点使用真实当前价格
    if (data.length > 0) {
      data[data.length - 1].price = currentPriceValue
    }

    return data.sort((a, b) => a.timestamp - b.timestamp)
  }

  // 组件挂载时获取数据
  useEffect(() => {
    fetchPriceData()
  }, [fetchPriceData])

  // 设置定期更新
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // 每分钟更新一次
    intervalRef.current = setInterval(() => {
      fetchPriceData()
    }, 60000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchPriceData])

  // 监听价格服务更新
  useEffect(() => {
    const unsubscribe = priceService.addListener((event, data) => {
      if (event === 'priceUpdate') {
        const updatedPrice = priceService.getPriceInfo(symbol)
        if (updatedPrice) {
          setPriceInfo(updatedPrice)
          
          // 更新图表数据
          setChartData(prev => {
            const newData = [...prev]
            if (newData.length > 0) {
              newData[newData.length - 1] = {
                timestamp: Date.now(),
                price: updatedPrice.price
              }
            }
            return newData
          })
        }
      }
    })

    return unsubscribe
  }, [symbol])

  if (loading && !priceInfo) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        color: '#bbb'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
        <div>加载价格数据...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        color: '#E74C3C'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>❌</div>
        <div>加载失败: {error}</div>
        <button
          onClick={fetchPriceData}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            background: '#4ECDC4',
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          重试
        </button>
      </div>
    )
  }

  if (!priceInfo) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        color: '#bbb'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
        <div>暂无价格数据</div>
      </div>
    )
  }

  const coinInfo = CONFIG.SUPPORTED_COINS.find(c => c.symbol === symbol)
  const chartColor = coinInfo?.color || priceInfo.color || '#4ECDC4'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '15px',
      padding: compact ? '15px' : '20px',
      border: `1px solid ${chartColor}30`
    }}>
      {/* 头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{
          margin: 0,
          color: chartColor,
          fontSize: compact ? '1.1rem' : '1.3rem'
        }}>
          {symbol.toUpperCase()} 价格走势
        </h3>
        
        {!compact && (
          <div style={{ display: 'flex', gap: '5px' }}>
            {['1h', '24h', '7d'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '5px 10px',
                  background: timeframe === tf ? chartColor : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '5px',
                  color: 'white',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 实时价格显示 */}
      <LivePriceDisplay symbol={symbol} priceInfo={priceInfo} />

      {/* 图表 */}
      {!compact && chartData.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <SimpleChart
            data={chartData}
            symbol={symbol}
            color={chartColor}
          />
        </div>
      )}

      {/* Bullrun评分 */}
      {showBullrunScore && priceInfo.bullrunScore && (
        <BullrunScoreDisplay bullrunScore={priceInfo.bullrunScore} />
      )}

      {/* 数据状态指示器 */}
      <div style={{
        marginTop: '10px',
        fontSize: '0.8rem',
        color: '#888',
        textAlign: 'center'
      }}>
        {priceInfo.isStale && (
          <span style={{ color: '#E74C3C' }}>⚠️ 数据可能过期</span>
        )}
        {priceInfo.isFallback && (
          <span style={{ color: '#F39C12' }}>🔄 使用后备数据</span>
        )}
        {!priceInfo.isStale && !priceInfo.isFallback && (
          <span style={{ color: '#27AE60' }}>✅ 实时数据</span>
        )}
        <div style={{ marginTop: '5px' }}>
          更新时间: {new Date(priceInfo.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default PriceChart
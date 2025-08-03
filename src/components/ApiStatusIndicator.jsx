/**
 * ApiStatusIndicator.jsx - Coingecko API状态指示器
 * 
 * 功能特性：
 * - 实时API连接状态监控
 * - 数据刷新状态显示
 * - 错误状态处理
 * - 手动重试控制
 */

import { useState, useEffect, useCallback } from 'react'
import { priceService } from '../services/PriceService.js'

const ApiStatusIndicator = ({ compact = false, position = 'top-right' }) => {
  const [status, setStatus] = useState({
    isConnected: false,
    isUpdating: false,
    lastUpdate: null,
    failureCount: 0,
    error: null
  })

  // 更新状态
  const updateStatus = useCallback(() => {
    const serviceStatus = priceService.getStatus()
    setStatus({
      isConnected: serviceStatus.isInitialized && !serviceStatus.fallbackMode,
      isUpdating: serviceStatus.isUpdating,
      lastUpdate: serviceStatus.lastUpdateTime,
      failureCount: serviceStatus.failureCount,
      error: serviceStatus.fallbackMode ? 'API连接失败，使用后备模式' : null
    })
  }, [])

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isUpdating: true }))
      await priceService.refreshPrices()
    } catch (error) {
      console.error('手动刷新失败:', error)
    } finally {
      updateStatus()
    }
  }, [updateStatus])

  // 监听价格服务事件
  useEffect(() => {
    const unsubscribe = priceService.addListener((event, data) => {
      updateStatus()
    })

    // 初始状态更新
    updateStatus()

    // 定期更新状态
    const interval = setInterval(updateStatus, 5000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [updateStatus])

  // 获取状态颜色
  const getStatusColor = () => {
    if (status.isUpdating) return '#F39C12' // 橙色 - 更新中
    if (!status.isConnected) return '#E74C3C' // 红色 - 连接失败
    return '#27AE60' // 绿色 - 正常
  }

  // 获取状态图标
  const getStatusIcon = () => {
    if (status.isUpdating) return '🔄'
    if (!status.isConnected) return '❌'
    return '✅'
  }

  // 获取状态文本
  const getStatusText = () => {
    if (status.isUpdating) return '更新中...'
    if (!status.isConnected) return 'API断开'
    return 'API正常'
  }

  // 格式化上次更新时间
  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return '从未更新'
    
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return '刚刚更新'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return new Date(timestamp).toLocaleString()
  }

  // 紧凑模式
  if (compact) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          background: 'rgba(0,0,0,0.7)',
          borderRadius: '15px',
          fontSize: '0.8rem',
          color: getStatusColor(),
          border: `1px solid ${getStatusColor()}30`
        }}
        title={`${getStatusText()} - ${formatLastUpdate(status.lastUpdate)}`}
      >
        <span>{getStatusIcon()}</span>
        <span>API</span>
      </div>
    )
  }

  // 获取位置样式
  const getPositionStyle = () => {
    const baseStyle = {
      position: 'fixed',
      zIndex: 1000,
      background: 'rgba(0,0,0,0.9)',
      borderRadius: '10px',
      padding: '10px 15px',
      color: 'white',
      fontSize: '0.9rem',
      backdropFilter: 'blur(10px)',
      border: `1px solid ${getStatusColor()}30`,
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
    }

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: '20px', left: '20px' }
      case 'top-right':
        return { ...baseStyle, top: '20px', right: '20px' }
      case 'bottom-left':
        return { ...baseStyle, bottom: '20px', left: '20px' }
      case 'bottom-right':
        return { ...baseStyle, bottom: '20px', right: '20px' }
      default:
        return { ...baseStyle, top: '20px', right: '20px' }
    }
  }

  return (
    <div style={getPositionStyle()}>
      {/* 状态头部 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        marginBottom: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '1.2rem' }}>{getStatusIcon()}</span>
          <span style={{ 
            fontWeight: 'bold',
            color: getStatusColor()
          }}>
            {getStatusText()}
          </span>
        </div>

        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          disabled={status.isUpdating}
          style={{
            background: status.isUpdating ? '#666' : getStatusColor(),
            border: 'none',
            borderRadius: '5px',
            color: 'white',
            padding: '4px 8px',
            fontSize: '0.8rem',
            cursor: status.isUpdating ? 'not-allowed' : 'pointer',
            opacity: status.isUpdating ? 0.6 : 1
          }}
          title="手动刷新价格数据"
        >
          🔄
        </button>
      </div>

      {/* 详细信息 */}
      <div style={{
        fontSize: '0.8rem',
        color: '#bbb',
        lineHeight: '1.4'
      }}>
        <div>
          📊 上次更新: {formatLastUpdate(status.lastUpdate)}
        </div>
        
        {status.failureCount > 0 && (
          <div style={{ color: '#E74C3C' }}>
            ⚠️ 失败次数: {status.failureCount}
          </div>
        )}
        
        {status.error && (
          <div style={{ 
            color: '#F39C12',
            marginTop: '5px',
            fontSize: '0.75rem'
          }}>
            {status.error}
          </div>
        )}
        
        {status.isConnected && (
          <div style={{ color: '#27AE60', marginTop: '5px' }}>
            🌐 CoinGecko API
          </div>
        )}
      </div>

      {/* 连接状态指示器 */}
      <div style={{
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getStatusColor(),
            animation: status.isUpdating ? 'pulse 1.5s infinite' : 'none'
          }}
        />
        <span style={{ fontSize: '0.75rem', color: '#888' }}>
          实时数据
        </span>
      </div>

      {/* 添加脉冲动画样式 */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default ApiStatusIndicator
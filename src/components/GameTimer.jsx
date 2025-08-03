/**
 * GameTimer.jsx - 游戏时间管理组件
 * 
 * 功能特性：
 * - 24小时游戏轮次倒计时
 * - UTC时间同步
 * - 游戏状态显示
 * - 自动轮次切换
 * - 视觉时间进度条
 */

import { useState, useEffect, useCallback } from 'react'
import { gameEngine } from '../services/GameEngine.js'
import { TimeUtils, GAME_STATUS } from '../config/BullrunConfig.js'

const GameTimer = ({ 
  compact = false,
  showStatus = true,
  showProgress = true,
  onStatusChange = null 
}) => {
  const [gameStatus, setGameStatus] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [currentRound, setCurrentRound] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // 更新游戏状态
  const updateGameStatus = useCallback(() => {
    try {
      const status = gameEngine.getGameStatus()
      setGameStatus(status)
      setCurrentRound(status.currentRound)
      
      // 计算剩余时间
      const remaining = TimeUtils.getRemainingTime()
      setTimeRemaining(remaining)
      
      setIsLoading(false)

      // 通知父组件状态变化
      if (onStatusChange) {
        onStatusChange(status)
      }
    } catch (error) {
      console.error('更新游戏状态失败:', error)
      setIsLoading(false)
    }
  }, [onStatusChange])

  // 监听游戏引擎事件
  useEffect(() => {
    const unsubscribe = gameEngine.addListener((event, data) => {
      updateGameStatus()
    })

    // 初始更新
    updateGameStatus()

    // 每秒更新时间
    const interval = setInterval(() => {
      updateGameStatus()
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [updateGameStatus])

  // 格式化时间显示
  const formatTime = (milliseconds) => {
    if (milliseconds <= 0) return '00:00:00'
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // 获取状态颜色
  const getStatusColor = () => {
    if (!gameStatus) return '#666'
    
    switch (gameStatus.status) {
      case GAME_STATUS.ACTIVE:
        return '#27AE60'
      case GAME_STATUS.ENDED:
      case GAME_STATUS.CALCULATING:
        return '#F39C12'
      case GAME_STATUS.WAITING:
        return '#3498DB'
      default:
        return '#666'
    }
  }

  // 获取状态图标
  const getStatusIcon = () => {
    if (!gameStatus) return '⏳'
    
    switch (gameStatus.status) {
      case GAME_STATUS.ACTIVE:
        return '🎮'
      case GAME_STATUS.ENDED:
        return '🏁'
      case GAME_STATUS.CALCULATING:
        return '🧮'
      case GAME_STATUS.WAITING:
        return '⏰'
      default:
        return '❓'
    }
  }

  // 获取状态文本
  const getStatusText = () => {
    if (!gameStatus) return '加载中...'
    
    switch (gameStatus.status) {
      case GAME_STATUS.ACTIVE:
        return '游戏进行中'
      case GAME_STATUS.ENDED:
        return '游戏已结束'
      case GAME_STATUS.CALCULATING:
        return '计算结果中'
      case GAME_STATUS.WAITING:
        return '等待下一轮'
      default:
        return '状态未知'
    }
  }

  // 计算进度百分比
  const getProgressPercentage = () => {
    if (!currentRound) return 0
    
    const totalDuration = currentRound.endTime - currentRound.startTime
    const elapsed = Date.now() - currentRound.startTime
    
    return Math.max(0, Math.min(100, (elapsed / totalDuration) * 100))
  }

  // 获取时间阶段描述
  const getTimePhase = () => {
    const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
    
    if (gameStatus?.status === GAME_STATUS.ACTIVE) {
      if (hours > 20) return '游戏开始阶段'
      if (hours > 12) return '游戏进行阶段'
      if (hours > 4) return '游戏中后期'
      if (hours > 1) return '游戏冲刺阶段'
      return '游戏最后时刻'
    }
    
    return '轮次间隔'
  }

  if (isLoading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: compact ? '10px' : '20px',
        color: '#bbb'
      }}>
        <div style={{ fontSize: compact ? '1rem' : '1.5rem' }}>⏳</div>
        <div style={{ fontSize: compact ? '0.8rem' : '1rem' }}>
          加载游戏时间...
        </div>
      </div>
    )
  }

  // 紧凑模式
  if (compact) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.7)',
        borderRadius: '20px',
        color: getStatusColor(),
        fontSize: '0.9rem',
        border: `1px solid ${getStatusColor()}30`
      }}>
        <span>{getStatusIcon()}</span>
        <span style={{ fontWeight: 'bold', minWidth: '70px' }}>
          {formatTime(timeRemaining)}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '15px',
      padding: '20px',
      border: `2px solid ${getStatusColor()}30`,
      boxShadow: `0 0 20px ${getStatusColor()}20`
    }}>
      {/* 标题 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '15px'
      }}>
        <h3 style={{
          margin: '0 0 5px 0',
          color: getStatusColor(),
          fontSize: '1.3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.5rem' }}>{getStatusIcon()}</span>
          游戏计时器
        </h3>
        <div style={{
          fontSize: '0.9rem',
          color: '#bbb'
        }}>
          当前轮次 #{currentRound?.id?.split('_')[1] || 'N/A'}
        </div>
      </div>

      {/* 主要时间显示 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <div style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: getStatusColor(),
          fontFamily: 'monospace',
          textShadow: `0 0 10px ${getStatusColor()}50`,
          marginBottom: '10px'
        }}>
          {formatTime(timeRemaining)}
        </div>
        
        <div style={{
          fontSize: '1.1rem',
          color: getStatusColor(),
          fontWeight: 'bold',
          marginBottom: '5px'
        }}>
          {getStatusText()}
        </div>
        
        <div style={{
          fontSize: '0.9rem',
          color: '#bbb'
        }}>
          {getTimePhase()}
        </div>
      </div>

      {/* 进度条 */}
      {showProgress && gameStatus?.status === GAME_STATUS.ACTIVE && (
        <div style={{ marginBottom: '15px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            height: '8px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div
              style={{
                background: `linear-gradient(90deg, ${getStatusColor()}, ${getStatusColor()}80)`,
                height: '100%',
                width: `${getProgressPercentage()}%`,
                transition: 'width 1s ease-in-out',
                borderRadius: '10px'
              }}
            />
          </div>
          <div style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            color: '#bbb',
            marginTop: '5px'
          }}>
            轮次进度: {getProgressPercentage().toFixed(1)}%
          </div>
        </div>
      )}

      {/* 游戏状态信息 */}
      {showStatus && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          padding: '15px',
          fontSize: '0.9rem'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            color: '#bbb'
          }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>
                📊 游戏信息
              </div>
              <div>参与人数: {gameStatus?.participantCount || 0}</div>
              <div>
                轮次开始: {currentRound ? 
                  new Date(currentRound.startTime).toLocaleTimeString() : 
                  'N/A'
                }
              </div>
            </div>
            
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>
                🌐 系统状态
              </div>
              <div style={{
                color: gameStatus?.isCalculating ? '#F39C12' : '#27AE60'
              }}>
                {gameStatus?.isCalculating ? '🧮 计算中' : '✅ 运行正常'}
              </div>
              <div>
                下轮开始: {new Date(TimeUtils.getNextRoundStart()).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UTC时间显示 */}
      <div style={{
        textAlign: 'center',
        marginTop: '15px',
        fontSize: '0.8rem',
        color: '#888',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingTop: '10px'
      }}>
        🌍 UTC时间: {new Date().toUTCString()}
      </div>
    </div>
  )
}

export default GameTimer
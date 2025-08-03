/**
 * GameStatusPanel.jsx - 游戏状态面板组件
 * 
 * 功能特性：
 * - 实时游戏轮次信息
 * - 参与者统计
 * - 游戏阶段显示
 * - 下一轮预告
 * - 历史记录快览
 */

import { useState, useEffect, useCallback } from 'react'
import { gameEngine } from '../services/GameEngine.js'
import { TimeUtils, GAME_STATUS, EVENT_TYPES } from '../config/BullrunConfig.js'

const GameStatusPanel = ({ 
  showHistory = true,
  showNextRound = true,
  compact = false 
}) => {
  const [gameStatus, setGameStatus] = useState(null)
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // 更新游戏状态
  const updateStatus = useCallback(() => {
    try {
      const status = gameEngine.getGameStatus()
      const roundHistory = gameEngine.getRoundHistory()
      
      setGameStatus(status)
      setHistory(roundHistory.slice(0, 5)) // 最近5轮
      setIsLoading(false)
    } catch (error) {
      console.error('获取游戏状态失败:', error)
      setIsLoading(false)
    }
  }, [])

  // 监听游戏引擎事件
  useEffect(() => {
    const unsubscribe = gameEngine.addListener((event, data) => {
      if (event === EVENT_TYPES.GAME_START || 
          event === EVENT_TYPES.GAME_END ||
          event === EVENT_TYPES.SCORE_UPDATE) {
        updateStatus()
      }
    })

    updateStatus()

    // 定期更新
    const interval = setInterval(updateStatus, 30000) // 30秒更新一次

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [updateStatus])

  // 获取轮次状态颜色
  const getStatusColor = (status) => {
    switch (status) {
      case GAME_STATUS.ACTIVE: return '#27AE60'
      case GAME_STATUS.ENDED: return '#F39C12'
      case GAME_STATUS.CALCULATING: return '#E74C3C'
      case GAME_STATUS.WAITING: return '#3498DB'
      default: return '#666'
    }
  }

  // 获取轮次状态图标
  const getStatusIcon = (status) => {
    switch (status) {
      case GAME_STATUS.ACTIVE: return '🎮'
      case GAME_STATUS.ENDED: return '🏁'
      case GAME_STATUS.CALCULATING: return '🧮'
      case GAME_STATUS.WAITING: return '⏰'
      default: return '❓'
    }
  }

  // 格式化持续时间
  const formatDuration = (startTime, endTime) => {
    const duration = endTime - startTime
    const hours = Math.floor(duration / (1000 * 60 * 60))
    return `${hours}小时`
  }

  // 格式化相对时间
  const formatRelativeTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  if (isLoading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '15px',
        color: '#bbb'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
        <div>加载游戏状态...</div>
      </div>
    )
  }

  if (!gameStatus) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '15px',
        color: '#E74C3C'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>❌</div>
        <div>无法获取游戏状态</div>
      </div>
    )
  }

  const { status, currentRound, participantCount, leaderboard } = gameStatus

  // 紧凑模式
  if (compact) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '10px',
        padding: '15px',
        border: `1px solid ${getStatusColor(status)}30`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: getStatusColor(status)
          }}>
            <span style={{ fontSize: '1.2rem' }}>{getStatusIcon(status)}</span>
            <span style={{ fontWeight: 'bold' }}>
              {status === GAME_STATUS.ACTIVE ? '进行中' : 
               status === GAME_STATUS.WAITING ? '等待中' : '已结束'}
            </span>
          </div>
          <div style={{ color: '#bbb', fontSize: '0.9rem' }}>
            👥 {participantCount}
          </div>
        </div>
        
        {leaderboard.length > 0 && (
          <div style={{ fontSize: '0.8rem', color: '#bbb' }}>
            🏆 领先: {leaderboard[0]?.playerAddress?.slice(0, 8)}...
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '15px',
      padding: '20px',
      border: `2px solid ${getStatusColor(status)}30`
    }}>
      {/* 标题 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: '0 0 10px 0',
          color: getStatusColor(status),
          fontSize: '1.4rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.6rem' }}>{getStatusIcon(status)}</span>
          游戏状态面板
        </h3>
      </div>

      {/* 当前轮次信息 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          fontSize: '1.1rem',
          fontWeight: 'bold',
          color: getStatusColor(status),
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🎯 当前轮次信息
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '15px',
          fontSize: '0.9rem'
        }}>
          <div>
            <div style={{ color: '#bbb', marginBottom: '5px' }}>轮次状态</div>
            <div style={{ 
              color: getStatusColor(status),
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {getStatusIcon(status)}
              {status === GAME_STATUS.ACTIVE && '进行中'}
              {status === GAME_STATUS.WAITING && '等待开始'}
              {status === GAME_STATUS.ENDED && '已结束'}
              {status === GAME_STATUS.CALCULATING && '计算中'}
            </div>
          </div>

          <div>
            <div style={{ color: '#bbb', marginBottom: '5px' }}>参与人数</div>
            <div style={{ color: '#fff', fontWeight: 'bold' }}>
              👥 {participantCount} 位玩家
            </div>
          </div>

          <div>
            <div style={{ color: '#bbb', marginBottom: '5px' }}>轮次时间</div>
            <div style={{ color: '#fff' }}>
              {currentRound ? formatDuration(currentRound.startTime, currentRound.endTime) : 'N/A'}
            </div>
          </div>

          <div>
            <div style={{ color: '#bbb', marginBottom: '5px' }}>开始时间</div>
            <div style={{ color: '#fff' }}>
              {currentRound ? 
                new Date(currentRound.startTime).toLocaleString() : 
                'N/A'
              }
            </div>
          </div>
        </div>
      </div>

      {/* 排行榜快览 */}
      {leaderboard.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#FFD700',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🏆 实时排行榜 (前3名)
          </div>
          
          {leaderboard.slice(0, 3).map((player, index) => {
            const rankIcons = ['🥇', '🥈', '🥉']
            const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32']
            
            return (
              <div
                key={player.playerAddress}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{rankIcons[index]}</span>
                  <span style={{
                    color: rankColors[index],
                    fontWeight: 'bold'
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{ color: '#bbb', fontSize: '0.9rem' }}>
                    {player.playerAddress.slice(0, 8)}...{player.playerAddress.slice(-4)}
                  </span>
                </div>
                
                <div style={{
                  color: player.finalScore >= 0 ? '#27AE60' : '#E74C3C',
                  fontWeight: 'bold'
                }}>
                  {player.finalScore > 0 ? '+' : ''}{player.finalScore}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 下一轮预告 */}
      {showNextRound && status === GAME_STATUS.ACTIVE && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          padding: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#3498DB',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⏰ 下一轮预告
          </div>
          
          <div style={{ fontSize: '0.9rem', color: '#bbb' }}>
            <div>开始时间: {new Date(TimeUtils.getNextRoundStart()).toLocaleString()}</div>
            <div>剩余时间: {TimeUtils.formatRemainingTime(TimeUtils.getRemainingTime())}</div>
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {showHistory && history.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          padding: '15px'
        }}>
          <div style={{
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#9B59B6',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📚 最近轮次记录
          </div>
          
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {history.map((round, index) => (
              <div
                key={round.roundId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: index < history.length - 1 ? 
                    '1px solid rgba(255,255,255,0.1)' : 'none',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ color: '#bbb' }}>
                  轮次 #{round.roundId.split('_')[1]}
                </div>
                <div style={{ color: '#bbb' }}>
                  👥 {round.participantCount}
                </div>
                <div style={{ color: '#888' }}>
                  {formatRelativeTime(round.endTime)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 系统状态 */}
      <div style={{
        textAlign: 'center',
        marginTop: '15px',
        fontSize: '0.8rem',
        color: '#888',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        paddingTop: '10px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            color: gameStatus.isCalculating ? '#F39C12' : '#27AE60'
          }}>
            {gameStatus.isCalculating ? '🧮 计算中' : '✅ 系统正常'}
          </div>
          
          <div>
            🕐 {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameStatusPanel
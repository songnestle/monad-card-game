/**
 * Leaderboard.jsx - 排行榜和奖励分配系统
 * 
 * 功能特性：
 * - 实时排行榜显示
 * - 幂次定律奖励分配
 * - 历史排名查看
 * - 玩家统计信息
 * - 奖励预览系统
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { gameEngine } from '../services/GameEngine.js'
import { CONFIG, EVENT_TYPES, GAME_STATUS } from '../config/BullrunConfig.js'

const Leaderboard = ({ 
  maxEntries = 50,
  showRewards = true,
  showHistory = true,
  compact = false,
  playerAddress = null 
}) => {
  const [currentLeaderboard, setCurrentLeaderboard] = useState([])
  const [gameStatus, setGameStatus] = useState(null)
  const [selectedTab, setSelectedTab] = useState('current')
  const [historyData, setHistoryData] = useState([])
  const [rewardPreview, setRewardPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // 更新排行榜数据
  const updateLeaderboard = useCallback(() => {
    try {
      const status = gameEngine.getGameStatus()
      const history = gameEngine.getRoundHistory()
      
      setGameStatus(status)
      setCurrentLeaderboard(status.leaderboard || [])
      setHistoryData(history)
      
      // 计算奖励预览
      if (status.leaderboard && status.leaderboard.length > 0) {
        const preview = calculateRewardPreview(status.leaderboard)
        setRewardPreview(preview)
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('更新排行榜失败:', error)
      setIsLoading(false)
    }
  }, [])

  // 计算奖励预览
  const calculateRewardPreview = useCallback((leaderboard) => {
    if (!leaderboard || leaderboard.length === 0) return null

    const totalPrize = Math.max(
      CONFIG.PRIZE_DISTRIBUTION.MINIMUM_PRIZE_POOL,
      leaderboard.length * 10 // 每位参与者基础奖池10 MON
    )

    const distribution = []
    const top10Count = Math.min(10, leaderboard.length)
    const top10Share = CONFIG.PRIZE_DISTRIBUTION.TOP_10_SHARE
    const participationShare = CONFIG.PRIZE_DISTRIBUTION.PARTICIPATION_REWARD_SHARE

    // 前10名奖励分配
    const top10Pool = totalPrize * top10Share

    for (let i = 0; i < top10Count; i++) {
      const participant = leaderboard[i]
      let reward

      if (i === 0) {
        // 冠军奖励
        reward = (top10Pool * 0.4) * CONFIG.PRIZE_DISTRIBUTION.WINNER_BONUS_MULTIPLIER
      } else {
        // 幂次定律分配
        const rankFactor = Math.pow(top10Count - i, CONFIG.PRIZE_DISTRIBUTION.POWER_LAW_EXPONENT)
        const totalRankFactors = Array.from({ length: top10Count - 1 }, (_, j) => 
          Math.pow(top10Count - (j + 1), CONFIG.PRIZE_DISTRIBUTION.POWER_LAW_EXPONENT)
        ).reduce((sum, factor) => sum + factor, 0)
        
        reward = (top10Pool * 0.6) * (rankFactor / totalRankFactors)
      }

      distribution.push({
        ...participant,
        reward: Math.round(reward * 1000) / 1000,
        rewardType: i === 0 ? 'winner' : 'top10'
      })
    }

    // 参与奖
    const participationPool = totalPrize * participationShare
    const participationReward = participationPool / Math.max(1, leaderboard.length - top10Count)

    for (let i = top10Count; i < leaderboard.length; i++) {
      const participant = leaderboard[i]
      distribution.push({
        ...participant,
        reward: Math.round(participationReward * 1000) / 1000,
        rewardType: 'participation'
      })
    }

    return {
      distribution: distribution.slice(0, maxEntries),
      totalPrize: Math.round(totalPrize * 1000) / 1000,
      breakdown: {
        top10Pool: Math.round(top10Pool * 1000) / 1000,
        participationPool: Math.round(participationPool * 1000) / 1000
      }
    }
  }, [maxEntries])

  // 监听游戏引擎事件
  useEffect(() => {
    const unsubscribe = gameEngine.addListener((event, data) => {
      if (event === EVENT_TYPES.SCORE_UPDATE || 
          event === EVENT_TYPES.GAME_END ||
          event === EVENT_TYPES.HAND_CREATED) {
        updateLeaderboard()
      }
    })

    updateLeaderboard()

    // 定期更新（仅在游戏进行中）
    const interval = setInterval(() => {
      if (gameStatus?.status === GAME_STATUS.ACTIVE) {
        updateLeaderboard()
      }
    }, 10000) // 10秒更新一次

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [updateLeaderboard, gameStatus?.status])

  // 获取排名图标
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  // 获取排名颜色
  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return '#FFD700'
      case 2: return '#C0C0C0'
      case 3: return '#CD7F32'
      default: return rank <= 10 ? '#4ECDC4' : '#bbb'
    }
  }

  // 获取奖励类型颜色
  const getRewardTypeColor = (type) => {
    switch (type) {
      case 'winner': return '#FFD700'
      case 'top10': return '#4ECDC4'
      case 'participation': return '#95A5A6'
      default: return '#bbb'
    }
  }

  // 格式化地址显示
  const formatAddress = (address) => {
    if (!address) return 'Unknown'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // 计算玩家在排行榜中的位置
  const playerPosition = useMemo(() => {
    if (!playerAddress || !currentLeaderboard.length) return null
    const index = currentLeaderboard.findIndex(p => p.playerAddress === playerAddress)
    return index >= 0 ? index + 1 : null
  }, [playerAddress, currentLeaderboard])

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
        <div>加载排行榜...</div>
      </div>
    )
  }

  // 紧凑模式
  if (compact) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '10px',
        padding: '15px'
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
          🏆 排行榜 (前5名)
        </div>
        
        {currentLeaderboard.slice(0, 5).map((player, index) => (
          <div
            key={player.playerAddress}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px 0',
              borderBottom: index < 4 ? '1px solid rgba(255,255,255,0.1)' : 'none'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                color: getRankColor(index + 1),
                fontWeight: 'bold',
                minWidth: '25px'
              }}>
                {getRankIcon(index + 1)}
              </span>
              <span style={{ color: '#bbb', fontSize: '0.9rem' }}>
                {formatAddress(player.playerAddress)}
              </span>
            </div>
            
            <div style={{
              color: player.finalScore >= 0 ? '#27AE60' : '#E74C3C',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}>
              {player.finalScore > 0 ? '+' : ''}{player.finalScore}
            </div>
          </div>
        ))}
        
        {playerPosition && playerPosition > 5 && (
          <div style={{
            marginTop: '10px',
            padding: '8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '5px',
            fontSize: '0.85rem',
            color: '#bbb'
          }}>
            你的排名: #{playerPosition}
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
      border: '1px solid rgba(255,215,0,0.3)'
    }}>
      {/* 标题和标签页 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#FFD700',
          fontSize: '1.4rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.6rem' }}>🏆</span>
          排行榜
        </h3>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          {[
            { id: 'current', label: '当前轮次' },
            ...(showHistory ? [{ id: 'history', label: '历史记录' }] : []),
            ...(showRewards ? [{ id: 'rewards', label: '奖励分配' }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              style={{
                padding: '8px 15px',
                background: selectedTab === tab.id ? '#FFD700' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '20px',
                color: selectedTab === tab.id ? '#000' : '#fff',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: selectedTab === tab.id ? 'bold' : 'normal'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 玩家位置提示 */}
      {playerPosition && selectedTab === 'current' && (
        <div style={{
          background: 'rgba(255,215,0,0.1)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: '10px',
          padding: '10px',
          marginBottom: '15px',
          textAlign: 'center',
          color: '#FFD700'
        }}>
          🎯 你的当前排名: #{playerPosition} / {currentLeaderboard.length}
        </div>
      )}

      {/* 当前排行榜 */}
      {selectedTab === 'current' && (
        <div>
          {currentLeaderboard.length > 0 ? (
            <>
              {/* 奖池信息 */}
              {rewardPreview && (
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  padding: '15px',
                  marginBottom: '15px',
                  display: 'flex',
                  justifyContent: 'space-around',
                  textAlign: 'center'
                }}>
                  <div>
                    <div style={{ color: '#FFD700', fontWeight: 'bold' }}>
                      💰 总奖池
                    </div>
                    <div style={{ fontSize: '1.2rem', color: '#fff' }}>
                      {rewardPreview.totalPrize} MON
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#4ECDC4', fontWeight: 'bold' }}>
                      🏆 前10名奖池
                    </div>
                    <div style={{ fontSize: '1.2rem', color: '#fff' }}>
                      {rewardPreview.breakdown.top10Pool} MON
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#95A5A6', fontWeight: 'bold' }}>
                      🎁 参与奖奖池
                    </div>
                    <div style={{ fontSize: '1.2rem', color: '#fff' }}>
                      {rewardPreview.breakdown.participationPool} MON
                    </div>
                  </div>
                </div>
              )}

              {/* 排行榜列表 */}
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {currentLeaderboard.map((player, index) => {
                  const isPlayer = player.playerAddress === playerAddress
                  
                  return (
                    <div
                      key={player.playerAddress}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        marginBottom: '8px',
                        background: isPlayer ? 
                          'rgba(255,215,0,0.1)' : 
                          'rgba(255,255,255,0.03)',
                        border: isPlayer ? 
                          '2px solid rgba(255,215,0,0.5)' : 
                          '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        flex: 1
                      }}>
                        <div style={{
                          color: getRankColor(index + 1),
                          fontWeight: 'bold',
                          fontSize: '1.1rem',
                          minWidth: '40px'
                        }}>
                          {getRankIcon(index + 1)}
                        </div>
                        
                        <div>
                          <div style={{
                            color: isPlayer ? '#FFD700' : '#fff',
                            fontWeight: 'bold',
                            fontSize: '0.95rem'
                          }}>
                            {formatAddress(player.playerAddress)}
                            {isPlayer && ' (你)'}
                          </div>
                          <div style={{
                            color: '#bbb',
                            fontSize: '0.8rem'
                          }}>
                            {new Date(player.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        textAlign: 'right'
                      }}>
                        <div style={{
                          color: player.finalScore >= 0 ? '#27AE60' : '#E74C3C',
                          fontWeight: 'bold',
                          fontSize: '1.1rem'
                        }}>
                          {player.finalScore > 0 ? '+' : ''}{player.finalScore}
                        </div>
                        {rewardPreview && (
                          <div style={{
                            color: getRewardTypeColor(
                              index === 0 ? 'winner' : 
                              index < 10 ? 'top10' : 'participation'
                            ),
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }}>
                            +{rewardPreview.distribution[index]?.reward || 0} MON
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#bbb'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🏆</div>
              <div style={{ fontSize: '1.1rem' }}>还没有玩家上榜</div>
              <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                创建你的第一手牌来参与排行榜吧！
              </div>
            </div>
          )}
        </div>
      )}

      {/* 奖励分配详情 */}
      {selectedTab === 'rewards' && rewardPreview && (
        <div>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            padding: '15px',
            marginBottom: '15px'
          }}>
            <h4 style={{
              margin: '0 0 10px 0',
              color: '#FFD700',
              fontSize: '1.2rem'
            }}>
              💰 奖励分配算法
            </h4>
            <div style={{ fontSize: '0.9rem', color: '#bbb', lineHeight: '1.6' }}>
              <div>• 总奖池基于参与人数动态计算</div>
              <div>• 前10名获得80%奖池，采用幂次定律分配</div>
              <div>• 冠军获得额外{CONFIG.PRIZE_DISTRIBUTION.WINNER_BONUS_MULTIPLIER}x倍数奖励</div>
              <div>• 所有参与者均可获得参与奖</div>
            </div>
          </div>

          <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
            {rewardPreview.distribution.map((player, index) => (
              <div
                key={player.playerAddress}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  marginBottom: '5px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  border: `1px solid ${getRewardTypeColor(player.rewardType)}30`
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{
                    color: getRankColor(index + 1),
                    fontWeight: 'bold'
                  }}>
                    {getRankIcon(index + 1)}
                  </span>
                  <span style={{ color: '#bbb', fontSize: '0.9rem' }}>
                    {formatAddress(player.playerAddress)}
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <span style={{
                    color: player.finalScore >= 0 ? '#27AE60' : '#E74C3C',
                    fontSize: '0.9rem'
                  }}>
                    {player.finalScore > 0 ? '+' : ''}{player.finalScore}
                  </span>
                  <span style={{
                    color: getRewardTypeColor(player.rewardType),
                    fontWeight: 'bold'
                  }}>
                    {player.reward} MON
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {selectedTab === 'history' && showHistory && (
        <div>
          {historyData.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {historyData.map((round, roundIndex) => (
                <div
                  key={round.roundId}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    padding: '15px',
                    marginBottom: '15px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      color: '#4ECDC4',
                      fontSize: '1.1rem'
                    }}>
                      轮次 #{round.roundId.split('_')[1]}
                    </h4>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#bbb'
                    }}>
                      {new Date(round.endTime).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#bbb',
                    marginBottom: '10px'
                  }}>
                    参与人数: {round.participantCount} | 
                    总奖池: {round.prizeDistribution?.totalPrize || 0} MON
                  </div>

                  {round.leaderboard.slice(0, 3).map((player, index) => (
                    <div
                      key={player.playerAddress}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '5px 0',
                        borderBottom: index < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{
                          color: getRankColor(index + 1),
                          fontSize: '0.9rem'
                        }}>
                          {getRankIcon(index + 1)}
                        </span>
                        <span style={{
                          color: '#bbb',
                          fontSize: '0.8rem'
                        }}>
                          {formatAddress(player.playerAddress)}
                        </span>
                      </div>
                      <span style={{
                        color: player.finalScore >= 0 ? '#27AE60' : '#E74C3C',
                        fontSize: '0.9rem',
                        fontWeight: 'bold'
                      }}>
                        {player.finalScore > 0 ? '+' : ''}{player.finalScore}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#bbb'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📚</div>
              <div style={{ fontSize: '1.1rem' }}>暂无历史记录</div>
            </div>
          )}
        </div>
      )}

      {/* 状态栏 */}
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
          <div>
            📊 实时更新: {gameStatus?.status === GAME_STATUS.ACTIVE ? '✅' : '⏸️'}
          </div>
          <div>
            🕐 {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
/**
 * DuplicateCardWarning.jsx - 重复卡牌惩罚机制组件
 * 
 * 功能特性：
 * - 实时检测重复卡牌
 * - 显示惩罚分数预览
 * - 智能卡牌建议
 * - 视觉警告提示
 * - 优化建议系统
 */

import { useState, useEffect, useMemo } from 'react'
import { CONFIG } from '../config/BullrunConfig.js'

const DuplicateCardWarning = ({ 
  selectedCards = [], 
  allCards = [],
  onSuggestion = null,
  showSuggestions = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // 计算重复卡牌信息
  const duplicateAnalysis = useMemo(() => {
    const cardCounts = {}
    const duplicateGroups = {}
    let totalPenalty = 0

    // 统计每张卡牌的出现次数
    selectedCards.forEach((cardIndex, position) => {
      cardCounts[cardIndex] = (cardCounts[cardIndex] || 0) + 1
      
      if (!duplicateGroups[cardIndex]) {
        duplicateGroups[cardIndex] = []
      }
      duplicateGroups[cardIndex].push(position)
    })

    // 计算惩罚分数
    const duplicateCards = []
    for (const [cardIndex, count] of Object.entries(cardCounts)) {
      if (count > 1) {
        const duplicateCount = count - 1
        const cardPenalty = duplicateCount * 50 * duplicateCount // 平方增长
        const actualPenalty = Math.min(cardPenalty, Math.abs(CONFIG.GAME.MAX_DUPLICATE_PENALTY))
        
        totalPenalty -= actualPenalty
        
        duplicateCards.push({
          cardIndex: parseInt(cardIndex),
          count,
          penalty: actualPenalty,
          positions: duplicateGroups[cardIndex],
          card: allCards[parseInt(cardIndex)]
        })
      }
    }

    return {
      hasDuplicates: duplicateCards.length > 0,
      totalPenalty,
      duplicateCards,
      duplicateCount: duplicateCards.reduce((sum, d) => sum + (d.count - 1), 0)
    }
  }, [selectedCards, allCards])

  // 生成优化建议
  const optimizationSuggestions = useMemo(() => {
    if (!duplicateAnalysis.hasDuplicates || !showSuggestions) return []

    const suggestions = []
    const usedCardIndices = new Set(selectedCards)

    // 为每个重复卡牌组找到替代方案
    duplicateAnalysis.duplicateCards.forEach(duplicate => {
      const { cardIndex, positions, card } = duplicate
      
      // 跳过第一个位置（保留一张）
      const positionsToReplace = positions.slice(1)
      
      positionsToReplace.forEach(position => {
        // 寻找替代卡牌
        const alternatives = allCards
          .map((altCard, index) => ({ card: altCard, index }))
          .filter(({ index }) => !usedCardIndices.has(index))
          .slice(0, 3) // 最多建议3个替代方案

        if (alternatives.length > 0) {
          suggestions.push({
            type: 'replace',
            position,
            currentCard: card,
            currentIndex: cardIndex,
            alternatives,
            penaltyReduction: duplicate.penalty / (duplicate.count - 1)
          })
        }
      })
    })

    return suggestions.slice(0, 5) // 最多显示5个建议
  }, [duplicateAnalysis, allCards, selectedCards, showSuggestions])

  // 自动展开（如果有重复卡牌）
  useEffect(() => {
    if (duplicateAnalysis.hasDuplicates && !isExpanded) {
      setIsExpanded(true)
    }
  }, [duplicateAnalysis.hasDuplicates, isExpanded])

  if (!duplicateAnalysis.hasDuplicates) {
    return (
      <div style={{
        background: 'rgba(39, 174, 96, 0.1)',
        border: '1px solid rgba(39, 174, 96, 0.3)',
        borderRadius: '10px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '0.9rem'
      }}>
        <span style={{ fontSize: '1.2rem' }}>✅</span>
        <span style={{ color: '#27AE60', fontWeight: 'bold' }}>
          没有重复卡牌，手牌优化良好！
        </span>
      </div>
    )
  }

  return (
    <div style={{
      background: 'rgba(231, 76, 60, 0.1)',
      border: '2px solid rgba(231, 76, 60, 0.4)',
      borderRadius: '10px',
      padding: '15px',
      animation: 'warning-pulse 2s infinite'
    }}>
      {/* 主要警告信息 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.5rem' }}>⚠️</span>
          <div>
            <div style={{
              color: '#E74C3C',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}>
              检测到重复卡牌！
            </div>
            <div style={{
              color: '#bbb',
              fontSize: '0.9rem'
            }}>
              {duplicateAnalysis.duplicateCount} 张重复卡牌，惩罚 {duplicateAnalysis.totalPenalty} 分
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            background: 'rgba(231, 76, 60, 0.2)',
            color: '#E74C3C',
            padding: '6px 12px',
            borderRadius: '15px',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            {duplicateAnalysis.totalPenalty} 分
          </div>
          <span style={{
            color: '#bbb',
            fontSize: '1.2rem',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* 详细信息（可折叠） */}
      {isExpanded && (
        <div style={{
          marginTop: '15px',
          paddingTop: '15px',
          borderTop: '1px solid rgba(231, 76, 60, 0.3)'
        }}>
          {/* 重复卡牌详情 */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{
              margin: '0 0 10px 0',
              color: '#E74C3C',
              fontSize: '1rem'
            }}>
              🔍 重复卡牌详情
            </h4>
            
            {duplicateAnalysis.duplicateCards.map(duplicate => (
              <div
                key={duplicate.cardIndex}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  padding: '10px',
                  marginBottom: '8px',
                  border: '1px solid rgba(231, 76, 60, 0.2)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>
                      {duplicate.card?.emoji || '💰'}
                    </span>
                    <div>
                      <div style={{
                        color: '#fff',
                        fontWeight: 'bold'
                      }}>
                        {duplicate.card?.symbol || `卡牌 #${duplicate.cardIndex}`}
                      </div>
                      <div style={{
                        color: '#bbb',
                        fontSize: '0.8rem'
                      }}>
                        出现 {duplicate.count} 次，位置: {duplicate.positions.map(p => p + 1).join(', ')}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    color: '#E74C3C',
                    fontWeight: 'bold'
                  }}>
                    -{duplicate.penalty} 分
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 惩罚机制说明 */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px'
          }}>
            <h4 style={{
              margin: '0 0 8px 0',
              color: '#F39C12',
              fontSize: '1rem'
            }}>
              📖 惩罚机制说明
            </h4>
            <div style={{
              fontSize: '0.85rem',
              color: '#bbb',
              lineHeight: '1.5'
            }}>
              <div>• 每张重复卡牌惩罚: 50 × 重复数量²</div>
              <div>• 最大惩罚上限: {Math.abs(CONFIG.GAME.MAX_DUPLICATE_PENALTY)} 分</div>
              <div>• 建议使用不同的卡牌来优化手牌分数</div>
            </div>
          </div>

          {/* 优化建议 */}
          {optimizationSuggestions.length > 0 && (
            <div>
              <h4 style={{
                margin: '0 0 10px 0',
                color: '#4ECDC4',
                fontSize: '1rem'
              }}>
                💡 优化建议
              </h4>
              
              {optimizationSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '8px',
                    border: '1px solid rgba(78, 205, 196, 0.2)'
                  }}
                >
                  <div style={{
                    fontSize: '0.9rem',
                    marginBottom: '8px',
                    color: '#bbb'
                  }}>
                    位置 {suggestion.position + 1}: 替换 {suggestion.currentCard?.symbol || '卡牌'}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    {suggestion.alternatives.map(({ card, index: altIndex }) => (
                      <button
                        key={altIndex}
                        onClick={() => {
                          if (onSuggestion) {
                            onSuggestion({
                              action: 'replace',
                              position: suggestion.position,
                              oldIndex: suggestion.currentIndex,
                              newIndex: altIndex
                            })
                          }
                        }}
                        style={{
                          background: 'rgba(78, 205, 196, 0.2)',
                          border: '1px solid rgba(78, 205, 196, 0.4)',
                          borderRadius: '6px',
                          color: '#4ECDC4',
                          padding: '6px 10px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                        title={`替换为 ${card.name || card.symbol}`}
                      >
                        <span>{card.emoji || '💰'}</span>
                        <span>{card.symbol}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#27AE60',
                    marginTop: '5px'
                  }}>
                    ↗️ 可减少惩罚 {suggestion.penaltyReduction.toFixed(0)} 分
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 行动按钮 */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginTop: '15px'
          }}>
            <button
              onClick={() => {
                if (onSuggestion) {
                  onSuggestion({ action: 'auto_optimize' })
                }
              }}
              style={{
                background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                padding: '8px 15px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔧 自动优化
            </button>
            
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#bbb',
                padding: '8px 15px',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              收起详情
            </button>
          </div>
        </div>
      )}

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes warning-pulse {
          0% { border-color: rgba(231, 76, 60, 0.4); }
          50% { border-color: rgba(231, 76, 60, 0.7); }
          100% { border-color: rgba(231, 76, 60, 0.4); }
        }
      `}</style>
    </div>
  )
}

export default DuplicateCardWarning
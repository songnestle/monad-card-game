import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './App.css'

const RPC_URL = import.meta.env.VITE_RPC_URL
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

const abi = [
  "function claimDailyCards() public payable",
  "function createHand(uint[5] cardIndexes) public",
  "function getMyCards() public view returns (tuple(uint id, string symbol, string name, uint rarity, uint baseScore, uint level, uint timestamp)[])",
  "function getMyActiveHand() public view returns (tuple(uint[5] cardIndexes, uint totalScore, uint timestamp, bool isActive))",
  "function getCurrentContest() public view returns (uint startTime, uint endTime, uint participantCount, uint prizePool)",
  "function participationFee() public view returns (uint)"
]

function SimpleApp() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [participationFee, setParticipationFee] = useState(0)
  const [activeHand, setActiveHand] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    if (!window.ethereum || !CONTRACT_ADDRESS) return
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const myCards = await contract.getMyCards()
      const myHand = await contract.getMyActiveHand()
      const fee = await contract.participationFee()
      
      setCards(myCards)
      setActiveHand(myHand)
      setParticipationFee(Number(fee))
      
      console.log('数据加载成功:', { cards: myCards.length, fee: ethers.formatEther(fee) })
    } catch (err) {
      console.error("加载数据失败:", err)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false)
      loadData()
    }, 2000)
  }, [])

  const handleClaimDailyCards = async () => {
    try {
      setLoading(true)
      
      if (!window.ethereum) {
        alert("请安装MetaMask钱包")
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const balance = await provider.getBalance(await signer.getAddress())
      if (balance < participationFee) {
        alert("ETH余额不足")
        return
      }

      const tx = await contract.claimDailyCards({ 
        value: participationFee,
        gasLimit: 500000
      })
      
      await tx.wait()
      await loadData()
      alert('成功领取5张卡牌！')
    } catch (err) {
      console.error("领取失败:", err)
      alert("领取失败：" + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const toggleCardSelection = (cardIndex) => {
    setSelectedCards(prev => {
      if (prev.includes(cardIndex)) {
        return prev.filter(index => index !== cardIndex)
      } else if (prev.length < 5) {
        return [...prev, cardIndex]
      }
      return prev
    })
  }

  const handleCreateHand = async () => {
    if (selectedCards.length !== 5) {
      alert('请选择正好5张卡牌')
      return
    }

    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const tx = await contract.createHand(selectedCards, {
        gasLimit: 500000
      })
      
      await tx.wait()
      setSelectedCards([])
      await loadData()
      alert('手牌创建成功！')
    } catch (err) {
      console.error('创建手牌失败:', err)
      alert('创建失败：' + (err.message || err))
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{
        background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '2rem'
      }}>
        <div>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎴</div>
          <div>正在加载魔法世界...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
      minHeight: '100vh',
      padding: '40px',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>
          🎴 Monad 卡牌世界
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.8 }}>
          参与费用: {ethers.formatEther(participationFee)} ETH | 卡牌数量: {cards.length} 张
        </p>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <button 
          onClick={handleClaimDailyCards} 
          disabled={loading}
          style={{
            background: loading ? '#666' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
            border: 'none',
            color: 'white',
            padding: '15px 30px',
            fontSize: '1.3rem',
            borderRadius: '25px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '20px'
          }}
        >
          {loading ? '处理中...' : `🎁 领取今日卡牌 (${ethers.formatEther(participationFee)} ETH)`}
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
          🎁 我的卡牌收藏 ({cards.length})
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '20px'
        }}>
          {cards.map((card, index) => (
            <div 
              key={index} 
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                border: '2px solid #4ECDC4',
                borderRadius: '15px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                💰
              </div>
              
              <h3 style={{ margin: '10px 0', color: '#4ECDC4' }}>
                {card.symbol} - {card.name}
              </h3>
              
              <div style={{ marginBottom: '15px' }}>
                <div>稀有度: {card.rarity}</div>
                <div>基础分数: {Number(card.baseScore)}</div>
                <div>等级: {Number(card.level)}</div>
              </div>
              
              <button
                onClick={() => toggleCardSelection(index)}
                disabled={selectedCards.length >= 5 && !selectedCards.includes(index)}
                style={{
                  background: selectedCards.includes(index) 
                    ? 'linear-gradient(45deg, #27AE60, #229954)' 
                    : selectedCards.length >= 5 
                      ? '#666' 
                      : 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                  border: 'none',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  cursor: (selectedCards.length >= 5 && !selectedCards.includes(index)) ? 'not-allowed' : 'pointer'
                }}
              >
                {selectedCards.includes(index) ? '✅ 已选择' : '🎯 选择卡牌'}
              </button>
            </div>
          ))}
        </div>

        {selectedCards.length === 5 && (
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button
              onClick={handleCreateHand}
              disabled={loading}
              style={{
                background: 'linear-gradient(45deg, #FFD700, #FF8C00)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.2rem',
                borderRadius: '25px',
                cursor: 'pointer'
              }}
            >
              🃏 创建手牌 (5/5)
            </button>
          </div>
        )}

        {activeHand && activeHand.isActive && (
          <div style={{
            background: 'rgba(39, 174, 96, 0.2)',
            padding: '20px',
            borderRadius: '15px',
            border: '2px solid #27AE60',
            textAlign: 'center',
            marginTop: '30px'
          }}>
            <h3 style={{ color: '#27AE60' }}>✅ 当前手牌</h3>
            <p>总分数: {activeHand.totalScore}</p>
            <p>卡牌索引: [{activeHand.cardIndexes.join(', ')}]</p>
          </div>
        )}

        {cards.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            fontSize: '1.2rem',
            marginTop: '50px'
          }}>
            还没有卡牌，先领取今日卡牌吧！🎁
          </div>
        )}
      </div>
    </div>
  )
}

export default SimpleApp
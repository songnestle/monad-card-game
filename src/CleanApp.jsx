import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import './App.css'

// 导入数据文件而不是内联
import { cryptoCards, rarityNames } from './cryptoCards.js'

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

function CleanApp() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [participationFee, setParticipationFee] = useState(0)
  const [activeHand, setActiveHand] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [currentTab, setCurrentTab] = useState('cards')
  const [contestInfo, setContestInfo] = useState(null)
  const [dailyCardsReceived, setDailyCardsReceived] = useState(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [account, setAccount] = useState('')

  // 连接钱包
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert("请安装MetaMask钱包")
        return
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAccount(accounts[0])
      setWalletConnected(true)
      
      // 检查网络
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      if (parseInt(chainId, 16) !== 10143) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x279f' }]
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x279f',
                chainName: 'Monad Testnet',
                nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
                rpcUrls: ['https://testnet-rpc.monad.xyz'],
                blockExplorerUrls: ['https://testnet-explorer.monad.xyz']
              }]
            })
          }
        }
      }
      
      await loadData()
    } catch (error) {
      console.error("钱包连接失败:", error)
      alert("钱包连接失败: " + error.message)
    }
  }

  // 加载合约数据
  const loadData = useCallback(async () => {
    if (!window.ethereum || !CONTRACT_ADDRESS || !walletConnected) return

    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const [myCards, fee, contest] = await Promise.all([
        contract.getMyCards().catch(() => []),
        contract.participationFee().catch(() => 0),
        contract.getCurrentContest().catch(() => null)
      ])

      setCards(Array.from(myCards || []))
      setParticipationFee(Number(fee))
      setContestInfo(contest ? {
        participantCount: Number(contest.participantCount),
        prizePool: Number(contest.prizePool)
      } : null)

    } catch (err) {
      console.error("加载数据失败:", err)
    } finally {
      setLoading(false)
    }
  }, [walletConnected])

  // 领取每日卡牌
  const handleClaimDailyCards = async () => {
    if (!walletConnected) {
      await connectWallet()
      return
    }

    try {
      setLoading(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const tx = await contract.claimDailyCards({ 
        value: participationFee,
        gasLimit: 500000
      })
      
      await tx.wait()
      setDailyCardsReceived(true)
      await loadData()
      alert('🎉 卡牌领取成功!')
      
    } catch (err) {
      console.error("领取卡牌失败:", err)
      if (err.reason?.includes("Already claimed")) {
        alert("今日已领取过卡牌！")
        setDailyCardsReceived(true)
      } else {
        alert("领取失败：" + (err.reason || err.message))
      }
    } finally {
      setLoading(false)
    }
  }

  // 选择卡牌
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

  // 创建手牌
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

      const tx = await contract.createHand(selectedCards, { gasLimit: 500000 })
      await tx.wait()
      
      setSelectedCards([])
      await loadData()
      alert('🃏 手牌创建成功！')
      
    } catch (err) {
      console.error('创建手牌失败:', err)
      alert('创建失败：' + (err.reason || err.message))
    } finally {
      setLoading(false)
    }
  }

  // 获取卡牌信息
  const getCardInfo = (card) => {
    const cardData = cryptoCards.find(c => c.symbol === card.symbol) || {}
    return {
      emoji: cardData.emoji || '💰',
      color: cardData.color || '#666',
      name: cardData.name || card.name || card.symbol
    }
  }

  useEffect(() => {
    // 检查是否已连接
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0) {
            setAccount(accounts[0])
            setWalletConnected(true)
            loadData()
          }
        })
    }
  }, [loadData])

  return (
    <div style={{ 
      padding: 40, 
      minHeight: '100vh',
      background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* 标题 */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ 
          fontSize: '3rem',
          background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 10
        }}>
          🎴 Monad 卡牌世界
        </h1>
        <p style={{ color: '#bbb', fontSize: '1.2rem' }}>
          {walletConnected ? (
            <>地址: {account.slice(0,8)}... | 卡牌: {cards.length} 张</>
          ) : (
            '连接钱包开始游戏'
          )}
        </p>
      </div>

      {/* 连接钱包按钮 */}
      {!walletConnected && (
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <button 
            onClick={connectWallet}
            style={{
              background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
              border: 'none',
              color: 'white',
              padding: '15px 30px',
              fontSize: '1.3rem',
              borderRadius: '25px',
              cursor: 'pointer'
            }}
          >
            🔗 连接MetaMask钱包
          </button>
        </div>
      )}

      {/* 主要内容 */}
      {walletConnected && (
        <>
          {/* 领取卡牌按钮 */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <button 
              onClick={handleClaimDailyCards}
              disabled={loading || dailyCardsReceived}
              style={{
                background: loading ? '#666' : dailyCardsReceived ? '#28a745' : 'linear-gradient(45deg, #FF6B6B, #4ECDC4)',
                border: 'none',
                color: 'white',
                padding: '15px 30px',
                fontSize: '1.3rem',
                borderRadius: '25px',
                cursor: (loading || dailyCardsReceived) ? 'not-allowed' : 'pointer',
                marginRight: '20px'
              }}
            >
              {loading ? '⏳ 处理中...' : dailyCardsReceived ? '✅ 今日已领取' : `🎁 领取今日卡牌`}
            </button>
          </div>

          {/* 标签页 */}
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            {['cards', 'contest'].map(tab => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                style={{
                  background: currentTab === tab ? 'linear-gradient(45deg, #9B59B6, #8E44AD)' : '#666',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  margin: '0 10px',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                {tab === 'cards' ? '🎁 我的卡牌' : '🏆 赛事'}
              </button>
            ))}
          </div>

          {/* 卡牌展示 */}
          {currentTab === 'cards' && (
            <div>
              <h2 style={{ textAlign: 'center', marginBottom: 30, color: '#FFD700' }}>
                🎁 我的卡牌收藏 ({cards.length})
              </h2>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '20px',
                maxWidth: '1200px',
                margin: '0 auto'
              }}>
                {cards.map((card, index) => {
                  const info = getCardInfo(card)
                  const rarity = rarityNames[Number(card.rarity)] || "未知"
                  
                  return (
                    <div 
                      key={index}
                      onClick={() => toggleCardSelection(index)}
                      style={{
                        background: `linear-gradient(135deg, ${info.color}20, ${info.color}10)`,
                        border: `3px solid ${selectedCards.includes(index) ? '#27AE60' : info.color}`,
                        borderRadius: '15px',
                        padding: '20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transform: selectedCards.includes(index) ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                        {info.emoji}
                      </div>
                      
                      <h3 style={{ margin: '10px 0', color: info.color }}>
                        {card.symbol} - {info.name}
                      </h3>
                      
                      <div style={{ 
                        fontSize: '0.9rem', 
                        color: info.color,
                        fontWeight: 'bold',
                        marginBottom: '15px'
                      }}>
                        {rarity} - 分数: {Number(card.baseScore)}
                      </div>
                      
                      <div style={{
                        background: selectedCards.includes(index) ? '#27AE60' : '#4ECDC4',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '0.9rem'
                      }}>
                        {selectedCards.includes(index) ? '✅ 已选择' : '🎯 点击选择'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 创建手牌按钮 */}
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
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? '⏳ 创建中...' : '🃏 创建手牌 (5/5)'}
                  </button>
                </div>
              )}

              {cards.length === 0 && !loading && (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#666', 
                  fontSize: '1.2rem',
                  marginTop: '50px'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎴</div>
                  <h3 style={{ color: '#FFD700' }}>暂无卡牌</h3>
                  <p>点击上方按钮领取你的第一批卡牌！</p>
                </div>
              )}
            </div>
          )}

          {/* 赛事信息 */}
          {currentTab === 'contest' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ color: '#FFD700', marginBottom: 30 }}>🏆 当前赛事</h2>
              {contestInfo ? (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid #667eea',
                  borderRadius: '20px',
                  padding: '30px',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}>
                  <p>🏃‍♂️ 参与人数: {contestInfo.participantCount}</p>
                  <p>💰 奖金池: {ethers.formatEther(contestInfo.prizePool)} MON</p>
                  {activeHand ? (
                    <p style={{ color: '#27AE60' }}>✅ 已参与赛事</p>
                  ) : (
                    <p style={{ color: '#E74C3C' }}>⚠️ 请先创建手牌参与赛事</p>
                  )}
                </div>
              ) : (
                <p>暂无赛事信息</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default CleanApp
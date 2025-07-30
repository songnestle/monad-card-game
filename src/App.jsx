import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './App.css'

// 内联加密货币卡牌数据
const cryptoCards = [
  { id: 1, symbol: 'BTC', name: 'Bitcoin', rarity: 5, emoji: '₿', color: '#F7931A' },
  { id: 2, symbol: 'ETH', name: 'Ethereum', rarity: 5, emoji: 'Ξ', color: '#627EEA' },
  { id: 3, symbol: 'SOL', name: 'Solana', rarity: 4, emoji: '◎', color: '#9945FF' },
  { id: 4, symbol: 'ADA', name: 'Cardano', rarity: 4, emoji: '₳', color: '#0033AD' },
  { id: 5, symbol: 'AVAX', name: 'Avalanche', rarity: 4, emoji: '🔺', color: '#E84142' },
  { id: 6, symbol: 'DOT', name: 'Polkadot', rarity: 4, emoji: '⚫', color: '#E6007A' },
  { id: 7, symbol: 'MATIC', name: 'Polygon', rarity: 3, emoji: '🔷', color: '#8247E5' },
  { id: 8, symbol: 'LTC', name: 'Litecoin', rarity: 3, emoji: 'Ł', color: '#A6A9AA' },
  { id: 9, symbol: 'LINK', name: 'Chainlink', rarity: 3, emoji: '🔗', color: '#375BD2' },
  { id: 10, symbol: 'UNI', name: 'Uniswap', rarity: 3, emoji: '🦄', color: '#FF007A' },
  { id: 11, symbol: 'ATOM', name: 'Cosmos', rarity: 3, emoji: '🪐', color: '#2E3148' },
  { id: 12, symbol: 'FTM', name: 'Fantom', rarity: 3, emoji: '👻', color: '#1969FF' },
  { id: 13, symbol: 'ALGO', name: 'Algorand', rarity: 2, emoji: '🔺', color: '#000000' },
  { id: 14, symbol: 'VET', name: 'VeChain', rarity: 2, emoji: '✅', color: '#15BDFF' },
  { id: 15, symbol: 'XLM', name: 'Stellar', rarity: 2, emoji: '🌟', color: '#7D00FF' },
  { id: 16, symbol: 'ICP', name: 'Internet Computer', rarity: 2, emoji: '♾️', color: '#29ABE2' },
  { id: 17, symbol: 'THETA', name: 'Theta Network', rarity: 2, emoji: '📺', color: '#2AB8E6' },
  { id: 18, symbol: 'FIL', name: 'Filecoin', rarity: 2, emoji: '📁', color: '#0090FF' },
  { id: 19, symbol: 'XTZ', name: 'Tezos', rarity: 2, emoji: '🔷', color: '#2C7DF7' },
  { id: 20, symbol: 'EGLD', name: 'MultiversX', rarity: 2, emoji: '⚡', color: '#23F7DD' },
  { id: 21, symbol: 'HBAR', name: 'Hedera', rarity: 1, emoji: '🌐', color: '#FF0000' },
  { id: 22, symbol: 'NEAR', name: 'NEAR Protocol', rarity: 1, emoji: '🌈', color: '#00C08B' },
  { id: 23, symbol: 'FLOW', name: 'Flow', rarity: 1, emoji: '🌊', color: '#00EF8B' },
  { id: 24, symbol: 'MANA', name: 'Decentraland', rarity: 1, emoji: '🏰', color: '#FF2D55' },
  { id: 25, symbol: 'SAND', name: 'The Sandbox', rarity: 1, emoji: '🏖️', color: '#00ADEF' }
];

const rarityNames = {
  1: "普通",
  2: "稀有", 
  3: "史诗",
  4: "传说",
  5: "神话"
};

// 内联价格模拟器类
class PriceSimulator {
  constructor() {
    this.prices = {};
    this.volatility = {};
    this.trends = {};
    this.lastUpdate = Date.now();
    
    // 初始化所有加密货币的价格
    cryptoCards.forEach(card => {
      this.prices[card.id] = this.getInitialPrice(card.rarity);
      this.volatility[card.id] = this.getVolatility(card.rarity);
      this.trends[card.id] = Math.random() > 0.5 ? 1 : -1; // 1为上涨趋势，-1为下跌趋势
    });
  }
  
  getInitialPrice(rarity) {
    const basePrices = {
      1: 100 + Math.random() * 500,    // 普通: 100-600
      2: 500 + Math.random() * 1500,   // 稀有: 500-2000  
      3: 1500 + Math.random() * 3500,  // 史诗: 1500-5000
      4: 5000 + Math.random() * 15000, // 传说: 5000-20000
      5: 20000 + Math.random() * 30000 // 神话: 20000-50000
    };
    return basePrices[rarity] || 100;
  }
  
  getVolatility(rarity) {
    const volatilityMap = {
      1: 0.05, // 普通卡牌波动较小
      2: 0.08,
      3: 0.12,
      4: 0.15,
      5: 0.20  // 神话卡牌波动最大
    };
    return volatilityMap[rarity] || 0.05;
  }
  
  updatePrice(cardId) {
    const currentPrice = this.prices[cardId];
    const volatility = this.volatility[cardId];
    const trend = this.trends[cardId];
    
    // 随机价格变化，包含趋势影响
    const randomChange = (Math.random() - 0.5) * 2; // -1 到 1
    const trendInfluence = trend * 0.3; // 趋势影响
    const totalChange = randomChange + trendInfluence;
    
    const changePercent = totalChange * volatility;
    const newPrice = currentPrice * (1 + changePercent);
    
    // 确保价格不会变成负数或过小
    this.prices[cardId] = Math.max(newPrice, currentPrice * 0.5);
    
    // 随机改变趋势
    if (Math.random() < 0.1) { // 10%概率改变趋势
      this.trends[cardId] *= -1;
    }
    
    return {
      cardId,
      oldPrice: currentPrice,
      newPrice: this.prices[cardId],
      change: changePercent
    };
  }
  
  updateAllPrices() {
    const changes = [];
    const now = Date.now();
    
    // 只有距离上次更新超过1秒才更新
    if (now - this.lastUpdate > 1000) {
      cryptoCards.forEach(card => {
        changes.push(this.updatePrice(card.id));
      });
      this.lastUpdate = now;
    }
    
    return changes;
  }
  
  getPrice(cardId) {
    return this.prices[cardId] || 0;
  }
  
  getMarketOverview() {
    const totalMarketCap = Object.values(this.prices).reduce((sum, price) => sum + price, 0);
    const avgPrice = totalMarketCap / Object.keys(this.prices).length;
    
    return {
      totalMarketCap: totalMarketCap.toFixed(2),
      avgPrice: avgPrice.toFixed(2),
      activePairs: Object.keys(this.prices).length
    };
  }
}

const RPC_URL = import.meta.env.VITE_RPC_URL
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS

const abi = [
  "function claimDailyCards() public payable",
  "function createHand(uint[5] cardIndexes) public",
  "function getMyCards() public view returns (tuple(uint id, string symbol, string name, uint rarity, uint baseScore, uint level, uint timestamp)[])",
  "function getMyActiveHand() public view returns (tuple(uint[5] cardIndexes, uint totalScore, uint timestamp, bool isActive))",
  "function getCurrentContest() public view returns (uint startTime, uint endTime, uint participantCount, uint prizePool)",
  "function getContestLeaderboard(uint day) public view returns (address[] players, uint[] scores)",
  "function participationFee() public view returns (uint)",
  "function currentContestDay() public view returns (uint)"
]

// 创建卡牌信息映射
const cardInfo = {}
cryptoCards.forEach(card => {
  cardInfo[card.id] = {
    symbol: card.symbol,
    emoji: card.emoji,
    color: card.color,
    name: card.name
  }
})

// 添加symbol到信息的映射
const symbolToInfo = {}
cryptoCards.forEach(card => {
  symbolToInfo[card.symbol] = {
    emoji: card.emoji,
    color: card.color,
    name: card.name
  }
})

// rarityNames 已从 cryptoCards.js 导入

function App() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [participationFee, setParticipationFee] = useState(0)
  const [activeHand, setActiveHand] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [currentTab, setCurrentTab] = useState('cards') // 'cards', 'contest', 'leaderboard'
  const [contestInfo, setContestInfo] = useState(null)
  const [leaderboard, setLeaderboard] = useState({ players: [], scores: [] })
  const [newCardAnimation, setNewCardAnimation] = useState(null)
  const [showParticles, setShowParticles] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [achievements, setAchievements] = useState([])
  const [theme, setTheme] = useState('dark')
  const [dailyCardsReceived, setDailyCardsReceived] = useState(false)
  const [priceSimulator] = useState(new PriceSimulator())
  const [currentPrices, setCurrentPrices] = useState({})
  const [priceChanges, setPriceChanges] = useState({})
  const [marketOverview, setMarketOverview] = useState(null)

  const loadData = async () => {
    if (!window.ethereum || !CONTRACT_ADDRESS) {
      console.log('钱包或合约地址未配置')
      return
    }
    
    try {
      setLoading(true)
      console.log('开始加载数据...')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      const myCards = await contract.getMyCards()
      const myHand = await contract.getMyActiveHand()
      const fee = await contract.participationFee()
      const contest = await contract.getCurrentContest()
      const currentDay = await contract.currentContestDay()
      
      // 获取排行榜
      const leaderboardData = await contract.getContestLeaderboard(currentDay)
      
      // 检测是否有新卡牌
      if (myCards.length > cards.length) {
        setNewCardAnimation(myCards.length - 1)
        setTimeout(() => setNewCardAnimation(null), 1000)
        
        // 检查成就
        checkAchievements(myCards)
      }
      
      setCards(myCards)
      setActiveHand(myHand)
      setParticipationFee(Number(fee))
      setContestInfo({
        startTime: Number(contest.startTime),
        endTime: Number(contest.endTime),
        participantCount: Number(contest.participantCount),
        prizePool: Number(contest.prizePool)
      })
      setLeaderboard({
        players: leaderboardData.players,
        scores: leaderboardData.scores.map(s => Number(s))
      })
      console.log('数据加载完成')
    } catch (err) {
      console.error("加载数据失败:", err)
      // 不显示错误弹窗，只在控制台记录
    } finally {
      setLoading(false)
    }
  }

  // 成就检查函数
  const checkAchievements = (cards) => {
    const newAchievements = []
    
    // 首次获得卡牌
    if (cards.length === 5) {
      newAchievements.push({ id: 'first_cards', text: '🎉 获得首批卡牌！' })
    }
    
    // 收集成就
    if (cards.length === 25) {
      newAchievements.push({ id: 'collector', text: '🎁 收藏家！收集25张卡牌' })
    }
    
    // 神话卡牌成就
    const mythicCards = cards.filter(card => card.rarity === 5)
    if (mythicCards.length === 1) {
      newAchievements.push({ id: 'mythic', text: '✨ 神话传说！获得神话卡牌' })
    }
    
    // BTC成就
    const btcCards = cards.filter(card => card.symbol === 'BTC')
    if (btcCards.length === 1) {
      newAchievements.push({ id: 'bitcoin', text: '₿ Bitcoin Master！获得BTC卡牌' })
    }
    
    // 显示新成就
    newAchievements.forEach((achievement, index) => {
      if (!achievements.find(a => a.id === achievement.id)) {
        setTimeout(() => {
          setAchievements(prev => [...prev, achievement])
          setTimeout(() => {
            setAchievements(prev => prev.filter(a => a.id !== achievement.id))
          }, 3000)
        }, index * 1000)
      }
    })
  }

  useEffect(() => {
    // 启动动画
    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    
    // 延迟加载数据
    setTimeout(() => {
      loadData()
    }, 1000)
    
    // 初始化价格数据
    updatePrices()
    
    // 每30秒更新一次价格
    const priceInterval = setInterval(updatePrices, 30000)
    
    return () => clearInterval(priceInterval)
  }, [])

  // 价格更新函数
  const updatePrices = async () => {
    const changes = priceSimulator.updateAllPrices()
    const prices = {}
    const changeMap = {}
    
    changes.forEach(change => {
      prices[change.cardId] = change.newPrice
      changeMap[change.cardId] = change.change
    })
    
    setCurrentPrices(prices)
    setPriceChanges(changeMap)
    setMarketOverview(priceSimulator.getMarketOverview())
    
    console.log('价格更新:', changes.length, '个币种')
  }

  // 选择卡牌函数
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

  // 创建手牌函数
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

      console.log('创建手牌:', selectedCards)
      const tx = await contract.createHand(selectedCards, {
        gasLimit: 500000
      })
      
      await tx.wait()
      console.log('手牌创建成功')
      
      // 重置选择
      setSelectedCards([])
      
      // 重新加载数据
      await loadData()
      
      alert('手牌创建成功！已自动参与当前赛事')
    } catch (err) {
      console.error('创建手牌失败:', err)
      alert('创建失败：' + (err.reason || err.message || err))
    } finally {
      setLoading(false)
    }
  }

  const handleClaimDailyCards = async () => {
    try {
      setLoading(true)
      
      // 检查钱包连接
      if (!window.ethereum) {
        alert("请安装MetaMask钱包")
        return
      }
      
      // 检查合约地址
      if (!CONTRACT_ADDRESS) {
        alert("合约地址未配置，请检查.env文件")
        return
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer)

      // 检查网络
      const network = await provider.getNetwork()
      if (network.chainId !== 10143n) {
        alert("请切换到Monad测试网 (链 ID: 10143)")
        return
      }

      // 检查余额 - 使用MON代币
      const balance = await provider.getBalance(await signer.getAddress())
      if (balance < participationFee) {
        alert("MON余额不足，需要至少 " + ethers.formatEther(participationFee) + " MON")
        return
      }

      console.log("发送领取交易，费用:", ethers.formatEther(participationFee), "MON")
      
      // 开始粒子效果
      setShowParticles(true)
      
      const tx = await contract.claimDailyCards({ 
        value: participationFee,
        gasLimit: 500000
      })
      
      console.log("交易已发送，哈希:", tx.hash)
      await tx.wait()
      console.log("交易已确认")

      setDailyCardsReceived(true)
      
      // 延迟加载数据以显示动画
      setTimeout(async () => {
        await loadData()
        setShowParticles(false)
      }, 500)
    } catch (err) {
      console.error("领取卡牌错误:", err)
      if (err.code === 4001) {
        alert("用户取消了交易")
      } else if (err.reason && err.reason.includes("Already claimed")) {
        alert("今日已领取过卡牌！")
        setDailyCardsReceived(true)
      } else {
        alert("领取失败：" + (err.reason || err.message || err))
      }
    } finally {
      setLoading(false)
    }
  }

  // 移除旧的战斗相关函数，替换为手牌管理函数

  // 粒子组件
  const ParticleEffect = () => (
    <div className="particles">
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  )

  // 启动屏幕组件
  const LoadingScreen = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(-45deg, #1a1a2e, #16213e, #0f3460, #1a1a2e)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 3s ease infinite',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      color: 'white'
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '30px',
        animation: 'glow 2s ease-in-out infinite alternate'
      }}>
        🎴
      </div>
      <h1 style={{
        fontSize: '3rem',
        background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '20px',
        animation: 'fadeInUp 1s ease-out'
      }}>
        Monad 卡牌世界
      </h1>
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px'
      }}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '15px',
              height: '15px',
              background: '#FFD700',
              borderRadius: '50%',
              animation: `pulse 1.5s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
      </div>
      <p style={{
        fontSize: '1.2rem',
        opacity: 0.8,
        animation: 'fadeIn 2s ease-out'
      }}>
        正在加载魔法世界...
      </p>
    </div>
  )

  // 统计面板组件
  const StatsPanel = () => {
    const rarityStats = cards.reduce((acc, card) => {
      acc[card.rarity] = (acc[card.rarity] || 0) + 1
      return acc
    }, {})

    return (
      <div className="stats-panel">
        <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>📊 统计数据</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: '#4ECDC4' }}>{cards.length}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>卡牌总数</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: '#FF6B6B' }}>{selectedCards.length}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>已选卡牌</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: '#FFD700' }}>{activeHand ? activeHand.totalScore : 0}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>手牌得分</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', color: '#9B59B6' }}>{rarityStats[5] || 0}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>神话卡牌</div>
          </div>
        </div>
      </div>
    )
  }

  // 成就通知组件
  const AchievementNotification = ({ achievement }) => (
    <div className="achievement-popup">
      {achievement.text}
    </div>
  )

  // 主题切换按钮
  const ThemeToggle = () => (
    <button
      className="animated-button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: theme === 'dark' ? '#FFD700' : '#1a1a2e',
        color: theme === 'dark' ? '#000' : '#FFD700',
        border: 'none',
        padding: '10px',
        borderRadius: '50%',
        fontSize: '1.2rem',
        cursor: 'pointer',
        zIndex: 1000
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )

  // 战斗结果通知组件
  const BattleResultNotification = ({ result }) => (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 1000,
      padding: '30px',
      borderRadius: '20px',
      background: result.isWinner 
        ? 'linear-gradient(45deg, #27AE60, #2ECC71)'
        : 'linear-gradient(45deg, #E74C3C, #C0392B)',
      color: 'white',
      fontSize: '2rem',
      fontWeight: 'bold',
      textAlign: 'center',
      animation: result.isWinner ? 'victory 0.6s ease-in-out' : 'defeat 0.6s ease-in-out',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
    }}>
      {result.isWinner ? '🏆 胜利！' : '💀 失败！'}
      <div style={{ fontSize: '1rem', marginTop: '10px', opacity: 0.9 }}>
        战斗 #{result.battleId}
      </div>
    </div>
  )

  // 显示启动屏幕
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className={`animated-background theme-${theme} theme-transition`} style={{ 
      padding: 40, 
      minHeight: '100vh',
      width: '100vw',
      margin: 0,
      color: theme === 'dark' ? 'white' : '#333',
      fontFamily: 'Arial, sans-serif',
      position: 'relative',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 className="glow-text" style={{ 
          fontSize: '3rem', 
          background: 'linear-gradient(45deg, #FFD700, #FF6B6B)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 10
        }}>
          🎴 Monad 卡牌世界
        </h1>
        <p style={{ color: '#bbb', fontSize: '1.2rem' }}>
          参与费用: {ethers.formatEther(participationFee)} MON | 
          卡牌数量: {cards.length} 张 | 
          {contestInfo && (
            <>当前赛事: {contestInfo.participantCount} 人参与</>
          )}
        </p>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <button 
          className={`animated-button ripple ${loading ? 'pulse' : ''}`}
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
            boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
            marginRight: '20px'
          }}
        >
          {loading ? (
            <>
              <span className="loading-spinner">✨</span> 领取中...
            </>
          ) : dailyCardsReceived ? (
            '✅ 今日已领取'
          ) : (
            `🎁 领取今日卡牌 (${ethers.formatEther(participationFee)} MON)`
          )}
        </button>
      </div>

      {/* 标签页导航 */}
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        {['cards', 'contest', 'leaderboard'].map(tab => (
          <button
            key={tab}
            className={`tab-button animated-button ${currentTab === tab ? 'active' : ''}`}
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
            {tab === 'cards' ? '🎁 我的卡牌' : tab === 'contest' ? '🏆 赛事' : '📈 排行榜'}
          </button>
        ))}
      </div>

      {/* 卡牌收藏页面 */}
      {currentTab === 'cards' && (
        <div className="page-transition">
          <h2 style={{ textAlign: 'center', marginBottom: 30, color: '#FFD700' }}>
            🎁 我的卡牌收藏 ({cards.length})
          </h2>
          
          <StatsPanel />
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {cards.map((card, index) => {
              // 优先使用cardInfo，如果没有则使用symbolToInfo，最后使用默认值
              const info = cardInfo[card.id] || symbolToInfo[card.symbol] || { 
                symbol: card.symbol, 
                emoji: '💰', 
                color: '#666', 
                name: card.name || card.symbol 
              }
              const rarity = rarityNames[Number(card.rarity)] || "未知"
              const isNewCard = newCardAnimation === index
              
              return (
                <div 
                  key={index} 
                  className={`card-item card-flip card-rarity-${card.rarity} ${isNewCard ? 'draw-card-animation' : ''}`}
                  style={{
                    background: `linear-gradient(135deg, ${info.color}20, ${info.color}10)`,
                    border: `3px solid ${info.color}`,
                    borderRadius: '15px',
                    padding: '20px',
                    textAlign: 'center',
                    position: 'relative',
                    cursor: 'pointer'
                  }}
                >
                  <div className="card-flip-inner">
                    <div className="card-flip-front">
                      <div style={{ 
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                    background: info.color,
                    color: 'white',
                    padding: '5px 10px',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold'
                  }}>
                    Lv.{Number(card.level)}
                  </div>
                  
                  <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                    {info.emoji}
                  </div>
                  
                  <h3 style={{ margin: '10px 0', color: info.color }}>
                    {card.symbol} - {info.name || card.name}
                  </h3>
                  
                  <div style={{ 
                    fontSize: '0.9rem', 
                    color: info.color,
                    fontWeight: 'bold',
                    marginBottom: '15px'
                  }}>
                    {rarity}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '15px',
                    fontSize: '0.9rem'
                  }}>
                    <span style={{ color: '#ff6b6b' }}>
                      💰 {Number(card.baseScore)}
                    </span>
                    <span style={{ color: '#4ecdc4' }}>
                      ⭐ Lv.{Number(card.level)}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <button
                      className={`animated-button ${selectedCards.includes(index) ? 'selected' : ''}`}
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
                </div>
                
                <div className="card-flip-back">
                  <div>
                    <div style={{ fontSize: '1.2rem', marginBottom: '10px' }}>
                      💰 总分: {Number(card.baseScore || 0) + (Number(card.level || 1) * 5)}
                    </div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '10px' }}>
                      获得时间: {card.timestamp ? new Date(Number(card.timestamp) * 1000).toLocaleDateString() : '未知'}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                      点击选择加入手牌
                    </div>
                  </div>
                </div>
              </div>
            </div>
              )
            })}
          </div>
          
          {/* 手牌创建按钮 */}
          {selectedCards.length === 5 && (
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <button
                className="animated-button"
                onClick={handleCreateHand}
                style={{
                  background: 'linear-gradient(45deg, #FFD700, #FF8C00)',
                  border: 'none',
                  color: 'white',
                  padding: '15px 30px',
                  fontSize: '1.2rem',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)'
                }}
              >
                🃏 创建手牌 (5/5)
              </button>
            </div>
          )}
          
          {cards.length === 0 && !loading && (
            <div style={{ 
              textAlign: 'center', 
              color: '#666', 
              fontSize: '1.2rem',
              marginTop: '50px',
              padding: '40px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              border: '2px dashed #666'
            }}>
              <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🎴</div>
              <h3 style={{ color: '#FFD700', marginBottom: '15px' }}>暂无卡牌</h3>
              <p>连接钱包并领取你的第一批卡牌开始游戏！🎁</p>
            </div>
          )}
        </div>
      )}

      {/* 赛事页面 */}
      {currentTab === 'contest' && (
        <div className="page-transition">
          <h2 style={{ textAlign: 'center', marginBottom: 30, color: '#FFD700' }}>
            🏆 当前赛事
          </h2>
          
          {contestInfo && (
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea20, #764ba210)',
              border: '2px solid #667eea',
              borderRadius: '20px',
              padding: '30px',
              textAlign: 'center',
              marginBottom: '30px',
              maxWidth: '800px',
              margin: '0 auto 30px'
            }}>
              <h3 style={{ color: '#FFD700', marginBottom: '20px' }}>赛事信息</h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <div style={{ fontSize: '1.5rem', color: '#4ECDC4' }}>{contestInfo.participantCount}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>参与人数</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', color: '#FF6B6B' }}>{ethers.formatEther(contestInfo.prizePool)} MON</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>奖金池</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', color: '#FFD700' }}>
                    {Math.max(0, Math.floor((contestInfo.endTime - Date.now() / 1000) / 3600))}h
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>剩余时间</div>
                </div>
              </div>
              
              {activeHand && activeHand.isActive ? (
                <div style={{ 
                  background: 'rgba(39, 174, 96, 0.2)',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '1px solid #27AE60'
                }}>
                  <div style={{ color: '#27AE60', fontWeight: 'bold', marginBottom: '10px' }}>
                    ✅ 已参与赛事
                  </div>
                  <div style={{ fontSize: '1.2rem' }}>
                    当前手牌得分: <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{activeHand.totalScore}</span>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  background: 'rgba(231, 76, 60, 0.2)',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '1px solid #E74C3C'
                }}>
                  <div style={{ color: '#E74C3C' }}>
                    ⚠️ 未参与赛事 - 请先创建5张卡牌的手牌
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 排行榜页面 */}
      {currentTab === 'leaderboard' && (
        <div className="page-transition">
          <h2 style={{ textAlign: 'center', marginBottom: 30, color: '#FFD700' }}>
            📈 赛事排行榜
          </h2>
          
          {leaderboard.players.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#666', 
              fontSize: '1.2rem',
              marginTop: '50px'
            }}>
              暂无排行榜数据
            </div>
          ) : (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {leaderboard.players.map((player, index) => (
                <div 
                  key={player}
                  style={{
                    background: index === 0 ? 'linear-gradient(135deg, #FFD70020, #FF840010)' :
                               index === 1 ? 'linear-gradient(135deg, #C0C0C020, #A8A8A810)' :
                               index === 2 ? 'linear-gradient(135deg, #CD7F3220, #B8731810)' :
                               'linear-gradient(135deg, #66666620, #44444410)',
                    border: `2px solid ${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666'}`,
                    borderRadius: '15px',
                    padding: '20px',
                    marginBottom: '15px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ 
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666'
                    }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {player.slice(0, 6)}...{player.slice(-4)}
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                        {index < 3 ? '🏆 Winner' : 'Participant'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '1.3rem', 
                      fontWeight: 'bold',
                      color: '#4ECDC4'
                    }}>
                      {leaderboard.scores[index]}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>得分</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 动画效果 */}
      {showParticles && <ParticleEffect />}
      
      {/* UI组件 */}
      <ThemeToggle />
      {achievements.map(achievement => (
        <AchievementNotification key={achievement.id} achievement={achievement} />
      ))}
    </div>
  )
}

export default App

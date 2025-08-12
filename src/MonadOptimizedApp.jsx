import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ethers } from 'ethers'
import './App.css'

// Monad 测试网配置
const MONAD_CONFIG = {
  chainId: '0x27AF', // 10143 in hex
  chainName: 'Monad Testnet',
  rpcUrls: ['https://testnet.monad.network'],
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MONAD',
    decimals: 18
  },
  blockExplorerUrls: ['https://testnet-explorer.monad.network']
}

// 合约地址和 ABI
const CONTRACT_ADDRESS = '0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030'
const CONTRACT_ABI = [
  "function submitHand(string[] memory cardSymbols) external payable",
  "function getPlayerHand(address player) external view returns (string[] memory cardSymbols, uint256 submissionTime, bool isLocked)",
  "function canReselect(address player) public view returns (bool)",
  "function getUnlockTime(address player) external view returns (uint256)",
  "function getPlayerScore(address player) external view returns (uint256)",
  "function hasSubmittedHand(address player) external view returns (bool)",
  "function getContractBalance() external view returns (uint256)",
  "function getAllPlayers() external view returns (address[] memory)",
  "function getPlayerCount() external view returns (uint256)",
  "event HandSubmitted(address indexed player, string[] cardSymbols, uint256 timestamp)"
]

// 加密货币卡牌数据
const CRYPTO_CARDS = [
  // 稀有卡 (Top 10)
  { id: 1, symbol: 'BTC', name: 'Bitcoin', rarity: 'rare', emoji: '₿', color: '#F7931A', basePrice: 45000 },
  { id: 2, symbol: 'ETH', name: 'Ethereum', rarity: 'rare', emoji: 'Ξ', color: '#627EEA', basePrice: 3000 },
  { id: 3, symbol: 'USDT', name: 'Tether', rarity: 'rare', emoji: '💵', color: '#26A17B', basePrice: 1 },
  { id: 4, symbol: 'BNB', name: 'BNB', rarity: 'rare', emoji: '🟡', color: '#F3BA2F', basePrice: 300 },
  { id: 5, symbol: 'SOL', name: 'Solana', rarity: 'rare', emoji: '◎', color: '#9945FF', basePrice: 110 },
  { id: 6, symbol: 'USDC', name: 'USD Coin', rarity: 'rare', emoji: '🔵', color: '#2775CA', basePrice: 1 },
  { id: 7, symbol: 'XRP', name: 'Ripple', rarity: 'rare', emoji: '💧', color: '#23292F', basePrice: 0.55 },
  { id: 8, symbol: 'TON', name: 'Toncoin', rarity: 'rare', emoji: '💎', color: '#0088CC', basePrice: 2.35 },
  { id: 9, symbol: 'DOGE', name: 'Dogecoin', rarity: 'rare', emoji: '🐕', color: '#C2A633', basePrice: 0.085 },
  { id: 10, symbol: 'ADA', name: 'Cardano', rarity: 'rare', emoji: '₳', color: '#0033AD', basePrice: 0.42 },
  
  // 非凡卡 (11-20)
  { id: 11, symbol: 'AVAX', name: 'Avalanche', rarity: 'uncommon', emoji: '🔺', color: '#E84142', basePrice: 18 },
  { id: 12, symbol: 'SHIB', name: 'Shiba Inu', rarity: 'uncommon', emoji: '🐕‍🦺', color: '#FFA409', basePrice: 0.000012 },
  { id: 13, symbol: 'DOT', name: 'Polkadot', rarity: 'uncommon', emoji: '⚫', color: '#E6007A', basePrice: 7.5 },
  { id: 14, symbol: 'LINK', name: 'Chainlink', rarity: 'uncommon', emoji: '🔗', color: '#375BD2', basePrice: 15 },
  { id: 15, symbol: 'TRX', name: 'TRON', rarity: 'uncommon', emoji: '⚡', color: '#FF0013', basePrice: 0.10 },
  { id: 16, symbol: 'MATIC', name: 'Polygon', rarity: 'uncommon', emoji: '🔷', color: '#8247E5', basePrice: 1.1 },
  { id: 17, symbol: 'ICP', name: 'Internet Computer', rarity: 'uncommon', emoji: '♾️', color: '#29ABE2', basePrice: 5.5 },
  { id: 18, symbol: 'UNI', name: 'Uniswap', rarity: 'uncommon', emoji: '🦄', color: '#FF007A', basePrice: 6.2 },
  { id: 19, symbol: 'LTC', name: 'Litecoin', rarity: 'uncommon', emoji: 'Ł', color: '#A6A9AA', basePrice: 72 },
  { id: 20, symbol: 'NEAR', name: 'NEAR Protocol', rarity: 'uncommon', emoji: '🌈', color: '#00C08B', basePrice: 3.8 },
  
  // 普通卡 (21-30)
  { id: 21, symbol: 'APT', name: 'Aptos', rarity: 'common', emoji: '🔴', color: '#00D4AA', basePrice: 9.2 },
  { id: 22, symbol: 'ATOM', name: 'Cosmos', rarity: 'common', emoji: '🪐', color: '#2E3148', basePrice: 11 },
  { id: 23, symbol: 'FIL', name: 'Filecoin', rarity: 'common', emoji: '📁', color: '#0090FF', basePrice: 5.8 },
  { id: 24, symbol: 'VET', name: 'VeChain', rarity: 'common', emoji: '✅', color: '#15BDFF', basePrice: 0.03 },
  { id: 25, symbol: 'HBAR', name: 'Hedera', rarity: 'common', emoji: '🌐', color: '#000000', basePrice: 0.065 },
  { id: 26, symbol: 'ALGO', name: 'Algorand', rarity: 'common', emoji: '🔺', color: '#000000', basePrice: 0.18 },
  { id: 27, symbol: 'XTZ', name: 'Tezos', rarity: 'common', emoji: '🔷', color: '#2C7DF7', basePrice: 1.05 },
  { id: 28, symbol: 'FLOW', name: 'Flow', rarity: 'common', emoji: '🌊', color: '#00EF8B', basePrice: 0.95 },
  { id: 29, symbol: 'MANA', name: 'Decentraland', rarity: 'common', emoji: '🏰', color: '#FF2D55', basePrice: 0.62 },
  { id: 30, symbol: 'SAND', name: 'The Sandbox', rarity: 'common', emoji: '🏖️', color: '#00ADEF', basePrice: 0.58 }
]

// 价格引擎
class PriceEngine {
  constructor() {
    this.prices = new Map()
    this.volatility = new Map()
    this.trends = new Map()
    this.lastUpdate = Date.now()
    this.initializePrices()
  }

  initializePrices() {
    CRYPTO_CARDS.forEach(card => {
      const volatility = card.rarity === 'rare' ? 0.05 : card.rarity === 'uncommon' ? 0.08 : 0.12
      this.volatility.set(card.symbol, volatility)
      this.trends.set(card.symbol, Math.random() > 0.5 ? 1 : -1)
      
      const initialPrice = card.basePrice * (0.9 + Math.random() * 0.2)
      this.prices.set(card.symbol, {
        current: initialPrice,
        dayStart: initialPrice,
        high24h: initialPrice * 1.1,
        low24h: initialPrice * 0.9,
        change24h: 0,
        changePercent: 0
      })
    })
  }

  updatePrices() {
    const now = Date.now()
    const timeDelta = (now - this.lastUpdate) / 1000 / 60 // minutes
    
    CRYPTO_CARDS.forEach(card => {
      const priceData = this.prices.get(card.symbol)
      const volatility = this.volatility.get(card.symbol)
      const trend = this.trends.get(card.symbol)
      
      // 价格变动计算
      const randomFactor = (Math.random() - 0.5) * volatility
      const trendFactor = trend * volatility * 0.3
      const changePercent = (randomFactor + trendFactor) * timeDelta
      
      // 更新价格
      const newPrice = priceData.current * (1 + changePercent / 100)
      priceData.current = Math.max(newPrice, card.basePrice * 0.5) // 防止价格过低
      
      // 更新24小时最高/最低
      priceData.high24h = Math.max(priceData.high24h, priceData.current)
      priceData.low24h = Math.min(priceData.low24h, priceData.current)
      
      // 计算24小时变化
      priceData.change24h = priceData.current - priceData.dayStart
      priceData.changePercent = (priceData.change24h / priceData.dayStart) * 100
      
      // 随机改变趋势
      if (Math.random() < 0.1) {
        this.trends.set(card.symbol, -this.trends.get(card.symbol))
      }
    })
    
    this.lastUpdate = now
  }

  getPrice(symbol) {
    return this.prices.get(symbol)
  }

  calculateHandScore(cardSymbols) {
    let totalScore = 0
    let multiplier = 1
    
    // 计算基础分数
    cardSymbols.forEach(symbol => {
      const card = CRYPTO_CARDS.find(c => c.symbol === symbol)
      if (card) {
        const priceData = this.prices.get(symbol)
        const priceScore = priceData.current * 10
        const volatilityBonus = Math.abs(priceData.changePercent) * 50
        const rarityBonus = card.rarity === 'rare' ? 1000 : card.rarity === 'uncommon' ? 500 : 200
        
        totalScore += priceScore + volatilityBonus + rarityBonus
      }
    })
    
    // 组合加成
    const uniqueSymbols = new Set(cardSymbols)
    const symbolCounts = {}
    cardSymbols.forEach(s => symbolCounts[s] = (symbolCounts[s] || 0) + 1)
    
    // 同花顺（5张相同）
    if (uniqueSymbols.size === 1) {
      multiplier = 5
    }
    // 四条
    else if (Object.values(symbolCounts).includes(4)) {
      multiplier = 3
    }
    // 三条
    else if (Object.values(symbolCounts).includes(3)) {
      multiplier = 2
    }
    // 两对
    else if (Object.values(symbolCounts).filter(c => c === 2).length === 2) {
      multiplier = 1.5
    }
    // 一对
    else if (Object.values(symbolCounts).includes(2)) {
      multiplier = 1.2
    }
    
    // 稀有度加成
    const rareCount = cardSymbols.filter(s => {
      const card = CRYPTO_CARDS.find(c => c.symbol === s)
      return card && card.rarity === 'rare'
    }).length
    
    if (rareCount === 5) multiplier *= 2
    else if (rareCount >= 3) multiplier *= 1.5
    
    return Math.floor(totalScore * multiplier)
  }
}

// 主应用组件
function MonadOptimizedApp() {
  // 状态管理
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [contract, setContract] = useState(null)
  const [selectedCards, setSelectedCards] = useState([])
  const [submittedHand, setSubmittedHand] = useState([])
  const [canReselect, setCanReselect] = useState(true)
  const [unlockTime, setUnlockTime] = useState(0)
  const [playerScore, setPlayerScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [prices, setPrices] = useState(new Map())
  const [contractBalance, setContractBalance] = useState('0')
  const [playerCount, setPlayerCount] = useState(0)
  const [txHash, setTxHash] = useState('')
  
  // 价格引擎实例
  const priceEngine = useRef(new PriceEngine())
  
  // 连接钱包
  const connectWallet = async () => {
    try {
      setLoading(true)
      setError('')
      
      if (!window.ethereum) {
        throw new Error('请安装 MetaMask 钱包')
      }
      
      // 请求账户
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      // 切换到 Monad 测试网
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: MONAD_CONFIG.chainId }]
        })
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MONAD_CONFIG]
          })
        }
      }
      
      // 设置 Provider 和 Signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
      
      setAccount(accounts[0])
      setProvider(provider)
      setSigner(signer)
      setContract(contract)
      
      // 加载玩家数据
      await loadPlayerData(accounts[0], contract)
      
      setSuccess('钱包连接成功！')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  // 加载玩家数据
  const loadPlayerData = async (playerAddress, contractInstance) => {
    try {
      const hasSubmitted = await contractInstance.hasSubmittedHand(playerAddress)
      
      if (hasSubmitted) {
        const [cardSymbols, , isLocked] = await contractInstance.getPlayerHand(playerAddress)
        setSubmittedHand(cardSymbols)
        
        const canReselectNow = await contractInstance.canReselect(playerAddress)
        setCanReselect(canReselectNow)
        
        const unlock = await contractInstance.getUnlockTime(playerAddress)
        setUnlockTime(Number(unlock))
        
        const score = await contractInstance.getPlayerScore(playerAddress)
        setPlayerScore(Number(score))
      }
      
      // 加载合约状态
      const balance = await contractInstance.getContractBalance()
      setContractBalance(ethers.formatEther(balance))
      
      const count = await contractInstance.getPlayerCount()
      setPlayerCount(Number(count))
      
    } catch (err) {
      console.error('加载数据失败:', err)
    }
  }
  
  // 选择卡牌
  const selectCard = (card) => {
    if (selectedCards.length >= 5) {
      setError('最多只能选择5张卡牌')
      return
    }
    
    setSelectedCards([...selectedCards, card])
    setError('')
  }
  
  // 移除卡牌
  const removeCard = (index) => {
    setSelectedCards(selectedCards.filter((_, i) => i !== index))
  }
  
  // 提交手牌
  const submitHand = async () => {
    if (!contract) {
      setError('请先连接钱包')
      return
    }
    
    if (selectedCards.length !== 5) {
      setError('请选择5张卡牌')
      return
    }
    
    try {
      setLoading(true)
      setError('')
      
      const cardSymbols = selectedCards.map(card => card.symbol)
      const tx = await contract.submitHand(cardSymbols, {
        value: ethers.parseEther('0.01')
      })
      
      setTxHash(tx.hash)
      setSuccess('交易已提交，等待确认...')
      
      await tx.wait()
      
      setSubmittedHand(cardSymbols)
      setSelectedCards([])
      setCanReselect(false)
      setSuccess('手牌提交成功！')
      
      // 重新加载数据
      await loadPlayerData(account, contract)
      
    } catch (err) {
      setError(`提交失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  // 更新价格
  useEffect(() => {
    const interval = setInterval(() => {
      priceEngine.current.updatePrices()
      setPrices(new Map(priceEngine.current.prices))
    }, 5000) // 每5秒更新一次
    
    return () => clearInterval(interval)
  }, [])
  
  // 监听账户变化
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          setAccount(null)
          setContract(null)
        } else {
          connectWallet()
        }
      })
    }
  }, [])
  
  // 格式化时间
  const formatTimeRemaining = () => {
    if (!unlockTime || canReselect) return '可以重新选择'
    
    const now = Date.now() / 1000
    const remaining = unlockTime - now
    
    if (remaining <= 0) return '可以重新选择'
    
    const hours = Math.floor(remaining / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    return `${hours}小时 ${minutes}分钟后解锁`
  }
  
  // 计算预估分数
  const estimatedScore = useMemo(() => {
    if (selectedCards.length !== 5) return 0
    return priceEngine.current.calculateHandScore(selectedCards.map(c => c.symbol))
  }, [selectedCards])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* 头部 */}
      <header className="bg-black/30 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-pink-500 text-transparent bg-clip-text">
              Monad 加密卡牌游戏
            </h1>
            <span className="text-sm opacity-70">24小时锁定赛</span>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <div className="text-sm opacity-70">奖池</div>
              <div className="text-xl font-bold text-yellow-400">{contractBalance} MONAD</div>
            </div>
            
            <div className="text-right">
              <div className="text-sm opacity-70">参与人数</div>
              <div className="text-xl font-bold">{playerCount}</div>
            </div>
            
            {!account ? (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-lg font-bold hover:scale-105 transition-all disabled:opacity-50"
              >
                {loading ? '连接中...' : '连接钱包'}
              </button>
            ) : (
              <div className="bg-black/50 px-4 py-2 rounded-lg">
                <div className="text-sm opacity-70">已连接</div>
                <div className="font-mono">{account.slice(0, 6)}...{account.slice(-4)}</div>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* 消息提示 */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-300 p-4 mx-4 mt-4 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 border border-green-500 text-green-300 p-4 mx-4 mt-4 rounded-lg">
          {success}
          {txHash && (
            <a 
              href={`https://testnet-explorer.monad.network/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 underline"
            >
              查看交易
            </a>
          )}
        </div>
      )}
      
      <main className="max-w-7xl mx-auto p-4">
        {/* 游戏状态面板 */}
        {account && submittedHand.length > 0 && (
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">我的游戏状态</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm opacity-70">当前手牌</div>
                <div className="flex space-x-2 mt-2">
                  {submittedHand.map((symbol, i) => {
                    const card = CRYPTO_CARDS.find(c => c.symbol === symbol)
                    return (
                      <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 p-2 rounded-lg">
                        <span className="text-2xl">{card?.emoji}</span>
                        <div className="text-xs mt-1">{symbol}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div>
                <div className="text-sm opacity-70">当前分数</div>
                <div className="text-3xl font-bold text-yellow-400 mt-2">
                  {playerScore.toLocaleString()}
                </div>
              </div>
              
              <div>
                <div className="text-sm opacity-70">重选时间</div>
                <div className="text-xl mt-2">
                  {formatTimeRemaining()}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 选择的卡牌 */}
        {selectedCards.length > 0 && (
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">已选择的卡牌 ({selectedCards.length}/5)</h3>
              <div className="text-right">
                <div className="text-sm opacity-70">预估分数</div>
                <div className="text-2xl font-bold text-yellow-400">{estimatedScore.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
              {selectedCards.map((card, index) => {
                const priceData = prices.get(card.symbol) || { current: card.basePrice, changePercent: 0 }
                return (
                  <div
                    key={index}
                    className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 hover:scale-105 transition-all"
                  >
                    <button
                      onClick={() => removeCard(index)}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                    
                    <div className="text-4xl mb-2">{card.emoji}</div>
                    <div className="font-bold">{card.symbol}</div>
                    <div className="text-sm opacity-70">${priceData.current.toFixed(2)}</div>
                    <div className={`text-xs ${priceData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceData.changePercent >= 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
                    </div>
                  </div>
                )
              })}
            </div>
            
            <button
              onClick={submitHand}
              disabled={loading || selectedCards.length !== 5 || !canReselect}
              className="mt-6 w-full bg-gradient-to-r from-green-500 to-emerald-500 py-4 rounded-lg font-bold text-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '提交中...' : `提交手牌 (0.01 MONAD)`}
            </button>
          </div>
        )}
        
        {/* 卡牌市场 */}
        <div className="bg-black/40 backdrop-blur-md rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-6">加密货币卡牌市场</h2>
          
          {/* 稀有度标签 */}
          <div className="flex space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>稀有 (Top 10)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span>非凡 (11-20)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>普通 (21-30)</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {CRYPTO_CARDS.map(card => {
              const priceData = prices.get(card.symbol) || { current: card.basePrice, changePercent: 0 }
              const isSelected = selectedCards.some(c => c.id === card.id)
              
              return (
                <button
                  key={card.id}
                  onClick={() => selectCard(card)}
                  disabled={isSelected || !canReselect || selectedCards.length >= 5}
                  className={`
                    relative p-4 rounded-xl transition-all transform hover:scale-105
                    ${card.rarity === 'rare' ? 'bg-gradient-to-br from-yellow-600/30 to-orange-600/30 border-2 border-yellow-500' : 
                      card.rarity === 'uncommon' ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-purple-500' :
                      'bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border-2 border-blue-500'}
                    ${isSelected ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}
                    ${!canReselect ? 'cursor-not-allowed opacity-50' : ''}
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-green-500 rounded-full w-6 h-6 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  
                  <div className="text-4xl mb-2">{card.emoji}</div>
                  <div className="font-bold text-lg">{card.symbol}</div>
                  <div className="text-xs opacity-70 mb-2">{card.name}</div>
                  
                  <div className="border-t border-white/20 pt-2">
                    <div className="text-sm font-mono">
                      ${priceData.current < 0.01 ? priceData.current.toExponential(2) : priceData.current.toFixed(2)}
                    </div>
                    <div className={`text-xs ${priceData.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {priceData.changePercent >= 0 ? '↑' : '↓'} {Math.abs(priceData.changePercent).toFixed(2)}%
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        
        {/* 游戏规则 */}
        <div className="mt-8 bg-black/40 backdrop-blur-md rounded-xl p-6">
          <h3 className="text-xl font-bold mb-4">游戏规则</h3>
          <div className="space-y-2 text-sm opacity-80">
            <p>• 选择5张加密货币卡牌组成你的手牌</p>
            <p>• 每次提交需要支付 0.01 MONAD 参与费</p>
            <p>• 手牌提交后锁定24小时，期间不能更改</p>
            <p>• 分数基于卡牌的实时价格、波动性和稀有度计算</p>
            <p>• 特殊组合（对子、三条、同花等）有额外加成</p>
            <p>• 24小时后可重新选择新的手牌</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MonadOptimizedApp
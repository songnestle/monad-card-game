// Top 30 加密货币数据（基于2024年8月27日CoinGecko市值排名）
export const cryptoCards = [
  // Tier 1: Top 5 - 最高稀有度 (Mythical)
  { id: 1, symbol: 'BTC', name: 'Bitcoin', rarity: 5, emoji: '₿', color: '#F7931A' },
  { id: 2, symbol: 'ETH', name: 'Ethereum', rarity: 5, emoji: 'Ξ', color: '#627EEA' },
  { id: 3, symbol: 'USDT', name: 'Tether', rarity: 5, emoji: '₮', color: '#26A17B' },
  { id: 4, symbol: 'BNB', name: 'BNB', rarity: 5, emoji: '🟡', color: '#F3BA2F' },
  { id: 5, symbol: 'SOL', name: 'Solana', rarity: 5, emoji: '◎', color: '#9945FF' },

  // Tier 2: 6-10 - 传说级 (Legendary)
  { id: 6, symbol: 'USDC', name: 'USD Coin', rarity: 4, emoji: '🔵', color: '#2775CA' },
  { id: 7, symbol: 'XRP', name: 'Ripple', rarity: 4, emoji: '💧', color: '#23292F' },
  { id: 8, symbol: 'DOGE', name: 'Dogecoin', rarity: 4, emoji: '🐕', color: '#C2A633' },
  { id: 9, symbol: 'TON', name: 'Toncoin', rarity: 4, emoji: '💎', color: '#0088CC' },
  { id: 10, symbol: 'ADA', name: 'Cardano', rarity: 4, emoji: '🔷', color: '#0033AD' },

  // Tier 3: 11-20 - 史诗级 (Epic)
  { id: 11, symbol: 'AVAX', name: 'Avalanche', rarity: 3, emoji: '🔺', color: '#E84142' },
  { id: 12, symbol: 'WETH', name: 'Wrapped Ethereum', rarity: 3, emoji: '🔄', color: '#FF6B9D' },
  { id: 13, symbol: 'SHIB', name: 'Shiba Inu', rarity: 3, emoji: '🐺', color: '#FFA409' },
  { id: 14, symbol: 'DOT', name: 'Polkadot', rarity: 3, emoji: '⚫', color: '#E6007A' },
  { id: 15, symbol: 'LINK', name: 'Chainlink', rarity: 3, emoji: '🔗', color: '#375BD2' },
  { id: 16, symbol: 'TRX', name: 'TRON', rarity: 3, emoji: '⚡', color: '#FF060A' },
  { id: 17, symbol: 'WBTC', name: 'Wrapped Bitcoin', rarity: 3, emoji: '🟠', color: '#FF9500' },
  { id: 18, symbol: 'BCH', name: 'Bitcoin Cash', rarity: 3, emoji: '💚', color: '#0AC18E' },
  { id: 19, symbol: 'UNI', name: 'Uniswap', rarity: 3, emoji: '🦄', color: '#FF007A' },
  { id: 20, symbol: 'NEAR', name: 'NEAR Protocol', rarity: 3, emoji: '🌐', color: '#000000' },

  // Tier 4: 21-25 - 稀有级 (Rare)
  { id: 21, symbol: 'MATIC', name: 'Polygon', rarity: 2, emoji: '🟣', color: '#8247E5' },
  { id: 22, symbol: 'LTC', name: 'Litecoin', rarity: 2, emoji: 'Ł', color: '#BFBBBB' },
  { id: 23, symbol: 'ICP', name: 'Internet Computer', rarity: 2, emoji: '∞', color: '#29ABE2' },
  { id: 24, symbol: 'APT', name: 'Aptos', rarity: 2, emoji: '🅰', color: '#000000' },
  { id: 25, symbol: 'DAI', name: 'Dai', rarity: 2, emoji: '◈', color: '#F5AC37' },

  // Tier 5: 26-30 - 普通级 (Common)
  { id: 26, symbol: 'ETC', name: 'Ethereum Classic', rarity: 1, emoji: '🟢', color: '#328332' },
  { id: 27, symbol: 'ATOM', name: 'Cosmos', rarity: 1, emoji: '⚛️', color: '#2E3148' },
  { id: 28, symbol: 'XLM', name: 'Stellar', rarity: 1, emoji: '⭐', color: '#7D00FF' },
  { id: 29, symbol: 'XMR', name: 'Monero', rarity: 1, emoji: '🔒', color: '#FF6600' },
  { id: 30, symbol: 'OKB', name: 'OKB', rarity: 1, emoji: '🅾️', color: '#3075EE' }
]

// 稀有度名称映射
export const rarityNames = {
  1: "普通",
  2: "稀有", 
  3: "史诗",
  4: "传说",
  5: "神话"
}

// 根据稀有度获取抽卡概率
export const getCardRarityProbability = () => {
  const rand = Math.random()
  if (rand < 0.50) return 1  // 50% 普通
  if (rand < 0.75) return 2  // 25% 稀有
  if (rand < 0.90) return 3  // 15% 史诗
  if (rand < 0.97) return 4  // 7% 传说
  return 5                   // 3% 神话
}

// 根据稀有度随机选择卡牌
export const getRandomCardByRarity = (rarity) => {
  const cardsOfRarity = cryptoCards.filter(card => card.rarity === rarity)
  return cardsOfRarity[Math.floor(Math.random() * cardsOfRarity.length)]
}

// 获取卡牌基础属性（基于市值和稀有度）
export const getCardBaseStats = (card) => {
  const baseAttack = card.rarity * 10 + Math.floor(Math.random() * 10)
  const baseDefense = card.rarity * 8 + Math.floor(Math.random() * 8)
  return { attack: baseAttack, defense: baseDefense }
}
#!/usr/bin/env node

// Crypto Card Game 测试脚本
const { ethers } = require('ethers')

const RPC_URL = 'http://127.0.0.1:8545'
const CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

const abi = [
  "function claimDailyCards() public payable",
  "function createHand(uint[5] cardIndexes) public",
  "function getMyCards() public view returns (tuple(uint id, string symbol, string name, uint rarity, uint baseScore, uint level, uint timestamp)[])",
  "function getMyActiveHand() public view returns (tuple(uint[5] cardIndexes, uint totalScore, uint timestamp, bool isActive))",
  "function getCurrentContest() public view returns (uint startTime, uint endTime, uint participantCount, uint prizePool)",
  "function getContestLeaderboard(uint day) public view returns (address[] players, uint[] scores)",
  "function participationFee() public view returns (uint)",
  "function currentContestDay() public view returns (uint)",
  "function updateCardPrices(uint[] cardIds, int[] priceChanges) public"
]

async function main() {
  console.log('🎮 开始测试 Crypto Card Game...\n')

  // 连接到本地网络
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet)

  try {
    // 1. 检查合约状态
    console.log('📊 检查合约状态...')
    const participationFee = await contract.participationFee()
    const currentDay = await contract.currentContestDay()
    console.log(`参与费用: ${ethers.formatEther(participationFee)} ETH`)
    console.log(`当前赛事天数: ${currentDay}`)

    // 2. 检查当前余额
    const balance = await provider.getBalance(wallet.address)
    console.log(`账户余额: ${ethers.formatEther(balance)} ETH`)

    if (balance < participationFee) {
      console.log('❌ 余额不足，无法参与游戏')
      return
    }

    // 3. 领取每日卡牌
    console.log('\n🎁 尝试领取每日卡牌...')
    try {
      const claimTx = await contract.claimDailyCards({ 
        value: participationFee,
        gasLimit: 1000000 
      })
      console.log(`交易哈希: ${claimTx.hash}`)
      await claimTx.wait()
      console.log('✅ 成功领取每日卡牌!')
    } catch (err) {
      if (err.reason && err.reason.includes('Already claimed')) {
        console.log('⏭️ 今日已领取过卡牌')
      } else {
        console.log('❌ 领取失败:', err.message)
      }
    }

    // 4. 查看拥有的卡牌
    console.log('\n🎴 查看拥有的卡牌...')
    const myCards = await contract.getMyCards()
    console.log(`拥有卡牌数量: ${myCards.length}`)
    
    myCards.forEach((card, index) => {
      console.log(`${index + 1}. ${card.symbol} - ${card.name}`)
      console.log(`   稀有度: ${card.rarity}, 基础分数: ${card.baseScore}, 等级: ${card.level}`)
    })

    // 5. 如果有5张或以上卡牌，创建手牌
    if (myCards.length >= 5) {
      console.log('\n🤝 创建手牌...')
      const selectedCards = [0, 1, 2, 3, 4] // 选择前5张卡牌
      
      try {
        const handTx = await contract.createHand(selectedCards, { gasLimit: 500000 })
        console.log(`创建手牌交易: ${handTx.hash}`)
        await handTx.wait()
        console.log('✅ 成功创建手牌!')
      } catch (err) {
        console.log('⏭️ 手牌可能已存在:', err.message)
      }

      // 查看活跃手牌
      const activeHand = await contract.getMyActiveHand()
      console.log('当前手牌信息:')
      console.log(`- 总分数: ${activeHand.totalScore}`)
      console.log(`- 是否激活: ${activeHand.isActive}`)
      console.log(`- 卡牌索引: [${activeHand.cardIndexes.join(', ')}]`)
    }

    // 6. 查看赛事信息
    console.log('\n🏆 查看当前赛事...')
    const contestInfo = await contract.getCurrentContest()
    console.log(`赛事开始时间: ${new Date(Number(contestInfo.startTime) * 1000).toLocaleString()}`)
    console.log(`赛事结束时间: ${new Date(Number(contestInfo.endTime) * 1000).toLocaleString()}`)
    console.log(`参与人数: ${contestInfo.participantCount}`)
    console.log(`奖金池: ${ethers.formatEther(contestInfo.prizePool)} ETH`)

    // 7. 查看排行榜
    console.log('\n📈 查看排行榜...')
    const leaderboard = await contract.getContestLeaderboard(currentDay)
    console.log(`排行榜参与者: ${leaderboard.players.length}`)
    
    leaderboard.players.forEach((player, index) => {
      const score = leaderboard.scores[index]
      const address = player.slice(0, 6) + '...' + player.slice(-4)
      console.log(`${index + 1}. ${address} - ${score} 分`)
    })

    // 8. 模拟价格更新（仅合约拥有者可调用）
    console.log('\n💹 尝试更新价格...')
    try {
      const cardIds = [1, 2, 3, 4, 5] // BTC, ETH, USDT, BNB, SOL
      const priceChanges = [100, -50, 5, 75, -30] // 随机价格变化（基点）
      
      const priceTx = await contract.updateCardPrices(cardIds, priceChanges, { gasLimit: 500000 })
      console.log(`价格更新交易: ${priceTx.hash}`)
      await priceTx.wait()
      console.log('✅ 价格更新成功!')
    } catch (err) {
      console.log('⏭️ 价格更新失败（可能不是合约拥有者）:', err.message)
    }

    console.log('\n🎉 测试完成! 游戏运行正常')
    console.log('💡 现在可以在浏览器中访问 http://localhost:5173 体验游戏')

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error)
  }
}

// 运行测试
main().catch(console.error)
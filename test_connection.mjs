#!/usr/bin/env node

import { ethers } from 'ethers'

const RPC_URL = 'http://127.0.0.1:8545'
const CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

async function testConnection() {
  console.log('🔍 测试区块链和合约连接...\n')

  try {
    // 1. 测试RPC连接
    console.log('1️⃣ 测试RPC连接...')
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const blockNumber = await provider.getBlockNumber()
    console.log(`✅ RPC连接成功，当前区块: ${blockNumber}`)

    // 2. 测试账户
    console.log('\n2️⃣ 测试账户...')
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    const balance = await provider.getBalance(wallet.address)
    console.log(`✅ 账户: ${wallet.address}`)
    console.log(`✅ 余额: ${ethers.formatEther(balance)} ETH`)

    // 3. 测试合约
    console.log('\n3️⃣ 测试合约连接...')
    const abi = ["function participationFee() public view returns (uint)"]
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet)
    
    const fee = await contract.participationFee()
    console.log(`✅ 合约连接成功`)
    console.log(`✅ 参与费用: ${ethers.formatEther(fee)} ETH`)

    console.log('\n🎉 所有连接测试通过！')
    console.log('💡 现在可以正常使用游戏了')

  } catch (error) {
    console.error('❌ 连接测试失败:', error.message)
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 解决方案: 请启动Anvil节点')
      console.log('   命令: anvil --host 0.0.0.0')
    }
  }
}

testConnection()
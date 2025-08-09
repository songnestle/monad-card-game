import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONTRACT_ADDRESS = '0xfc69ef8D1a6461D6F562e7F83581DD4f68479333';
const RPC_URL = 'https://testnet-rpc.monad.xyz';

// 简化的ABI
const SIMPLE_ABI = [
  "function submitHand(string[] memory cardSymbols) external payable"
];

async function debugContract() {
  console.log('🔍 调试合约问题...\n');

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, SIMPLE_ABI, provider);
    
    // 测试卡牌
    const testCards = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA'];
    
    console.log('1. 测试不同数量的卡牌:');
    
    // 测试5张卡牌
    try {
      const data5 = contract.interface.encodeFunctionData('submitHand', [testCards]);
      console.log(`  ✅ 5张卡牌编码成功`);
    } catch (e) {
      console.log(`  ❌ 5张卡牌编码失败: ${e.message}`);
    }
    
    // 测试1张卡牌
    try {
      const data1 = contract.interface.encodeFunctionData('submitHand', [['BTC']]);
      console.log(`  ✅ 1张卡牌编码成功`);
    } catch (e) {
      console.log(`  ❌ 1张卡牌编码失败: ${e.message}`);
    }
    
    // 测试空数组
    try {
      const data0 = contract.interface.encodeFunctionData('submitHand', [[]]);
      console.log(`  ✅ 0张卡牌编码成功`);
    } catch (e) {
      console.log(`  ❌ 0张卡牌编码失败: ${e.message}`);
    }
    
    console.log('\n2. 静态调用测试 (不消耗gas):');
    
    // 创建一个测试钱包
    const testWallet = ethers.Wallet.createRandom();
    console.log(`  测试地址: ${testWallet.address}`);
    
    // 尝试静态调用
    try {
      // 直接调用provider的call方法
      const callData = contract.interface.encodeFunctionData('submitHand', [testCards]);
      const result = await provider.call({
        to: CONTRACT_ADDRESS,
        data: callData,
        value: ethers.parseEther("0.001").toString(),
        from: testWallet.address
      });
      console.log(`  ✅ 静态调用成功: ${result}`);
    } catch (error) {
      console.log(`  ❌ 静态调用失败:`);
      console.log(`     错误类型: ${error.code}`);
      console.log(`     错误信息: ${error.message}`);
      
      // 尝试解析revert原因
      if (error.data) {
        try {
          // 检查是否是标准的revert消息
          if (error.data.startsWith('0x08c379a0')) {
            // Error(string) selector
            const reason = ethers.AbiCoder.defaultAbiCoder().decode(['string'], '0x' + error.data.slice(10));
            console.log(`     Revert原因: ${reason[0]}`);
          } else {
            console.log(`     返回数据: ${error.data}`);
          }
        } catch (e) {
          console.log(`     无法解析返回数据`);
        }
      }
    }
    
    console.log('\n3. 检查合约可能的限制:');
    console.log('  可能的原因:');
    console.log('    - 合约可能要求正好5张卡牌');
    console.log('    - 合约可能检查卡牌符号的有效性');
    console.log('    - 合约可能有参与费用要求(当前设置: 0.001 MONAD)');
    console.log('    - 合约可能限制每个地址的提交次数');
    console.log('    - 合约可能有时间窗口限制');
    
  } catch (error) {
    console.error('\n❌ 调试失败:', error.message);
  }
}

debugContract().catch(console.error);
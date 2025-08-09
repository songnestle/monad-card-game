# 🚀 如何部署MonadCardGame智能合约

## 方法1：使用Remix IDE（最简单）

### 步骤：

1. **打开Remix IDE**
   - 访问: https://remix.ethereum.org

2. **创建合约文件**
   - 点击左侧文件浏览器的 "+" 按钮
   - 创建新文件: `MonadCardGame.sol`
   - 复制粘贴以下合约代码：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MonadCardGame {
    uint256 public constant ENTRY_FEE = 0.01 ether;
    uint256 public constant LOCK_DURATION = 24 hours;
    
    address public owner;
    uint256 public totalSupply;
    uint256 public playerCount;
    
    struct Hand {
        string cards;
        uint256 submissionTime;
        bool isLocked;
    }
    
    mapping(address => Hand) public playerHands;
    mapping(address => uint256) public balances;
    
    event HandSubmitted(address indexed player, uint256 value, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
    }
    
    function submitHand(string[] memory cardSymbols) external payable {
        require(cardSymbols.length == 5, "Must submit exactly 5 cards");
        require(msg.value >= ENTRY_FEE, "Insufficient entry fee");
        
        // Join card symbols into a single string
        string memory cards = "";
        for (uint i = 0; i < cardSymbols.length; i++) {
            if (i > 0) cards = string(abi.encodePacked(cards, ","));
            cards = string(abi.encodePacked(cards, cardSymbols[i]));
        }
        
        playerHands[msg.sender] = Hand({
            cards: cards,
            submissionTime: block.timestamp,
            isLocked: true
        });
        
        if (balances[msg.sender] == 0) {
            playerCount++;
        }
        
        balances[msg.sender] += msg.value;
        totalSupply += msg.value;
        
        emit HandSubmitted(msg.sender, msg.value, block.timestamp);
    }
    
    function getPlayerHand(address player) external view returns (
        string memory cards,
        uint256 submissionTime,
        bool isLocked,
        uint256 balance,
        uint256 unlockTime,
        uint256 currentTime
    ) {
        Hand memory hand = playerHands[player];
        return (
            hand.cards,
            hand.submissionTime,
            hand.isLocked && (block.timestamp < hand.submissionTime + LOCK_DURATION),
            balances[player],
            hand.submissionTime + LOCK_DURATION,
            block.timestamp
        );
    }
}
```

3. **编译合约**
   - 点击左侧 "Solidity Compiler" 图标
   - 选择编译器版本: 0.8.20+
   - 点击 "Compile MonadCardGame.sol"

4. **连接MetaMask到Monad测试网**
   - 打开MetaMask
   - 添加Monad测试网:
     - 网络名称: Monad Testnet
     - RPC URL: https://testnet-rpc.monad.xyz
     - 链ID: 10143
     - 货币符号: MONAD

5. **获取测试币**
   - 访问: https://faucet.monad.xyz
   - 输入你的钱包地址
   - 获取测试MONAD币

6. **部署合约**
   - 在Remix中点击 "Deploy & Run Transactions" 图标
   - Environment选择: "Injected Provider - MetaMask"
   - 确保连接到Monad测试网
   - 点击 "Deploy"
   - 在MetaMask中确认交易

7. **获取合约地址**
   - 部署成功后，在Remix底部会显示合约地址
   - 复制这个地址

## 方法2：使用命令行部署

### 准备工作：

1. **安装Node.js**
   ```bash
   # 检查是否已安装
   node --version
   ```

2. **创建部署脚本**
   ```bash
   cd /Users/nestle/monad-card-frontend
   ```

3. **设置私钥**
   ```bash
   # 创建.env.local文件（注意：不要提交到git）
   echo "PRIVATE_KEY=你的钱包私钥" > .env.local
   ```

4. **运行部署**
   ```bash
   # 修改deploy-new-contract.js使用.env.local
   node deploy-new-contract.js
   ```

## 方法3：使用在线工具

### 使用Monad区块浏览器：

1. 访问Monad测试网浏览器（如果有）
2. 使用合约部署工具
3. 粘贴合约代码
4. 连接钱包并部署

## 部署后的步骤

1. **记录合约地址**
   ```
   合约地址: 0x... (部署后获得的地址)
   ```

2. **更新前端配置**
   
   编辑 `src/UltimateMonadApp.jsx`:
   ```javascript
   const MONAD_CARD_GAME_CONTRACT = {
     address: '你的新合约地址', // 替换这里
     abi: [...] // 保持不变
   };
   ```

3. **更新环境变量**
   
   编辑 `.env`:
   ```
   VITE_CONTRACT_ADDRESS=你的新合约地址
   ```

4. **重启应用**
   ```bash
   npm run dev
   ```

## 常见问题

### 1. 没有测试币？
- 访问 https://faucet.monad.xyz
- 或在Discord/Telegram找Monad社区求助

### 2. MetaMask无法连接？
- 确保网络配置正确
- 清除MetaMask缓存
- 尝试重新添加网络

### 3. 部署失败？
- 检查是否有足够的MONAD币
- 确认网络连接正常
- 查看错误信息

### 4. 找不到合约地址？
- 在MetaMask查看交易历史
- 查看Remix的部署日志
- 检查deployment-info.json文件

## 快速测试

部署成功后，测试合约：

1. 在Remix中调用 `ENTRY_FEE` 函数
2. 应该返回: `10000000000000000` (0.01 ETH)

## 需要帮助？

- Monad官方文档: https://docs.monad.xyz
- Monad Discord社区
- GitHub Issues

---

💡 **提示**: 使用Remix是最简单的方法，适合初学者。确保保存好合约地址！
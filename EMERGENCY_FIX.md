# 🚨 紧急修复：合约调用失败

## 当前问题

合约地址 `0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030` 存在严重问题：
- 所有函数调用都返回 `require(false)`
- 字节码以 `0xf3fe` 开头（非标准部署）

## 立即解决方案

### 选项1：使用Remix部署新合约（5分钟）

1. **打开 Remix**
   ```
   https://remix.ethereum.org
   ```

2. **创建新文件**
   - 文件名：`MonadCardGame.sol`
   - 复制以下代码：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MonadCardGame {
    uint256 public constant ENTRY_FEE = 0.01 ether;
    mapping(address => string) public playerCards;
    mapping(address => uint256) public playerTime;
    mapping(address => uint256) public balances;
    
    event HandSubmitted(address indexed player, uint256 value, uint256 timestamp);
    
    function submitHand(string[] memory cardSymbols) external payable {
        require(cardSymbols.length == 5, "Must submit 5 cards");
        require(msg.value >= ENTRY_FEE, "Insufficient fee");
        
        // 将卡牌连接成字符串
        string memory cards = "";
        for (uint i = 0; i < cardSymbols.length; i++) {
            if (i > 0) cards = string(abi.encodePacked(cards, ","));
            cards = string(abi.encodePacked(cards, cardSymbols[i]));
        }
        
        playerCards[msg.sender] = cards;
        playerTime[msg.sender] = block.timestamp;
        balances[msg.sender] += msg.value;
        
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
        return (
            playerCards[player],
            playerTime[player],
            playerTime[player] > 0,
            balances[player],
            playerTime[player] + 24 hours,
            block.timestamp
        );
    }
}
```

3. **编译合约**
   - 点击 "Solidity Compiler" (第3个图标)
   - 点击 "Compile"

4. **部署合约**
   - 点击 "Deploy & Run" (第4个图标)
   - Environment: "Injected Provider - MetaMask"
   - 确保MetaMask在Monad测试网
   - 点击 "Deploy"

5. **更新地址**
   ```bash
   # 复制新合约地址，更新这两个文件：
   
   # 1. .env
   VITE_CONTRACT_ADDRESS=新合约地址
   
   # 2. src/UltimateMonadApp.jsx (第391行)
   address: import.meta.env.VITE_CONTRACT_ADDRESS || '新合约地址',
   ```

### 选项2：临时禁用合约（1分钟）

编辑 `.env` 文件：
```
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

这会让应用显示"合约未部署"错误，但至少不会一直尝试调用失败。

### 选项3：使用测试地址

如果你有其他可用的合约地址，更新 `.env`：
```
VITE_CONTRACT_ADDRESS=其他可用的合约地址
```

## 验证新合约

部署后运行：
```bash
node quick-test-contract.js
```

应该看到：
```
✅ ENTRY_FEE调用成功: 0.01 ETH
```

## 需要帮助？

1. 确保有Monad测试币（https://faucet.monad.xyz）
2. 确保MetaMask连接到Monad测试网
3. 如果Remix无法连接，刷新页面重试

---

**重要**：当前合约无法修复，必须部署新合约！
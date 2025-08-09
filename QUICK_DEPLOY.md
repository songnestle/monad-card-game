# 🚀 5分钟部署MonadCardGame合约

## 最快方法：使用Remix

### 第1步：准备MetaMask
1. 打开MetaMask
2. 点击网络下拉菜单 → "添加网络" → "手动添加"
3. 填写Monad测试网信息：
   - **网络名称**: Monad Testnet
   - **RPC URL**: `https://testnet-rpc.monad.xyz`
   - **链ID**: `10143`
   - **货币符号**: `MONAD`
4. 保存并切换到Monad测试网

### 第2步：获取测试币
1. 访问: https://faucet.monad.xyz
2. 输入你的钱包地址
3. 点击获取测试币（可能需要完成验证）

### 第3步：部署合约
1. 打开 Remix: https://remix.ethereum.org
2. 创建新文件：点击 "contracts" 文件夹 → "+" → 命名为 `MonadCardGame.sol`
3. 复制粘贴合约代码（从 `/contracts/MonadCardGame_Remix.sol`）
4. 编译：
   - 点击左侧 "Solidity编译器" 图标（第3个）
   - 确保版本是 0.8.x
   - 点击 "Compile MonadCardGame.sol"
5. 部署：
   - 点击左侧 "部署" 图标（第4个）
   - Environment选择: "Injected Provider - MetaMask"
   - 确保MetaMask显示 "Monad Testnet"
   - 点击 "Deploy"
   - MetaMask弹窗确认交易

### 第4步：获取合约地址
部署成功后，在Remix底部 "Deployed Contracts" 区域：
- 找到 "MONADCARDGAME AT 0x..."
- 点击复制按钮复制地址

### 第5步：更新前端
1. 打开 `/src/UltimateMonadApp.jsx`
2. 找到第391行：
   ```javascript
   address: import.meta.env.VITE_CONTRACT_ADDRESS || '0xfc69ef8D1a6461D6F562e7F83581DD4f68479333',
   ```
3. 替换为你的新地址：
   ```javascript
   address: import.meta.env.VITE_CONTRACT_ADDRESS || '你的新合约地址',
   ```

4. 同时更新 `.env` 文件：
   ```
   VITE_CONTRACT_ADDRESS=你的新合约地址
   ```

### 第6步：重启应用
```bash
npm run dev
```

## ✅ 完成！

现在你的应用应该可以正常提交卡牌了。

## 故障排除

### 问题：MetaMask无法连接Remix
- 解决：刷新Remix页面，确保MetaMask解锁

### 问题：没有测试币
- 解决：
  1. 再次访问 https://faucet.monad.xyz
  2. 或在Monad Discord请求: https://discord.gg/monad

### 问题：部署失败
- 检查：
  1. MetaMask是否在Monad测试网
  2. 是否有足够的MONAD币（至少0.1）
  3. 合约是否编译成功

### 问题：前端仍然报错
- 确保：
  1. 合约地址正确复制（包括0x前缀）
  2. 已保存文件
  3. 已重启开发服务器

## 验证部署

在Remix中测试：
1. 展开部署的合约
2. 点击 `ENTRY_FEE` 按钮
3. 应该显示: `10000000000000000` (0.01 ETH)

---

💡 **提示**: 保存好合约地址！如果丢失需要重新部署。
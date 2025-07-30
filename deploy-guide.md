# 🚀 Monad Card Game - 部署指南

## 📋 快速部署步骤

### 第1步：GitHub仓库设置

**请访问以下链接并按步骤操作：**

1. **创建新仓库**：https://github.com/new
   ```
   Repository name: monad-card-game
   Description: 🎴 Monad Card Game - Web3 Cryptocurrency Card Battle Game
   ✅ Public (必须选择Public才能使用Vercel免费版)
   ❌ 不要勾选 "Add a README file"
   ❌ 不要勾选 "Add .gitignore"
   ❌ 不要勾选 "Choose a license"
   ```

2. **添加SSH密钥到GitHub**：
   - 访问：https://github.com/settings/keys
   - 点击 "New SSH key"
   - Title: `Monad Card Game Deploy Key`
   - Key: 复制下面的公钥内容

**SSH公钥（请复制这个）：**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPcSCYZG/bL5TF7AV9mgc43BcF9jtyBYI2/zVkQKvcAS monad-card-game
```

### 第2步：推送代码

完成GitHub设置后，告诉我"GitHub设置完成"，我将立即推送代码！

### 第3步：Vercel部署

1. **连接Vercel**：https://vercel.com
2. 使用GitHub账号登录
3. 点击 "New Project"
4. 找到 `monad-card-game` 仓库
5. 点击 "Import"
6. 配置会自动检测：
   ```
   Framework Preset: Vite
   Build Command: npm run build  
   Output Directory: dist
   Install Command: npm install
   ```
7. 点击 "Deploy"
8. 等待2-3分钟构建完成
9. 🎉 获得公网地址！

## 🎯 预期结果

部署成功后，您将获得：
- 📱 公网访问地址：`https://monad-card-game-xxx.vercel.app`
- 🔄 自动部署：每次推送代码都会自动更新
- 📊 构建日志：可以查看部署状态
- 🌍 全球CDN：快速访问体验

## 🎮 应用功能

用户可以在公网上体验：
- 🔗 连接MetaMask钱包
- 🃏 收集25种加密货币卡牌
- ⭐ 5个稀有度等级系统
- 🎯 选择5张卡牌组成手牌
- 🏆 参与竞技系统
- 🌐 Monad测试网集成

---

**准备好了吗？** 完成GitHub设置后告诉我，我立即为您推送代码！
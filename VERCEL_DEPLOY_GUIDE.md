# Vercel 部署指南

## 自动部署（推荐）

1. **访问 Vercel 网站**
   - 打开 https://vercel.com
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "New Project"
   - 选择 "Import Git Repository"
   - 选择 `songnestle/monad-card-game` 仓库

3. **配置项目**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **环境变量**
   在 Environment Variables 部分添加：
   ```
   VITE_CONTRACT_ADDRESS=0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030
   VITE_CHAIN_ID=10143
   VITE_NETWORK_NAME=Monad Testnet
   VITE_RPC_URL=https://testnet.monad.network
   VITE_EXPLORER_URL=https://testnet-explorer.monad.network
   ```

5. **点击 Deploy**
   - 等待部署完成
   - 获取生产环境 URL

## 手动部署（CLI）

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   cd /Users/nestle/monad-card-frontend
   vercel --prod
   ```

4. **首次部署时的配置**
   - Set up and deploy: `Y`
   - Which scope: 选择你的账户
   - Link to existing project: `N`
   - Project name: `monad-card-game`
   - Directory: `./`
   - Override settings: `N`

## 部署后验证

1. **访问生产环境 URL**
   - 检查页面是否正常加载
   - 测试钱包连接功能
   - 验证卡牌选择功能

2. **检查控制台**
   - 确保没有错误信息
   - 验证环境变量是否正确加载

3. **性能测试**
   - 使用 Lighthouse 测试性能
   - 确保加载时间符合预期

## 常见问题

### 构建失败
- 检查 Node.js 版本（需要 18.x）
- 确保所有依赖正确安装
- 查看构建日志定位错误

### 环境变量未生效
- 确保变量名以 `VITE_` 开头
- 重新部署项目
- 清除浏览器缓存

### 404 错误
- 检查 `vercel.json` 配置
- 确保 rewrites 规则正确

## 项目 URL

- GitHub: https://github.com/songnestle/monad-card-game
- Vercel Dashboard: https://vercel.com/dashboard
- 生产环境: [部署后获取]

---

**注意**: 每次推送到 main 分支都会触发自动部署
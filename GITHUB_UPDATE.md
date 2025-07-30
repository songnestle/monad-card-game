# 🔄 GitHub仓库更新指南

## 📋 需要更新的文件

### 1. src/main.jsx
```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ProductionApp from './ProductionApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProductionApp />
  </StrictMode>,
)
```

### 2. src/App.jsx (第193-195行)
替换：
```javascript
const [currentPrices] = useState({})
const [priceChanges] = useState({})
const [marketOverview] = useState(null)
```

## 🚀 更新方式

### 方式A：GitHub网页编辑（推荐）

1. 访问：https://github.com/songnestle/monad-card-game
2. 点击 `src/main.jsx` → ✏️ 编辑
3. 粘贴上面的main.jsx内容
4. 滚动到底部，填写提交信息：`🎴 切换到生产版本`
5. 点击 "Commit changes"
6. 重复步骤2-5编辑 `src/App.jsx`

### 方式B：命令行推送

```bash
# 在项目目录下执行
git push origin main
```

### 方式C：GitHub Desktop

1. 打开GitHub Desktop
2. 选择monad-card-game仓库
3. 查看更改
4. 添加提交信息
5. 点击"Commit to main"
6. 点击"Push origin"

## ✅ 更新完成后

Vercel会自动重新部署，2-3分钟后访问：
https://monad-card-game.vercel.app

你将看到完整的生产版本！

---
💡 **推荐使用方式A**，最简单可靠！
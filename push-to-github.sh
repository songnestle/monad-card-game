#!/bin/bash

echo "🚀 准备推送Monad卡牌游戏到GitHub..."

# 检查Git状态
echo "📋 检查Git状态..."
git status

echo ""
echo "📦 最新提交:"
git log --oneline -3

echo ""
echo "🔄 尝试推送到GitHub..."

# 尝试推送
if git push origin main; then
    echo "✅ 成功推送到GitHub!"
    echo "🌐 GitHub仓库: https://github.com/songnestle/monad-card-game"
    echo ""
    echo "🚀 接下来可以部署到Vercel:"
    echo "1. 访问 https://vercel.com"
    echo "2. 选择 songnestle/monad-card-game 仓库"
    echo "3. 点击 Deploy"
    echo "4. 等待构建完成"
else
    echo "❌ 推送失败，可能需要身份认证"
    echo ""
    echo "🔧 解决方案:"
    echo "1. 使用 GitHub Desktop 推送"
    echo "2. 或在浏览器中访问: https://github.com/songnestle/monad-card-game"
    echo "3. 手动上传文件"
fi
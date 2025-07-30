#!/bin/bash

echo "🔐 使用GitHub Token推送..."
echo "如果你有GitHub Personal Access Token，请输入："
echo "或者按Ctrl+C取消，使用网页方式更新"

read -s -p "GitHub Token: " GITHUB_TOKEN
echo ""

if [ -n "$GITHUB_TOKEN" ]; then
    # 设置临时认证
    git remote set-url origin "https://$GITHUB_TOKEN@github.com/songnestle/monad-card-game.git"
    
    echo "🚀 推送到GitHub..."
    if git push origin main; then
        echo "✅ 成功推送！"
        echo "🌐 GitHub: https://github.com/songnestle/monad-card-game"
        echo "🎮 游戏地址: https://monad-card-game.vercel.app"
    else
        echo "❌ 推送失败"
    fi
    
    # 恢复原始URL
    git remote set-url origin "https://github.com/songnestle/monad-card-game.git"
else
    echo "❌ 未提供Token，请使用网页方式更新"
fi
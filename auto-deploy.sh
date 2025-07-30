#!/bin/bash

# 🚀 Monad Card Game 自动部署脚本
echo "🎴 Monad Card Game - 自动部署开始..."

# 检查SSH密钥
if [ ! -f ~/.ssh/monad_card_game ]; then
    echo "❌ SSH密钥不存在，请先运行部署指南中的步骤"
    exit 1
fi

# 配置Git使用SSH密钥
git config core.sshCommand "ssh -i ~/.ssh/monad_card_game -F /dev/null"

# 更改远程URL为SSH
git remote remove origin 2>/dev/null
git remote add origin git@github.com:songnestle/monad-card-game.git

echo "🔄 推送代码到GitHub..."

# 推送代码
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ 代码推送成功！"
    echo "🌐 GitHub仓库：https://github.com/songnestle/monad-card-game"
    echo ""
    echo "📋 下一步：连接Vercel部署"
    echo "1. 访问：https://vercel.com"
    echo "2. GitHub登录 → New Project"
    echo "3. 导入 monad-card-game 仓库"
    echo "4. 点击 Deploy"
    echo "5. 等待构建完成获得公网地址"
    echo ""
    echo "🎉 预计公网地址：https://monad-card-game.vercel.app"
else
    echo "❌ 推送失败，请检查："
    echo "1. GitHub仓库是否已创建"
    echo "2. SSH密钥是否已添加到GitHub"
    echo "3. 仓库权限是否正确"
fi
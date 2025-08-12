#!/bin/bash

# 快速部署脚本 - Monad Card Game

echo "🚀 开始部署 Monad Card Game 到 Vercel..."
echo ""

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ 未检测到 Vercel CLI"
    echo "📦 正在安装 Vercel CLI..."
    npm i -g vercel
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

echo "✅ 构建成功！"
echo ""

# 部署选项
echo "请选择部署方式："
echo "1) 使用 Vercel CLI (需要登录)"
echo "2) 手动通过 Vercel 网站部署"
echo ""
read -p "请输入选项 (1 或 2): " choice

case $choice in
    1)
        echo ""
        echo "📝 使用 Vercel CLI 部署..."
        echo "如果这是首次部署，请按以下选项配置："
        echo "- Set up and deploy: Y"
        echo "- Which scope: 选择你的账户"
        echo "- Link to existing project: N"
        echo "- Project name: monad-card-game"
        echo "- Directory: ./"
        echo "- Override settings: N"
        echo ""
        vercel --prod
        ;;
    2)
        echo ""
        echo "📋 手动部署步骤："
        echo "1. 访问 https://vercel.com"
        echo "2. 点击 'New Project'"
        echo "3. 导入 GitHub 仓库: songnestle/monad-card-game"
        echo "4. 使用以下配置："
        echo "   - Framework: Vite"
        echo "   - Build Command: npm run build"
        echo "   - Output Directory: dist"
        echo ""
        echo "5. 添加环境变量："
        echo "   VITE_CONTRACT_ADDRESS=0x7466e8F15448e5D9D68868FBbeaa846B9fBbF030"
        echo "   VITE_CHAIN_ID=10143"
        echo "   VITE_NETWORK_NAME=Monad Testnet"
        echo "   VITE_RPC_URL=https://testnet.monad.network"
        echo "   VITE_EXPLORER_URL=https://testnet-explorer.monad.network"
        echo ""
        echo "📁 打开 Vercel 网站..."
        open https://vercel.com/new
        ;;
    *)
        echo "❌ 无效的选项"
        exit 1
        ;;
esac

echo ""
echo "🎉 部署流程完成！"
echo ""
echo "📝 部署后请记得："
echo "1. 测试钱包连接功能"
echo "2. 验证卡牌选择功能"
echo "3. 检查控制台是否有错误"
echo ""
echo "📊 GitHub 仓库: https://github.com/songnestle/monad-card-game"
#!/bin/bash

echo "🔍 检查 Monad Card Game 部署状态..."
echo ""

# 项目信息
GITHUB_REPO="https://github.com/songnestle/monad-card-game"
VERCEL_URL="https://monad-card-game.vercel.app"
VERCEL_DASHBOARD="https://vercel.com/songnestle/monad-card-game"

# 检查最新提交
echo "📝 最新 Git 提交："
git log -1 --oneline
echo ""

# 检查 Vercel 项目状态
echo "🌐 Vercel 部署信息："
echo "- 生产环境: $VERCEL_URL"
echo "- 控制面板: $VERCEL_DASHBOARD"
echo ""

# 测试网站可访问性
echo "🔗 测试网站连接..."
if curl -s -o /dev/null -w "%{http_code}" "$VERCEL_URL" | grep -q "200"; then
    echo "✅ 网站正常运行！"
else
    echo "⚠️  网站可能正在部署中，请稍等..."
fi
echo ""

# 提供操作选项
echo "📋 可用操作："
echo "1) 打开 Vercel 控制面板查看部署状态"
echo "2) 打开生产环境网站"
echo "3) 查看 GitHub 仓库"
echo "4) 查看本地构建"
echo "5) 退出"
echo ""
read -p "请选择操作 (1-5): " choice

case $choice in
    1)
        echo "打开 Vercel 控制面板..."
        open "$VERCEL_DASHBOARD"
        ;;
    2)
        echo "打开生产环境网站..."
        open "$VERCEL_URL"
        ;;
    3)
        echo "打开 GitHub 仓库..."
        open "$GITHUB_REPO"
        ;;
    4)
        echo "启动本地开发服务器..."
        npm run dev
        ;;
    5)
        echo "退出"
        ;;
    *)
        echo "无效选项"
        ;;
esac
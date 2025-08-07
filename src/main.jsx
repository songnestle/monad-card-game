import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StableGameApp from './StableGameApp.jsx'

// 确保React在全局范围内可用
if (typeof window !== 'undefined') {
  window.React = React
}

// 全局错误处理 - 在应用启动前就开始工作
console.log('🚀 [Main] Monad Card Game 启动序列开始...')

// 检测开发环境
const isDevelopment = import.meta.env.DEV

// 确保DOM就绪后再启动
const startApp = () => {
  console.log('📋 [Main] DOM就绪，开始渲染应用...')
  
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    console.error('❌ [Main] 找不到root元素!')
    return
  }

  try {
    console.log('⚛️ [Main] 创建React根节点...')
    const root = createRoot(rootElement)
    
    console.log('🛡️ [Main] 渲染StableGameApp（稳定游戏版本）...')
    root.render(
      <StrictMode>
        <StableGameApp />
      </StrictMode>
    )
    
    console.log('✅ [Main] 应用启动成功!')
    
  } catch (error) {
    console.error('❌ [Main] 应用启动失败:', error)
    
    // 兜底错误页面
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh;
        background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: Arial, sans-serif;
        padding: 20px;
        text-align: center;
      ">
        <div style="
          background: rgba(0,0,0,0.3);
          padding: 40px;
          border-radius: 20px;
          max-width: 500px;
        ">
          <div style="font-size: 4rem; margin-bottom: 20px;">💥</div>
          <h1 style="margin-bottom: 20px;">严重错误</h1>
          <p style="margin-bottom: 20px; opacity: 0.9;">
            应用在启动时遇到了严重错误。这可能是由于：
          </p>
          <ul style="text-align: left; margin-bottom: 30px;">
            <li>浏览器不兼容</li>
            <li>JavaScript被禁用</li>
            <li>网络连接问题</li>
            <li>扩展程序冲突</li>
          </ul>
          <div style="margin-bottom: 20px; font-family: monospace; font-size: 0.9rem; opacity: 0.8;">
            错误: ${error.message}
          </div>
          <button 
            onclick="window.location.reload()"
            style="
              background: #4ecdc4;
              color: white;
              border: none;
              padding: 15px 25px;
              border-radius: 25px;
              font-size: 1.1rem;
              cursor: pointer;
              font-weight: bold;
            "
          >
            🔄 刷新页面
          </button>
        </div>
      </div>
    `
  }
}

// 确保DOM完全加载后启动
if (document.readyState === 'loading') {
  console.log('⏳ [Main] 等待DOM加载完成...')
  document.addEventListener('DOMContentLoaded', startApp)
} else {
  console.log('✅ [Main] DOM已就绪，立即启动...')
  startApp()
}

#!/usr/bin/env node

const express = require('express')
const path = require('path')
const compression = require('compression')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 8083

// 优化中间件
app.use(compression()) // Gzip压缩
app.use(cors()) // 允许跨域

// 缓存控制
app.use((req, res, next) => {
  // 静态资源缓存1小时
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=3600')
  }
  // HTML文件不缓存
  if (req.url.match(/\.html$/)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  }
  next()
})

// 服务静态文件
app.use(express.static(path.join(__dirname, 'dist'), {
  etag: true,
  lastModified: true,
  maxAge: '1h'
}))

// SPA路由处理 - 所有路由都返回index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  res.status(500).json({ error: '服务器内部错误' })
})

// 启动服务器
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 优化服务器启动成功！`)
  console.log(`📍 本地访问: http://localhost:${PORT}`)
  console.log(`🌐 网络访问: http://0.0.0.0:${PORT}`)
  console.log(`⚡ 已启用: Gzip压缩、静态缓存、CORS支持`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('📴 收到SIGTERM信号，优雅关闭服务器...')
  server.close(() => {
    console.log('✅ 服务器已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('📴 收到SIGINT信号，优雅关闭服务器...')
  server.close(() => {
    console.log('✅ 服务器已关闭')
    process.exit(0)
  })
})
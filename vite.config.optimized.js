import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 使用 SWC 替代 Babel 以提升性能
      jsxRuntime: 'automatic',
      fastRefresh: true
    }),
    // 构建分析插件
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ],
  
  // 优化配置
  optimizeDeps: {
    include: ['ethers', 'react', 'react-dom'],
    exclude: []
  },
  
  // 构建优化
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // 代码分割
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ethers': ['ethers']
        },
        // 优化 chunk 名称
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 压缩大小报告
    reportCompressedSize: false,
    // chunk 大小警告限制
    chunkSizeWarningLimit: 1000
  },
  
  // 服务器配置
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
    cors: true,
    // 预热常用文件
    warmup: {
      clientFiles: ['./src/main.jsx', './src/MonadOptimizedApp.jsx']
    }
  },
  
  // 预览服务器配置
  preview: {
    port: 4173,
    strictPort: false,
    host: true,
    open: false,
    cors: true
  },
  
  // CSS 配置
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  },
  
  // 性能优化
  esbuild: {
    logLevel: 'error',
    drop: ['console', 'debugger']
  }
})
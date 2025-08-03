/**
 * usePerformanceMonitor.js - 性能监控和优化Hook
 * 监控组件渲染性能、内存使用、网络请求等
 */

import { useEffect, useRef, useCallback } from 'react'

// 性能监控工具类
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.observers = new Map()
    this.memoryThreshold = 50 * 1024 * 1024 // 50MB
    this.renderTimeThreshold = 16 // 16ms (60fps)
  }

  // 开始计时
  start(label) {
    this.metrics.set(label, {
      startTime: performance.now(),
      startMemory: this.getMemoryUsage()
    })
  }

  // 结束计时并记录
  end(label) {
    const metric = this.metrics.get(label)
    if (!metric) return null

    const endTime = performance.now()
    const endMemory = this.getMemoryUsage()
    
    const result = {
      label,
      duration: endTime - metric.startTime,
      memoryDelta: endMemory - metric.startMemory,
      timestamp: new Date().toISOString()
    }

    this.metrics.delete(label)
    this.logMetric(result)
    
    return result
  }

  // 获取内存使用情况
  getMemoryUsage() {
    if ('memory' in performance) {
      return performance.memory.usedJSHeapSize
    }
    return 0
  }

  // 检查内存泄漏
  checkMemoryLeak() {
    const currentMemory = this.getMemoryUsage()
    if (currentMemory > this.memoryThreshold) {
      console.warn(`⚠️ 内存使用过高: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`)
      return true
    }
    return false
  }

  // 记录性能指标
  logMetric(metric) {
    if (metric.duration > this.renderTimeThreshold) {
      console.warn(`🐌 慢渲染警告: ${metric.label} 耗时 ${metric.duration.toFixed(2)}ms`)
    }

    if (import.meta.env.DEV) {
      console.log(`📊 性能指标: ${metric.label}`, {
        duration: `${metric.duration.toFixed(2)}ms`,
        memory: `${(metric.memoryDelta / 1024).toFixed(2)}KB`
      })
    }
  }

  // 监控网络请求
  monitorNetworkRequests() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
            if (entry.duration > 5000) { // 超过5秒的请求
              console.warn(`🌐 慢网络请求: ${entry.name} 耗时 ${entry.duration.toFixed(2)}ms`)
            }
          }
        }
      })

      try {
        observer.observe({ entryTypes: ['navigation', 'resource'] })
        this.observers.set('network', observer)
      } catch (e) {
        console.warn('Performance Observer not supported')
      }
    }
  }

  // 清理监控器
  cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.metrics.clear()
  }
}

// Hook 主体
export function usePerformanceMonitor(componentName = 'Component') {
  const monitorRef = useRef(null)
  const renderCountRef = useRef(0)
  const lastRenderTimeRef = useRef(0)

  // 初始化监控器
  useEffect(() => {
    monitorRef.current = new PerformanceMonitor()
    monitorRef.current.monitorNetworkRequests()

    return () => {
      monitorRef.current?.cleanup()
    }
  }, [])

  // 监控组件渲染
  useEffect(() => {
    renderCountRef.current += 1
    const currentTime = performance.now()
    
    if (lastRenderTimeRef.current > 0) {
      const timeSinceLastRender = currentTime - lastRenderTimeRef.current
      
      if (timeSinceLastRender < 16 && renderCountRef.current > 1) {
        console.warn(`⚡ 频繁渲染警告: ${componentName} 在 ${timeSinceLastRender.toFixed(2)}ms 内重复渲染`)
      }
    }
    
    lastRenderTimeRef.current = currentTime

    // 每10次渲染检查一次内存
    if (renderCountRef.current % 10 === 0) {
      monitorRef.current?.checkMemoryLeak()
    }
  })

  // 性能计时器
  const startTimer = useCallback((label) => {
    monitorRef.current?.start(`${componentName}-${label}`)
  }, [componentName])

  const endTimer = useCallback((label) => {
    return monitorRef.current?.end(`${componentName}-${label}`)
  }, [componentName])

  // 监控异步操作
  const monitorAsync = useCallback(async (label, asyncFunction) => {
    startTimer(label)
    try {
      const result = await asyncFunction()
      endTimer(label)
      return result
    } catch (error) {
      endTimer(label)
      throw error
    }
  }, [startTimer, endTimer])

  // 防抖函数
  const debounce = useCallback((func, delay) => {
    const timeoutRef = useRef(null)
    
    return (...args) => {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => func(...args), delay)
    }
  }, [])

  // 节流函数
  const throttle = useCallback((func, delay) => {
    const lastCallRef = useRef(0)
    
    return (...args) => {
      const now = Date.now()
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        return func(...args)
      }
    }
  }, [])

  // 获取性能报告
  const getPerformanceReport = useCallback(() => {
    const memoryInfo = monitorRef.current?.getMemoryUsage()
    
    return {
      componentName,
      renderCount: renderCountRef.current,
      memoryUsage: memoryInfo ? `${(memoryInfo / 1024 / 1024).toFixed(2)}MB` : 'N/A',
      timestamp: new Date().toISOString()
    }
  }, [componentName])

  return {
    startTimer,
    endTimer,
    monitorAsync,
    debounce,
    throttle,
    getPerformanceReport,
    renderCount: renderCountRef.current
  }
}

// React DevTools 性能分析器
export function useProfiler(componentName) {
  const profilerRef = useRef()

  const onRenderCallback = useCallback((id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    if (actualDuration > 16) {
      console.warn(`📈 Profiler: ${id} ${phase} phase took ${actualDuration.toFixed(2)}ms`)
    }
  }, [])

  return {
    profileProps: {
      id: componentName,
      onRender: onRenderCallback
    }
  }
}

// 内存泄漏检测Hook
export function useMemoryLeak(componentName) {
  const initialMemoryRef = useRef(0)
  const timersRef = useRef(new Set())
  const intervalsRef = useRef(new Set())

  useEffect(() => {
    initialMemoryRef.current = performance.memory?.usedJSHeapSize || 0
  }, [])

  // 安全的定时器
  const safeSetTimeout = useCallback((callback, delay) => {
    const timerId = setTimeout(() => {
      timersRef.current.delete(timerId)
      callback()
    }, delay)
    
    timersRef.current.add(timerId)
    return timerId
  }, [])

  const safeSetInterval = useCallback((callback, delay) => {
    const intervalId = setInterval(callback, delay)
    intervalsRef.current.add(intervalId)
    return intervalId
  }, [])

  const clearSafeTimeout = useCallback((timerId) => {
    clearTimeout(timerId)
    timersRef.current.delete(timerId)
  }, [])

  const clearSafeInterval = useCallback((intervalId) => {
    clearInterval(intervalId)
    intervalsRef.current.delete(intervalId)
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 清理所有定时器
      timersRef.current.forEach(clearTimeout)
      intervalsRef.current.forEach(clearInterval)
      
      // 检查内存泄漏
      const currentMemory = performance.memory?.usedJSHeapSize || 0
      const memoryDiff = currentMemory - initialMemoryRef.current
      
      if (memoryDiff > 1024 * 1024) { // 1MB
        console.warn(`🚰 可能的内存泄漏: ${componentName} 增加了 ${(memoryDiff / 1024 / 1024).toFixed(2)}MB`)
      }
    }
  }, [componentName])

  return {
    safeSetTimeout,
    safeSetInterval,
    clearSafeTimeout,
    clearSafeInterval
  }
}

export default usePerformanceMonitor
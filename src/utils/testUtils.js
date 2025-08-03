/**
 * testUtils.js - 测试工具和验证函数
 * 用于验证应用的各种功能和边界条件
 */

// 网络测试工具
export const networkTests = {
  // 测试网络连接
  async testNetworkConnection() {
    try {
      const response = await fetch('https://testnet-rpc.monad.xyz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          id: 1
        })
      })
      
      const data = await response.json()
      const chainId = parseInt(data.result, 16)
      
      return {
        success: true,
        chainId,
        isCorrectNetwork: chainId === 10143,
        latency: response.headers.get('x-response-time') || 'N/A'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  },

  // 测试MetaMask可用性
  testMetaMaskAvailability() {
    return {
      isInstalled: typeof window.ethereum !== 'undefined',
      isMetaMask: window.ethereum?.isMetaMask || false,
      version: window.ethereum?.version || 'unknown',
      chainId: window.ethereum?.chainId || null
    }
  },

  // 测试合约连接
  async testContractConnection(contractAddress) {
    if (!contractAddress) {
      return { success: false, error: 'No contract address provided' }
    }

    try {
      const response = await fetch('https://testnet-rpc.monad.xyz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getCode',
          params: [contractAddress, 'latest'],
          id: 1
        })
      })
      
      const data = await response.json()
      const hasCode = data.result && data.result !== '0x'
      
      return {
        success: true,
        contractExists: hasCode,
        contractAddress,
        bytecodeLength: data.result?.length || 0
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// 安全测试工具
export const securityTests = {
  // 测试XSS防护
  testXSSProtection() {
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      '\'); alert(\'XSS\'); //\''
    ]

    const results = maliciousInputs.map(input => {
      // 测试是否被正确清理
      const div = document.createElement('div')
      div.textContent = input // 安全方式
      const cleaned = div.innerHTML
      
      return {
        input,
        cleaned,
        isSafe: !cleaned.includes('<script>') && !cleaned.includes('javascript:')
      }
    })

    return {
      allSafe: results.every(r => r.isSafe),
      results
    }
  },

  // 测试CSRF防护
  testCSRFProtection() {
    // 检查是否有CSRF tokens或其他防护措施
    const hasCsrfToken = document.querySelector('meta[name="csrf-token"]') !== null
    const hasSecureCookies = document.cookie.includes('Secure')
    
    return {
      hasCsrfToken,
      hasSecureCookies,
      recommendations: [
        !hasCsrfToken && 'Consider implementing CSRF tokens',
        !hasSecureCookies && 'Consider using Secure cookies'
      ].filter(Boolean)
    }
  },

  // 测试本地存储安全
  testLocalStorageSecurity() {
    const sensitivePatterns = [
      /private.*key/i,
      /secret/i,
      /password/i,
      /token/i,
      /api.*key/i
    ]

    const localStorageData = Object.keys(localStorage).map(key => ({
      key,
      value: localStorage.getItem(key),
      isSensitive: sensitivePatterns.some(pattern => 
        pattern.test(key) || pattern.test(localStorage.getItem(key) || '')
      )
    }))

    return {
      totalItems: localStorageData.length,
      sensitiveItems: localStorageData.filter(item => item.isSensitive),
      isSafe: localStorageData.every(item => !item.isSensitive)
    }
  }
}

// 性能测试工具
export const performanceTests = {
  // 测试页面加载性能
  getPageLoadMetrics() {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0]
      const paint = performance.getEntriesByType('paint')
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      }
    }
    return null
  },

  // 测试内存使用
  getMemoryMetrics() {
    if ('memory' in performance) {
      const memory = performance.memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2)
      }
    }
    return null
  },

  // 测试网络性能
  async testNetworkLatency(url = 'https://testnet-rpc.monad.xyz') {
    const times = []
    
    for (let i = 0; i < 3; i++) {
      const start = performance.now()
      try {
        await fetch(url, { method: 'HEAD', mode: 'no-cors' })
        times.push(performance.now() - start)
      } catch {
        times.push(null)
      }
    }

    const validTimes = times.filter(t => t !== null)
    
    return {
      attempts: times.length,
      successful: validTimes.length,
      averageLatency: validTimes.length > 0 ? 
        validTimes.reduce((a, b) => a + b, 0) / validTimes.length : null,
      minLatency: validTimes.length > 0 ? Math.min(...validTimes) : null,
      maxLatency: validTimes.length > 0 ? Math.max(...validTimes) : null
    }
  }
}

// 功能测试工具
export const functionalTests = {
  // 测试本地存储功能
  testLocalStorage() {
    try {
      const testKey = '__test_storage__'
      const testValue = 'test_value_' + Date.now()
      
      localStorage.setItem(testKey, testValue)
      const retrieved = localStorage.getItem(testKey)
      localStorage.removeItem(testKey)
      
      return {
        success: retrieved === testValue,
        available: true
      }
    } catch (error) {
      return {
        success: false,
        available: false,
        error: error.message
      }
    }
  },

  // 测试会话存储功能
  testSessionStorage() {
    try {
      const testKey = '__test_session__'
      const testValue = 'test_value_' + Date.now()
      
      sessionStorage.setItem(testKey, testValue)
      const retrieved = sessionStorage.getItem(testKey)
      sessionStorage.removeItem(testKey)
      
      return {
        success: retrieved === testValue,
        available: true
      }
    } catch (error) {
      return {
        success: false,
        available: false,
        error: error.message
      }
    }
  },

  // 测试Web3功能
  testWeb3Capabilities() {
    return {
      ethereum: typeof window.ethereum !== 'undefined',
      isMetaMask: window.ethereum?.isMetaMask || false,
      isConnected: window.ethereum?.isConnected?.() || false,
      chainId: window.ethereum?.chainId || null,
      selectedAddress: window.ethereum?.selectedAddress || null
    }
  }
}

// 边界条件测试
export const boundaryTests = {
  // 测试极大数值处理
  testLargeNumbers() {
    const testCases = [
      { input: Number.MAX_SAFE_INTEGER, expected: 'should handle correctly' },
      { input: Number.MAX_VALUE, expected: 'should handle correctly' },
      { input: Infinity, expected: 'should handle gracefully' },
      { input: -Infinity, expected: 'should handle gracefully' },
      { input: NaN, expected: 'should handle gracefully' }
    ]

    return testCases.map(test => {
      try {
        const result = parseFloat(test.input.toString())
        return {
          input: test.input,
          result,
          passed: !isNaN(result) || test.input !== test.input, // NaN check
          error: null
        }
      } catch (error) {
        return {
          input: test.input,
          result: null,
          passed: false,
          error: error.message
        }
      }
    })
  },

  // 测试空值和undefined处理
  testNullHandling() {
    const testInputs = [null, undefined, '', 0, false, [], {}]
    
    return testInputs.map(input => {
      try {
        // 测试常见的处理方式
        const stringified = String(input)
        const jsonSafe = JSON.stringify(input)
        
        return {
          input,
          stringified,
          jsonSafe,
          passed: true
        }
      } catch (error) {
        return {
          input,
          passed: false,
          error: error.message
        }
      }
    })
  }
}

// 运行所有测试
export async function runAllTests() {
  console.log('🧪 开始运行应用测试套件...')
  
  const results = {
    timestamp: new Date().toISOString(),
    network: {},
    security: {},
    performance: {},
    functional: {},
    boundary: {}
  }

  try {
    // 网络测试
    results.network.connection = await networkTests.testNetworkConnection()
    results.network.metamask = networkTests.testMetaMaskAvailability()
    results.network.contract = await networkTests.testContractConnection(
      import.meta.env.VITE_CONTRACT_ADDRESS
    )

    // 安全测试
    results.security.xss = securityTests.testXSSProtection()
    results.security.csrf = securityTests.testCSRFProtection()
    results.security.localStorage = securityTests.testLocalStorageSecurity()

    // 性能测试
    results.performance.pageLoad = performanceTests.getPageLoadMetrics()
    results.performance.memory = performanceTests.getMemoryMetrics()
    results.performance.network = await performanceTests.testNetworkLatency()

    // 功能测试
    results.functional.localStorage = functionalTests.testLocalStorage()
    results.functional.sessionStorage = functionalTests.testSessionStorage()
    results.functional.web3 = functionalTests.testWeb3Capabilities()

    // 边界测试
    results.boundary.largeNumbers = boundaryTests.testLargeNumbers()
    results.boundary.nullHandling = boundaryTests.testNullHandling()

    console.log('✅ 测试套件完成', results)
    return results

  } catch (error) {
    console.error('❌ 测试套件执行失败:', error)
    return { error: error.message, partialResults: results }
  }
}

// 导出快速测试函数
export function quickHealthCheck() {
  return {
    metamask: typeof window.ethereum !== 'undefined',
    localStorage: (() => {
      try {
        localStorage.setItem('test', 'test')
        localStorage.removeItem('test')
        return true
      } catch {
        return false
      }
    })(),
    networkConnected: navigator.onLine,
    performance: 'performance' in window,
    timestamp: new Date().toISOString()
  }
}

export default {
  networkTests,
  securityTests,
  performanceTests,
  functionalTests,
  boundaryTests,
  runAllTests,
  quickHealthCheck
}
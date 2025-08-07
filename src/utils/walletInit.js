/**
 * walletInit.js - 钱包初始化和冲突解决
 * 在应用启动前处理钱包扩展冲突问题
 */

// 备份原始ethereum对象
function backupOriginalEthereum() {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      // 备份原始ethereum引用
      if (!window.__ethereum_backup) {
        window.__ethereum_backup = window.ethereum
      }
      
      // 备份MetaMask引用
      if (window.ethereum.isMetaMask && !window.__metamask) {
        window.__metamask = window.ethereum
      }
    }
  } catch (error) {
    console.warn('备份ethereum对象失败:', error.message)
  }
}

// 处理Nightly钱包覆盖问题
function handleNightlyConflict() {
  try {
    // 延迟处理，让扩展完成初始化
    setTimeout(() => {
      if (window.ethereum?.isNightly && window.__metamask) {
        console.log('检测到Nightly钱包冲突，恢复MetaMask访问')
        
        // 创建代理对象，优先使用MetaMask
        const originalEthereum = window.ethereum
        const metamaskProvider = window.__metamask
        
        // 创建智能代理
        const proxyProvider = new Proxy(metamaskProvider, {
          get(target, prop) {
            // 对于关键方法，优先使用MetaMask
            if (['request', 'sendAsync', 'send'].includes(prop)) {
              return target[prop]?.bind(target)
            }
            
            // 对于标识属性，返回MetaMask的值
            if (prop === 'isMetaMask') {
              return true
            }
            
            if (prop === 'isNightly') {
              return false
            }
            
            return target[prop]
          }
        })
        
        // 安全地替换ethereum对象
        try {
          Object.defineProperty(window, 'ethereum', {
            value: proxyProvider,
            writable: true,
            configurable: true
          })
        } catch (defineError) {
          console.warn('无法重定义window.ethereum，使用备用方案')
          window.__preferred_ethereum = proxyProvider
        }
      }
    }, 200)
  } catch (error) {
    console.warn('处理Nightly冲突失败:', error.message)
  }
}

// 等待钱包扩展加载完成
function waitForWalletExtensions() {
  return new Promise((resolve) => {
    let attempts = 0
    const maxAttempts = 50 // 5秒超时
    
    const checkWallets = () => {
      attempts++
      
      if (attempts >= maxAttempts) {
        console.warn('钱包检测超时')
        resolve()
        return
      }
      
      // 检查是否有钱包可用
      if (typeof window !== 'undefined' && (window.ethereum || window.nightly)) {
        resolve()
      } else {
        setTimeout(checkWallets, 100)
      }
    }
    
    checkWallets()
  })
}

// 防止扩展脚本错误影响应用
function installGlobalErrorHandler() {
  const originalError = window.onerror
  const originalUnhandledRejection = window.onunhandledrejection
  
  window.onerror = function(message, source, lineno, colno, error) {
    // 忽略扩展相关错误
    if (source && (
      source.includes('chrome-extension://') ||
      source.includes('moz-extension://') ||
      source.includes('contentScript') ||
      source.includes('inject.ts')
    )) {
      console.warn('忽略扩展错误:', message)
      return true // 阻止错误传播
    }
    
    // 调用原始错误处理器
    if (originalError) {
      return originalError.apply(this, arguments)
    }
    
    return false
  }
  
  window.onunhandledrejection = function(event) {
    // 忽略MetaMask相关的Promise rejection
    if (event.reason?.message?.includes('MetaMask') || 
        event.reason?.message?.includes('ethereum')) {
      console.warn('忽略钱包Promise rejection:', event.reason.message)
      event.preventDefault()
      return
    }
    
    // 调用原始处理器
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(this, event)
    }
  }
}

// 主初始化函数
export async function initializeWalletEnvironment() {
  try {
    console.log('🔧 初始化钱包环境...')
    
    // 安装全局错误处理器
    installGlobalErrorHandler()
    
    // 备份原始ethereum对象
    backupOriginalEthereum()
    
    // 等待钱包扩展加载
    await waitForWalletExtensions()
    
    // 处理Nightly冲突
    handleNightlyConflict()
    
    console.log('✅ 钱包环境初始化完成')
    
    return {
      success: true,
      hasWallet: !!(window.ethereum || window.__preferred_ethereum),
      walletType: window.ethereum?.isMetaMask ? 'MetaMask' : 
                  window.ethereum?.isNightly ? 'Nightly' : 'Unknown'
    }
    
  } catch (error) {
    console.error('钱包环境初始化失败:', error)
    
    return {
      success: false,
      error: error.message,
      hasWallet: false
    }
  }
}

// 获取处理后的ethereum提供者
export function getProcessedEthereumProvider() {
  // 优先返回处理过的提供者
  if (window.__preferred_ethereum) {
    return window.__preferred_ethereum
  }
  
  // 返回备份的MetaMask
  if (window.__metamask && window.ethereum?.isNightly) {
    return window.__metamask
  }
  
  // 返回标准ethereum
  return window.ethereum || null
}

// 检测当前钱包状态
export function detectWalletStatus() {
  const provider = getProcessedEthereumProvider()
  
  return {
    hasProvider: !!provider,
    isMetaMask: !!(provider?.isMetaMask && !provider?.isNightly),
    isNightly: !!(provider?.isNightly),
    hasConflict: !!(window.ethereum?.isNightly && window.__metamask),
    providerCount: [window.ethereum, window.__metamask, window.__preferred_ethereum]
      .filter(Boolean).length
  }
}

export default {
  initializeWalletEnvironment,
  getProcessedEthereumProvider,
  detectWalletStatus
}
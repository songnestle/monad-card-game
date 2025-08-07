/**
 * walletUtils.js - 钱包检测和兼容性工具
 * 
 * 解决多钱包扩展冲突问题：
 * - MetaMask vs Nightly Wallet
 * - window.ethereum 重定义冲突
 * - 钱包检测和优先级管理
 */

// 支持的钱包类型
export const WALLET_TYPES = {
  METAMASK: 'metamask',
  NIGHTLY: 'nightly',
  COINBASE: 'coinbase',
  WALLET_CONNECT: 'walletconnect',
  UNKNOWN: 'unknown'
}

// 钱包优先级（数字越小优先级越高）
export const WALLET_PRIORITY = {
  [WALLET_TYPES.METAMASK]: 1,
  [WALLET_TYPES.COINBASE]: 2,
  [WALLET_TYPES.NIGHTLY]: 3,
  [WALLET_TYPES.WALLET_CONNECT]: 4,
  [WALLET_TYPES.UNKNOWN]: 99
}

// 安全的钱包检测
export function detectAvailableWallets() {
  const wallets = []
  
  try {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined') {
      return wallets
    }

    // 检测 MetaMask
    if (window.ethereum?.isMetaMask) {
      wallets.push({
        type: WALLET_TYPES.METAMASK,
        name: 'MetaMask',
        provider: window.ethereum,
        isInstalled: true,
        isPreferred: true
      })
    }

    // 检测 Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      wallets.push({
        type: WALLET_TYPES.COINBASE,
        name: 'Coinbase Wallet',
        provider: window.ethereum,
        isInstalled: true,
        isPreferred: false
      })
    }

    // 检测 Nightly Wallet
    if (window.nightly) {
      wallets.push({
        type: WALLET_TYPES.NIGHTLY,
        name: 'Nightly Wallet',
        provider: window.nightly.ethereum || window.ethereum,
        isInstalled: true,
        isPreferred: false
      })
    }

    // 检测通用 ethereum 提供者
    if (window.ethereum && !wallets.length) {
      wallets.push({
        type: WALLET_TYPES.UNKNOWN,
        name: 'Unknown Wallet',
        provider: window.ethereum,
        isInstalled: true,
        isPreferred: false
      })
    }

  } catch (error) {
    console.warn('钱包检测失败:', error.message)
  }

  return wallets.sort((a, b) => WALLET_PRIORITY[a.type] - WALLET_PRIORITY[b.type])
}

// 获取首选钱包提供者
export function getPreferredWalletProvider() {
  try {
    const wallets = detectAvailableWallets()
    
    if (wallets.length === 0) {
      return null
    }

    // 返回优先级最高的钱包
    return wallets[0].provider
  } catch (error) {
    console.error('获取钱包提供者失败:', error)
    return null
  }
}

// 安全的 ethereum 属性访问
export function getEthereumProvider() {
  try {
    // 优先使用 MetaMask
    if (window.ethereum?.isMetaMask) {
      return window.ethereum
    }

    // 检查多提供者情况
    if (window.ethereum?.providers) {
      const metamask = window.ethereum.providers.find(p => p.isMetaMask)
      if (metamask) {
        return metamask
      }
      
      // 返回第一个可用提供者
      return window.ethereum.providers[0]
    }

    // 返回通用提供者
    return window.ethereum || null
  } catch (error) {
    console.warn('获取Ethereum提供者失败:', error.message)
    return null
  }
}

// 钱包连接检查
export function checkWalletAvailability() {
  const provider = getEthereumProvider()
  
  return {
    isAvailable: !!provider,
    hasMetaMask: !!(provider?.isMetaMask),
    hasMultipleWallets: detectAvailableWallets().length > 1,
    provider: provider,
    wallets: detectAvailableWallets()
  }
}

// 钱包错误处理
export function handleWalletError(error) {
  if (!error) return { type: 'unknown', message: '未知错误' }
  
  const message = error.message || error.toString()
  
  // 用户取消操作
  if (error.code === 4001 || message.includes('User rejected')) {
    return {
      type: 'user_rejected',
      message: '用户取消了钱包操作',
      code: error.code
    }
  }
  
  // 网络错误
  if (error.code === 4902 || message.includes('Unrecognized chain')) {
    return {
      type: 'network_error', 
      message: '不支持的网络，请切换到Monad测试网',
      code: error.code
    }
  }
  
  // 余额不足
  if (message.includes('insufficient funds')) {
    return {
      type: 'insufficient_funds',
      message: '余额不足，请确保有足够的MON代币',
      code: error.code
    }
  }
  
  // 钱包未安装
  if (message.includes('ethereum is undefined')) {
    return {
      type: 'wallet_not_installed',
      message: '请安装MetaMask或其他Web3钱包',
      code: error.code
    }
  }
  
  // 钱包锁定
  if (message.includes('wallet is locked')) {
    return {
      type: 'wallet_locked',
      message: '请解锁您的钱包',
      code: error.code
    }
  }
  
  return {
    type: 'unknown',
    message: `钱包操作失败: ${message}`,
    code: error.code,
    originalError: error
  }
}

// 安全的钱包方法调用
export async function safeWalletCall(method, params = [], provider = null) {
  try {
    const walletProvider = provider || getEthereumProvider()
    
    if (!walletProvider) {
      throw new Error('钱包未安装或不可用')
    }
    
    if (!walletProvider.request) {
      throw new Error('钱包不支持请求方法')
    }
    
    return await walletProvider.request({
      method: method,
      params: params
    })
    
  } catch (error) {
    const handledError = handleWalletError(error)
    throw new Error(handledError.message)
  }
}

// 钱包兼容性检查
export function checkWalletCompatibility() {
  const checks = {
    browserSupport: typeof window !== 'undefined',
    ethereumAvailable: !!window.ethereum,
    web3Support: !!(window.ethereum?.request),
    metamaskInstalled: !!(window.ethereum?.isMetaMask),
    multipleWallets: detectAvailableWallets().length > 1
  }
  
  return {
    isCompatible: checks.browserSupport && checks.ethereumAvailable && checks.web3Support,
    checks: checks,
    recommendations: generateCompatibilityRecommendations(checks)
  }
}

// 生成兼容性建议
function generateCompatibilityRecommendations(checks) {
  const recommendations = []
  
  if (!checks.browserSupport) {
    recommendations.push('请在现代浏览器中打开此应用')
  }
  
  if (!checks.ethereumAvailable) {
    recommendations.push('请安装MetaMask或其他Web3钱包扩展')
  }
  
  if (!checks.web3Support) {
    recommendations.push('您的钱包版本可能过旧，请更新到最新版本')
  }
  
  if (!checks.metamaskInstalled && checks.ethereumAvailable) {
    recommendations.push('建议安装MetaMask以获得最佳体验')
  }
  
  if (checks.multipleWallets) {
    recommendations.push('检测到多个钱包，将优先使用MetaMask')
  }
  
  return recommendations
}

// 导出默认钱包工具
export default {
  detectAvailableWallets,
  getPreferredWalletProvider,
  getEthereumProvider,
  checkWalletAvailability,
  handleWalletError,
  safeWalletCall,
  checkWalletCompatibility,
  WALLET_TYPES
}
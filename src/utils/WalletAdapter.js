/**
 * WalletAdapter.js - 企业级钱包适配器
 * 
 * 功能：
 * 1. 支持多种钱包类型 (MetaMask, Coinbase, WalletConnect等)
 * 2. 智能冲突解决
 * 3. 用户友好的选择界面
 * 4. 详细的错误处理和反馈
 * 5. 移动端支持
 */

// 支持的钱包类型定义
export const WALLET_TYPES = {
  METAMASK: 'metamask',
  COINBASE: 'coinbase',
  WALLETCONNECT: 'walletconnect',
  NIGHTLY: 'nightly',
  PHANTOM: 'phantom',
  UNKNOWN: 'unknown'
}

// 钱包配置
export const WALLET_CONFIG = {
  [WALLET_TYPES.METAMASK]: {
    name: 'MetaMask',
    icon: '🦊',
    color: '#F6851B',
    downloadUrl: 'https://metamask.io/download/',
    mobile: false,
    priority: 1,
    description: '最受欢迎的以太坊钱包'
  },
  [WALLET_TYPES.COINBASE]: {
    name: 'Coinbase Wallet',
    icon: '💙',
    color: '#0052FF',
    downloadUrl: 'https://www.coinbase.com/wallet',
    mobile: true,
    priority: 2,
    description: '安全可靠的数字钱包'
  },
  [WALLET_TYPES.WALLETCONNECT]: {
    name: 'WalletConnect',
    icon: '🔗',
    color: '#3B99FC',
    downloadUrl: 'https://walletconnect.com/',
    mobile: true,
    priority: 3,
    description: '连接任何移动钱包'
  },
  [WALLET_TYPES.NIGHTLY]: {
    name: 'Nightly Wallet',
    icon: '🌙',
    color: '#9945FF',
    downloadUrl: 'https://nightly.app/',
    mobile: false,
    priority: 4,
    description: '多链钱包支持'
  }
}

// 检测设备类型
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 钱包检测器
class WalletDetector {
  constructor() {
    this.detectedWallets = []
    this.preferredWallet = null
  }

  // 检测所有可用钱包
  async detectWallets() {
    const wallets = []

    try {
      // 检测浏览器扩展钱包
      if (typeof window !== 'undefined' && window.ethereum) {
        // 多提供者情况
        if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
          window.ethereum.providers.forEach((provider, index) => {
            const walletInfo = this.identifyWallet(provider, `multi_${index}`)
            if (walletInfo) {
              wallets.push(walletInfo)
            }
          })
        } else {
          // 单一提供者
          const walletInfo = this.identifyWallet(window.ethereum, 'single')
          if (walletInfo) {
            wallets.push(walletInfo)
          }
        }
      }

      // 检测移动端钱包支持
      if (isMobile()) {
        wallets.push({
          id: 'walletconnect_mobile',
          type: WALLET_TYPES.WALLETCONNECT,
          name: 'Mobile Wallets',
          config: WALLET_CONFIG[WALLET_TYPES.WALLETCONNECT],
          provider: null,
          isInstalled: true,
          isAvailable: true,
          isMobile: true,
          connectMethod: 'walletconnect'
        })
      }

    } catch (error) {
      console.warn('钱包检测过程中出现错误:', error)
    }

    // 按优先级排序
    wallets.sort((a, b) => (a.config?.priority || 99) - (b.config?.priority || 99))

    this.detectedWallets = wallets
    this.preferredWallet = wallets.find(w => w.type === WALLET_TYPES.METAMASK && !w.isNightly) || wallets[0]

    return wallets
  }

  // 识别钱包类型
  identifyWallet(provider, id) {
    if (!provider) return null

    let type = WALLET_TYPES.UNKNOWN
    let isNightly = false

    // 识别钱包类型
    if (provider.isMetaMask && !provider.isNightly) {
      type = WALLET_TYPES.METAMASK
    } else if (provider.isCoinbaseWallet) {
      type = WALLET_TYPES.COINBASE
    } else if (provider.isNightly) {
      type = WALLET_TYPES.NIGHTLY
      isNightly = true
    }

    const config = WALLET_CONFIG[type] || {
      name: '未知钱包',
      icon: '❓',
      color: '#666666',
      priority: 99
    }

    return {
      id: `${type}_${id}`,
      type,
      name: config.name,
      config,
      provider,
      isInstalled: true,
      isAvailable: true,
      isNightly,
      isMobile: false,
      connectMethod: 'direct'
    }
  }

  // 获取推荐钱包
  getPreferredWallet() {
    return this.preferredWallet
  }

  // 获取所有钱包
  getAllWallets() {
    return this.detectedWallets
  }
}

// 钱包连接器
class WalletConnector {
  constructor() {
    this.currentWallet = null
    this.isConnecting = false
    this.listeners = new Map()
  }

  // 连接钱包
  async connect(walletInfo) {
    if (this.isConnecting) {
      throw new Error('正在连接中，请稍候...')
    }

    try {
      this.isConnecting = true
      this.emit('connecting', walletInfo)

      let provider
      let accounts

      if (walletInfo.connectMethod === 'direct' && walletInfo.provider) {
        // 直接连接浏览器钱包
        provider = walletInfo.provider
        accounts = await this.requestAccounts(provider)

      } else if (walletInfo.connectMethod === 'walletconnect') {
        // WalletConnect连接
        const wcProvider = await this.initWalletConnect()
        provider = wcProvider
        accounts = await this.requestAccounts(wcProvider)
      } else {
        throw new Error(`不支持的连接方式: ${walletInfo.connectMethod}`)
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('未获取到账户授权')
      }

      this.currentWallet = {
        ...walletInfo,
        provider,
        account: accounts[0],
        accounts
      }

      this.emit('connected', this.currentWallet)
      return this.currentWallet

    } catch (error) {
      this.emit('error', error)
      throw error
    } finally {
      this.isConnecting = false
    }
  }

  // 请求账户授权
  async requestAccounts(provider) {
    if (!provider || !provider.request) {
      throw new Error('钱包提供者无效')
    }

    try {
      return await provider.request({
        method: 'eth_requestAccounts'
      })
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('用户拒绝了连接请求')
      } else if (error.code === -32002) {
        throw new Error('已有待处理的连接请求，请在钱包中确认')
      } else {
        throw new Error(`连接失败: ${error.message}`)
      }
    }
  }

  // 初始化WalletConnect (简化版本，实际需要安装@walletconnect/web3-provider)
  async initWalletConnect() {
    // 这里应该是真正的WalletConnect初始化
    // 由于依赖问题，这里提供一个模拟实现
    console.log('初始化WalletConnect...')
    
    // 实际实现需要:
    // import WalletConnectProvider from '@walletconnect/web3-provider'
    
    throw new Error('WalletConnect功能需要安装额外依赖，请使用浏览器钱包')
  }

  // 断开连接
  async disconnect() {
    if (this.currentWallet) {
      try {
        if (this.currentWallet.provider && this.currentWallet.provider.disconnect) {
          await this.currentWallet.provider.disconnect()
        }
      } catch (error) {
        console.warn('断开连接时出现错误:', error)
      }

      const oldWallet = this.currentWallet
      this.currentWallet = null
      this.emit('disconnected', oldWallet)
    }
  }

  // 获取当前连接的钱包
  getCurrentWallet() {
    return this.currentWallet
  }

  // 检查连接状态
  isConnected() {
    return !!this.currentWallet
  }

  // 事件监听
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  // 触发事件
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`事件监听器执行失败 (${event}):`, error)
        }
      })
    }
  }
}

// 错误处理器
class WalletErrorHandler {
  static handleError(error) {
    const errorInfo = {
      type: 'UNKNOWN_ERROR',
      title: '未知错误',
      message: error.message || '发生了未知错误',
      code: error.code,
      severity: 'error',
      suggestions: []
    }

    // 根据错误类型提供具体建议
    const message = error.message?.toLowerCase() || ''
    
    if (error.code === 4001 || message.includes('user rejected')) {
      errorInfo.type = 'USER_REJECTED'
      errorInfo.title = '用户取消'
      errorInfo.message = '您取消了连接请求'
      errorInfo.severity = 'warning'
      errorInfo.suggestions = [
        '请重新点击连接按钮',
        '确保在钱包弹窗中点击"连接"或"确认"'
      ]
    } else if (error.code === -32002) {
      errorInfo.type = 'PENDING_REQUEST'
      errorInfo.title = '请求处理中'
      errorInfo.message = '已有待处理的连接请求'
      errorInfo.severity = 'warning'
      errorInfo.suggestions = [
        '请在钱包中确认待处理的请求',
        '或者刷新页面后重试'
      ]
    } else if (message.includes('ethereum is undefined') || message.includes('not installed')) {
      errorInfo.type = 'WALLET_NOT_INSTALLED'
      errorInfo.title = '钱包未安装'
      errorInfo.message = '未检测到Web3钱包'
      errorInfo.suggestions = [
        '请安装MetaMask或其他Web3钱包扩展',
        '刷新页面后重试',
        '确保钱包扩展已启用'
      ]
    } else if (message.includes('network') || message.includes('chain')) {
      errorInfo.type = 'NETWORK_ERROR'
      errorInfo.title = '网络错误'
      errorInfo.message = '网络连接或链配置错误'
      errorInfo.suggestions = [
        '检查网络连接',
        '确保连接到Monad测试网',
        '尝试切换到其他网络后再切换回来'
      ]
    } else if (message.includes('funds') || message.includes('balance')) {
      errorInfo.type = 'INSUFFICIENT_FUNDS'
      errorInfo.title = '余额不足'
      errorInfo.message = '账户余额不足以完成交易'
      errorInfo.suggestions = [
        '确保账户有足够的MON代币',
        '检查gas费用设置',
        '尝试获取测试网代币'
      ]
    }

    return errorInfo
  }
}

// 主钱包适配器类
class WalletAdapter {
  constructor() {
    this.detector = new WalletDetector()
    this.connector = new WalletConnector()
    this.errorHandler = WalletErrorHandler
    this.isInitialized = false
  }

  // 初始化适配器
  async initialize() {
    if (this.isInitialized) return

    try {
      console.log('🔧 初始化钱包适配器...')
      
      // 检测可用钱包
      await this.detector.detectWallets()
      
      console.log(`✅ 钱包适配器初始化完成，检测到 ${this.detector.getAllWallets().length} 个钱包`)
      this.isInitialized = true
      
    } catch (error) {
      console.error('❌ 钱包适配器初始化失败:', error)
      throw error
    }
  }

  // 获取所有可用钱包
  getAvailableWallets() {
    return this.detector.getAllWallets()
  }

  // 获取推荐钱包
  getPreferredWallet() {
    return this.detector.getPreferredWallet()
  }

  // 连接钱包
  async connectWallet(walletInfo) {
    try {
      const result = await this.connector.connect(walletInfo)
      console.log('✅ 钱包连接成功:', result.name)
      return result
    } catch (error) {
      const errorInfo = this.errorHandler.handleError(error)
      console.error('❌ 钱包连接失败:', errorInfo)
      throw errorInfo
    }
  }

  // 断开钱包连接
  async disconnectWallet() {
    await this.connector.disconnect()
  }

  // 获取当前连接的钱包
  getCurrentWallet() {
    return this.connector.getCurrentWallet()
  }

  // 检查是否已连接
  isConnected() {
    return this.connector.isConnected()
  }

  // 事件监听
  on(event, callback) {
    this.connector.on(event, callback)
  }

  off(event, callback) {
    this.connector.off(event, callback)
  }
}

// 创建全局实例
const walletAdapter = new WalletAdapter()

export { walletAdapter, WalletAdapter, WalletErrorHandler }
export default walletAdapter
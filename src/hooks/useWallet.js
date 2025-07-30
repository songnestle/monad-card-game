import { useState, useCallback, useEffect, useRef } from 'react'
import { ethers } from 'ethers'

const MONAD_CHAIN_CONFIG = {
  chainId: 10143,
  chainIdHex: '0x279f',
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
}

export const useWallet = (onLog) => {
  const [walletState, setWalletState] = useState({
    isConnected: false,
    isConnecting: false,
    address: null,
    balance: '0',
    chainId: null,
    error: null
  })

  const providerRef = useRef(null)
  const signerRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3

  const updateState = useCallback((updates) => {
    setWalletState(prev => ({ ...prev, ...updates }))
  }, [])

  // 安全的日志函数
  const safeLog = useCallback((message, type = 'info') => {
    if (onLog && typeof onLog === 'function') {
      onLog(message, type)
    }
  }, [onLog])

  // 检查MetaMask是否可用
  const checkMetaMaskAvailability = useCallback(() => {
    if (typeof window === 'undefined') return false
    if (!window.ethereum) return false
    if (!window.ethereum.isMetaMask) return false
    return true
  }, [])

  // 获取当前网络信息
  const getCurrentNetwork = useCallback(async () => {
    try {
      if (!window.ethereum) return null
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      return parseInt(chainId, 16)
    } catch (error) {
      safeLog(`获取网络信息失败: ${error.message}`, 'error')
      return null
    }
  }, [safeLog])

  // 切换到Monad网络
  const switchToMonadNetwork = useCallback(async () => {
    try {
      safeLog('正在切换到Monad测试网...', 'info')
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_CHAIN_CONFIG.chainIdHex }]
      })
      
      safeLog('✅ 网络切换成功', 'success')
      return true
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          safeLog('正在添加Monad测试网...', 'info')
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MONAD_CHAIN_CONFIG]
          })
          safeLog('✅ 网络添加成功', 'success')
          return true
        } catch (addError) {
          safeLog(`添加网络失败: ${addError.message}`, 'error')
          return false
        }
      } else {
        safeLog(`切换网络失败: ${switchError.message}`, 'error')
        return false
      }
    }
  }, [safeLog])

  // 获取账户余额
  const getBalance = useCallback(async (address) => {
    try {
      if (!providerRef.current) return '0'
      const balance = await providerRef.current.getBalance(address)
      return ethers.formatEther(balance)
    } catch (error) {
      safeLog(`获取余额失败: ${error.message}`, 'error')
      return '0'
    }
  }, [safeLog])

  // 连接钱包主函数
  const connectWallet = useCallback(async () => {
    if (!checkMetaMaskAvailability()) {
      const error = '请安装MetaMask钱包'
      updateState({ error, isConnecting: false })
      safeLog(error, 'error')
      return false
    }

    updateState({ isConnecting: true, error: null })
    safeLog('🔄 开始连接钱包...', 'info')

    try {
      // 请求账户访问权限
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('未获取到账户权限')
      }

      const address = accounts[0]
      safeLog(`📱 获取到账户: ${address.slice(0,8)}...`, 'info')

      // 检查并切换网络
      const currentChainId = await getCurrentNetwork()
      if (currentChainId !== MONAD_CHAIN_CONFIG.chainId) {
        const switched = await switchToMonadNetwork()
        if (!switched) {
          throw new Error('无法切换到Monad测试网')
        }
      }

      // 创建provider和signer
      providerRef.current = new ethers.BrowserProvider(window.ethereum)
      signerRef.current = await providerRef.current.getSigner()

      // 获取余额
      const balance = await getBalance(address)

      updateState({
        isConnected: true,
        isConnecting: false,
        address,
        balance,
        chainId: MONAD_CHAIN_CONFIG.chainId,
        error: null
      })

      safeLog(`✅ 钱包连接成功! 余额: ${balance} MON`, 'success')
      reconnectAttemptsRef.current = 0
      return true

    } catch (error) {
      const errorMsg = error.message || '连接失败'
      updateState({ 
        isConnected: false, 
        isConnecting: false, 
        error: errorMsg 
      })
      safeLog(`❌ 钱包连接失败: ${errorMsg}`, 'error')
      return false
    }
  }, [checkMetaMaskAvailability, updateState, safeLog, getCurrentNetwork, switchToMonadNetwork, getBalance])

  // 自动重连函数
  const attemptReconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      safeLog('❌ 达到最大重连次数，停止重连', 'error')
      return false
    }

    reconnectAttemptsRef.current++
    safeLog(`🔄 尝试重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`, 'info')
    
    const success = await connectWallet()
    if (success) {
      safeLog('✅ 重连成功', 'success')
      return true
    }

    // 指数退避重连
    const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000
    safeLog(`⏳ ${delay/1000}秒后重试...`, 'info')
    
    setTimeout(() => {
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        attemptReconnect()
      }
    }, delay)

    return false
  }, [connectWallet, safeLog])

  // 断开连接
  const disconnect = useCallback(() => {
    providerRef.current = null
    signerRef.current = null
    reconnectAttemptsRef.current = 0
    
    updateState({
      isConnected: false,
      isConnecting: false,
      address: null,
      balance: '0',
      chainId: null,
      error: null
    })
    
    safeLog('🔌 钱包已断开连接', 'info')
  }, [updateState, safeLog])

  // 刷新余额
  const refreshBalance = useCallback(async () => {
    if (!walletState.isConnected || !walletState.address) return
    
    const balance = await getBalance(walletState.address)
    updateState({ balance })
  }, [walletState.isConnected, walletState.address, getBalance, updateState])

  // 自动检测连接状态
  const checkConnection = useCallback(async () => {
    if (!checkMetaMaskAvailability()) return false

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' })
      if (accounts.length === 0) return false

      const currentChainId = await getCurrentNetwork()
      if (currentChainId !== MONAD_CHAIN_CONFIG.chainId) return false

      // 已连接状态，更新信息
      providerRef.current = new ethers.BrowserProvider(window.ethereum)
      signerRef.current = await providerRef.current.getSigner()
      
      const address = accounts[0]
      const balance = await getBalance(address)

      updateState({
        isConnected: true,
        address,
        balance,
        chainId: MONAD_CHAIN_CONFIG.chainId,
        error: null
      })

      safeLog('✅ 检测到已连接的钱包', 'success')
      return true

    } catch (error) {
      safeLog(`检查连接状态失败: ${error.message}`, 'error')
      return false
    }
  }, [checkMetaMaskAvailability, getCurrentNetwork, getBalance, updateState, safeLog])

  // 监听账户和网络变化
  useEffect(() => {
    if (!checkMetaMaskAvailability()) return

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        safeLog('👤 账户已断开连接', 'warning')
        disconnect()
      } else if (accounts[0] !== walletState.address) {
        safeLog(`👤 账户已切换: ${accounts[0].slice(0,8)}...`, 'info')
        connectWallet()
      }
    }

    const handleChainChanged = (chainId) => {
      const newChainId = parseInt(chainId, 16)
      safeLog(`🔗 网络已切换: ${newChainId}`, 'info')
      
      if (newChainId !== MONAD_CHAIN_CONFIG.chainId) {
        safeLog('⚠️ 请切换回Monad测试网', 'warning')
        updateState({ error: '请切换到Monad测试网' })
      } else {
        updateState({ chainId: newChainId, error: null })
        refreshBalance()
      }
    }

    const handleConnect = () => {
      safeLog('🔗 MetaMask已连接', 'success')
      checkConnection()
    }

    const handleDisconnect = () => {
      safeLog('🔌 MetaMask已断开', 'warning')
      disconnect()
    }

    // 添加事件监听器
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
    window.ethereum.on('connect', handleConnect)
    window.ethereum.on('disconnect', handleDisconnect)

    // 清理函数
    return () => {
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
        window.ethereum.removeListener('connect', handleConnect)
        window.ethereum.removeListener('disconnect', handleDisconnect)
      }
    }
  }, [checkMetaMaskAvailability, walletState.address, connectWallet, disconnect, updateState, safeLog, checkConnection, refreshBalance])

  // 初始化检查
  useEffect(() => {
    const initCheck = async () => {
      await checkConnection()
    }
    
    initCheck()
  }, [checkConnection])

  return {
    ...walletState,
    provider: providerRef.current,
    signer: signerRef.current,
    connectWallet,
    disconnect,
    refreshBalance,
    checkConnection,
    attemptReconnect
  }
}
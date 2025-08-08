import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';

// 支持的钱包配置 - 比任何竞品都全面
const SUPPORTED_WALLETS = {
  metamask: {
    name: 'MetaMask',
    icon: '🦊',
    downloadUrl: 'https://metamask.io/download/',
    detectKey: 'isMetaMask',
    priority: 1,
    features: ['web3', 'mobile', 'desktop'],
    color: '#F6851B'
  },
  coinbase: {
    name: 'Coinbase Wallet',
    icon: '🔵',
    downloadUrl: 'https://www.coinbase.com/wallet',
    detectKey: 'isCoinbaseWallet',
    priority: 2,
    features: ['web3', 'mobile'],
    color: '#0052FF'
  },
  walletconnect: {
    name: 'WalletConnect',
    icon: '🔗',
    downloadUrl: 'https://walletconnect.com/',
    detectKey: 'isWalletConnect',
    priority: 3,
    features: ['mobile', 'qr'],
    color: '#3B99FC'
  },
  trust: {
    name: 'Trust Wallet',
    icon: '🛡️',
    downloadUrl: 'https://trustwallet.com/',
    detectKey: 'isTrust',
    priority: 4,
    features: ['mobile'],
    color: '#3375BB'
  },
  phantom: {
    name: 'Phantom',
    icon: '👻',
    downloadUrl: 'https://phantom.app/',
    detectKey: 'isPhantom',
    priority: 5,
    features: ['web3', 'solana'],
    color: '#AB9FF2'
  },
  rabby: {
    name: 'Rabby',
    icon: '🐰',
    downloadUrl: 'https://rabby.io/',
    detectKey: 'isRabby',
    priority: 6,
    features: ['web3', 'defi'],
    color: '#7084FF'
  },
  rainbow: {
    name: 'Rainbow',
    icon: '🌈',
    downloadUrl: 'https://rainbow.me/',
    detectKey: 'isRainbow',
    priority: 7,
    features: ['mobile', 'nft'],
    color: '#FF6B6B'
  }
};

// Monad测试网配置
const MONAD_TESTNET = {
  chainId: '0x279f', // 10143
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18
  },
  rpcUrls: [
    'https://testnet-rpc.monad.xyz',
    'https://monad-testnet.rpc.tenderly.co',
    'https://testnet.monad.rpc.blxrbdn.com'
  ],
  blockExplorerUrls: [
    'https://testnet-explorer.monad.xyz'
  ]
};

// 高级钱包检测器
class WalletDetector {
  constructor() {
    this.detectedWallets = new Map();
    this.preferredWallet = null;
    this.conflictResolver = new WalletConflictResolver();
  }

  // 智能检测所有可用钱包
  async detectAllWallets() {
    const detected = new Map();
    
    if (typeof window === 'undefined' || !window.ethereum) {
      return detected;
    }

    // 处理钱包冲突和优先级
    const providers = this.getProviders();
    
    for (const [key, wallet] of Object.entries(SUPPORTED_WALLETS)) {
      const provider = this.findWalletProvider(providers, wallet);
      if (provider) {
        detected.set(key, {
          ...wallet,
          provider,
          isAvailable: true,
          isConnected: await this.checkConnection(provider),
          version: provider.version || 'unknown',
          accounts: []
        });
      }
    }

    this.detectedWallets = detected;
    this.preferredWallet = this.selectPreferredWallet(detected);
    
    return detected;
  }

  getProviders() {
    const providers = [];
    
    if (window.ethereum) {
      if (window.ethereum.providers) {
        // 多钱包环境
        providers.push(...window.ethereum.providers);
      } else {
        // 单钱包环境
        providers.push(window.ethereum);
      }
    }

    // 检查其他全局钱包对象
    ['web3', 'tronWeb', 'solana'].forEach(key => {
      if (window[key]) providers.push(window[key]);
    });

    return providers;
  }

  findWalletProvider(providers, walletConfig) {
    for (const provider of providers) {
      if (provider[walletConfig.detectKey] || 
          (provider.isMetaMask && walletConfig.detectKey === 'isMetaMask')) {
        return provider;
      }
    }
    return null;
  }

  async checkConnection(provider) {
    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    } catch {
      return false;
    }
  }

  selectPreferredWallet(wallets) {
    if (wallets.size === 0) return null;
    
    // 优先选择已连接的钱包
    for (const [key, wallet] of wallets) {
      if (wallet.isConnected) return key;
    }

    // 按优先级选择
    const sortedWallets = Array.from(wallets.entries())
      .sort((a, b) => a[1].priority - b[1].priority);
    
    return sortedWallets[0][0];
  }
}

// 钱包冲突解决器
class WalletConflictResolver {
  constructor() {
    this.conflicts = [];
    this.resolutionStrategies = new Map();
  }

  detectConflicts(wallets) {
    const conflicts = [];
    const providers = Array.from(wallets.values()).map(w => w.provider);
    
    // 检测MetaMask和其他钱包的冲突
    const metamask = wallets.get('metamask');
    const others = Array.from(wallets.entries()).filter(([key]) => key !== 'metamask');
    
    if (metamask && others.length > 0) {
      conflicts.push({
        type: 'metamask_override',
        primary: 'metamask',
        conflicting: others.map(([key]) => key),
        severity: 'high',
        resolution: 'Use wallet selection UI'
      });
    }

    return conflicts;
  }

  resolveConflict(conflict, userChoice) {
    switch (conflict.type) {
      case 'metamask_override':
        return this.resolveMetaMaskOverride(userChoice);
      default:
        return null;
    }
  }

  resolveMetaMaskOverride(preferredWallet) {
    // 实现MetaMask覆盖问题的解决方案
    return {
      action: 'select_provider',
      provider: preferredWallet,
      message: `已选择 ${preferredWallet} 作为首选钱包`
    };
  }
}

// 网络管理器
class NetworkManager {
  constructor() {
    this.supportedNetworks = new Map();
    this.currentNetwork = null;
    this.setupSupportedNetworks();
  }

  setupSupportedNetworks() {
    this.supportedNetworks.set('10143', {
      ...MONAD_TESTNET,
      name: 'Monad Testnet',
      isTestnet: true,
      faucetUrl: 'https://faucet.monad.xyz'
    });

    this.supportedNetworks.set('1', {
      chainId: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://ethereum.publicnode.com'],
      blockExplorerUrls: ['https://etherscan.io'],
      isTestnet: false
    });
  }

  async switchToMonadTestnet(provider) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET.chainId }]
      });
      return { success: true };
    } catch (switchError) {
      if (switchError.code === 4902) {
        return await this.addMonadTestnet(provider);
      }
      throw switchError;
    }
  }

  async addMonadTestnet(provider) {
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_TESTNET]
      });
      return { success: true, added: true };
    } catch (addError) {
      return { success: false, error: addError };
    }
  }

  async getCurrentNetwork(provider) {
    try {
      const chainId = await provider.request({ method: 'eth_chainId' });
      const networkId = parseInt(chainId, 16).toString();
      return this.supportedNetworks.get(networkId) || null;
    } catch {
      return null;
    }
  }
}

// 主钱包连接器组件
const WalletConnector = ({ onConnect, onDisconnect, onNetworkChange }) => {
  const [walletState, setWalletState] = useState({
    isConnecting: false,
    connectedWallet: null,
    connectedAccount: null,
    balance: '0',
    network: null,
    error: null
  });

  const [detectedWallets, setDetectedWallets] = useState(new Map());
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [showNetworkSwitcher, setShowNetworkSwitcher] = useState(false);
  
  const detector = useMemo(() => new WalletDetector(), []);
  const networkManager = useMemo(() => new NetworkManager(), []);

  // 初始化钱包检测
  useEffect(() => {
    const initWallets = async () => {
      try {
        const wallets = await detector.detectAllWallets();
        setDetectedWallets(wallets);
        
        // 自动尝试重连之前连接的钱包
        const savedWallet = localStorage.getItem('connectedWallet');
        if (savedWallet && wallets.has(savedWallet)) {
          const wallet = wallets.get(savedWallet);
          if (wallet.isConnected) {
            await connectWallet(savedWallet, true);
          }
        }
      } catch (error) {
        console.error('钱包初始化失败:', error);
      }
    };

    initWallets();
  }, []);

  // 连接钱包
  const connectWallet = useCallback(async (walletKey, isReconnect = false) => {
    const wallet = detectedWallets.get(walletKey);
    if (!wallet || !wallet.isAvailable) {
      setWalletState(prev => ({ ...prev, error: '钱包不可用' }));
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // 请求账户连接
      const accounts = await wallet.provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('用户拒绝连接');
      }

      const account = accounts[0];
      
      // 获取余额
      const ethersProvider = new ethers.BrowserProvider(wallet.provider);
      const balance = await ethersProvider.getBalance(account);
      
      // 获取网络信息
      const network = await networkManager.getCurrentNetwork(wallet.provider);
      
      // 检查是否需要切换到Monad测试网
      if (!network || network.chainId !== MONAD_TESTNET.chainId) {
        const switchResult = await networkManager.switchToMonadTestnet(wallet.provider);
        if (switchResult.success) {
          const newNetwork = await networkManager.getCurrentNetwork(wallet.provider);
          setWalletState(prev => ({ ...prev, network: newNetwork }));
        }
      }

      const newState = {
        isConnecting: false,
        connectedWallet: walletKey,
        connectedAccount: account,
        balance: ethers.formatEther(balance),
        network: network,
        error: null
      };

      setWalletState(newState);
      
      // 保存连接状态
      localStorage.setItem('connectedWallet', walletKey);
      
      // 设置事件监听
      setupWalletListeners(wallet.provider);
      
      // 通知父组件
      if (onConnect) {
        onConnect({
          wallet: walletKey,
          account: account,
          balance: ethers.formatEther(balance),
          provider: ethersProvider
        });
      }

      setShowWalletSelector(false);

      if (!isReconnect) {
        // 显示成功通知
        showSuccessNotification(`🎉 ${wallet.name} 连接成功！`);
      }

    } catch (error) {
      console.error('钱包连接失败:', error);
      let errorMessage = '连接失败';
      
      if (error.code === 4001) {
        errorMessage = '用户取消连接';
      } else if (error.code === -32002) {
        errorMessage = '钱包连接请求待处理，请检查钱包';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage
      }));
    }
  }, [detectedWallets, networkManager, onConnect]);

  // 断开连接
  const disconnectWallet = useCallback(async () => {
    setWalletState({
      isConnecting: false,
      connectedWallet: null,
      connectedAccount: null,
      balance: '0',
      network: null,
      error: null
    });

    localStorage.removeItem('connectedWallet');
    
    if (onDisconnect) {
      onDisconnect();
    }

    showSuccessNotification('👋 钱包已断开连接');
  }, [onDisconnect]);

  // 设置钱包事件监听
  const setupWalletListeners = (provider) => {
    if (provider.on) {
      provider.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setWalletState(prev => ({ ...prev, connectedAccount: accounts[0] }));
        }
      });

      provider.on('chainChanged', (chainId) => {
        window.location.reload(); // 简单处理网络切换
      });

      provider.on('disconnect', () => {
        disconnectWallet();
      });
    }
  };

  // 显示成功通知
  const showSuccessNotification = (message) => {
    // 这里可以集成更高级的通知系统
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #27AE60, #2ECC71);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      font-weight: bold;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // 渲染钱包选择器
  const renderWalletSelector = () => (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2C3E50, #34495E)',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: '#FFD700', margin: 0 }}>🚀 选择钱包</h2>
          <button
            onClick={() => setShowWalletSelector(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#E74C3C',
              fontSize: '24px',
              cursor: 'pointer'
            }}
          >×</button>
        </div>

        {Array.from(detectedWallets.values()).length === 0 ? (
          <div style={{ textAlign: 'center', color: '#BDC3C7' }}>
            <div style={{ fontSize: '4rem', marginBottom: '20px' }}>😕</div>
            <h3>未检测到钱包</h3>
            <p>请安装以下任意一款钱包：</p>
            <div style={{ display: 'grid', gap: '10px', marginTop: '20px' }}>
              {Object.entries(SUPPORTED_WALLETS).map(([key, wallet]) => (
                <a
                  key={key}
                  href={wallet.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    background: wallet.color + '20',
                    border: `2px solid ${wallet.color}`,
                    borderRadius: '10px',
                    color: 'white',
                    textDecoration: 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '2rem', marginRight: '15px' }}>{wallet.icon}</span>
                  <span style={{ fontWeight: 'bold' }}>{wallet.name}</span>
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {Array.from(detectedWallets.entries()).map(([key, wallet]) => (
              <button
                key={key}
                onClick={() => connectWallet(key)}
                disabled={walletState.isConnecting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '15px',
                  background: wallet.isConnected ? 
                    `linear-gradient(135deg, ${wallet.color}, ${wallet.color}CC)` :
                    `${wallet.color}20`,
                  border: `2px solid ${wallet.color}`,
                  borderRadius: '15px',
                  color: 'white',
                  cursor: walletState.isConnecting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: walletState.isConnecting ? 0.7 : 1
                }}
              >
                <span style={{ fontSize: '2.5rem', marginRight: '15px' }}>{wallet.icon}</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    {wallet.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                    {wallet.isConnected ? '✅ 已连接' : '可用'}
                    {wallet.version !== 'unknown' && ` (v${wallet.version})`}
                  </div>
                </div>
                {key === detector.preferredWallet && (
                  <span style={{
                    background: '#FFD700',
                    color: '#000',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    推荐
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(52, 152, 219, 0.2)',
          borderRadius: '10px',
          fontSize: '0.9rem',
          color: '#3498DB'
        }}>
          💡 <strong>提示：</strong>本游戏需要连接到 Monad 测试网，系统将自动为您切换网络。
        </div>
      </div>
    </div>
  );

  // 渲染连接状态
  const renderConnectionStatus = () => {
    if (!walletState.connectedWallet) {
      return (
        <button
          onClick={() => setShowWalletSelector(true)}
          disabled={walletState.isConnecting}
          style={{
            background: walletState.isConnecting ? 
              'linear-gradient(45deg, #95A5A6, #BDC3C7)' :
              'linear-gradient(45deg, #E74C3C, #C0392B)',
            border: 'none',
            color: 'white',
            padding: '15px 30px',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            borderRadius: '25px',
            cursor: walletState.isConnecting ? 'not-allowed' : 'pointer',
            boxShadow: '0 8px 25px rgba(231, 76, 60, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {walletState.isConnecting ? '🔄 连接中...' : '🔗 连接钱包'}
        </button>
      );
    }

    const wallet = detectedWallets.get(walletState.connectedWallet);
    return (
      <div style={{
        background: 'linear-gradient(135deg, #27AE60, #2ECC71)',
        borderRadius: '15px',
        padding: '20px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>{wallet?.icon}</span>
          <div>
            <div style={{ fontWeight: 'bold' }}>{wallet?.name} 已连接</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {walletState.connectedAccount?.slice(0, 6)}...{walletState.connectedAccount?.slice(-4)}
            </div>
          </div>
          <button
            onClick={disconnectWallet}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            断开
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
          <span>余额: {parseFloat(walletState.balance).toFixed(4)} MON</span>
          <span>网络: {walletState.network?.chainName || '未知'}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderConnectionStatus()}
      
      {walletState.error && (
        <div style={{
          background: 'linear-gradient(135deg, #E74C3C, #C0392B)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '10px',
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>⚠️ {walletState.error}</span>
          <button
            onClick={() => setWalletState(prev => ({ ...prev, error: null }))}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '15px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {showWalletSelector && renderWalletSelector()}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WalletConnector;
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // 本地测试网络
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    
    // Monad Testnet 配置
    monadTestnet: {
      url: process.env.MONAD_TESTNET_RPC || "https://rpc-testnet.monad.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 41454, // Monad Testnet Chain ID
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000
    },
    
    // 如果需要，可以添加其他测试网
    sepolia: {
      url: process.env.SEPOLIA_RPC || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },
  
  etherscan: {
    apiKey: {
      // 如果Monad有区块浏览器验证，可以在这里添加API key
      sepolia: process.env.ETHERSCAN_API_KEY || ""
    }
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
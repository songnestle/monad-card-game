const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 开始部署Monad Card Game合约...");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);
    console.log("部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));
    
    // 部署合约
    const MonadCardGame = await ethers.getContractFactory("MonadCardGame");
    const monadCardGame = await MonadCardGame.deploy();
    
    console.log("⏳ 等待合约部署...");
    await monadCardGame.waitForDeployment();
    
    const contractAddress = await monadCardGame.getAddress();
    console.log("✅ 合约部署成功!");
    console.log("📍 合约地址:", contractAddress);
    
    // 验证合约功能
    console.log("\n🔍 验证合约功能...");
    
    const lockDuration = await monadCardGame.LOCK_DURATION();
    const entryFee = await monadCardGame.ENTRY_FEE();
    const playerCount = await monadCardGame.getPlayerCount();
    const contractBalance = await monadCardGame.getContractBalance();
    
    console.log("锁定时长:", lockDuration.toString(), "秒 (24小时)");
    console.log("参与费用:", ethers.formatEther(entryFee), "ETH");
    console.log("玩家数量:", playerCount.toString());
    console.log("合约余额:", ethers.formatEther(contractBalance), "ETH");
    
    // 保存部署信息到文件
    const deploymentInfo = {
        contractAddress: contractAddress,
        deployer: deployer.address,
        network: (await deployer.provider.getNetwork()).name,
        blockNumber: await deployer.provider.getBlockNumber(),
        timestamp: new Date().toISOString(),
        lockDuration: lockDuration.toString(),
        entryFee: ethers.formatEther(entryFee)
    };
    
    const fs = require('fs');
    fs.writeFileSync(
        'deployment-info.json', 
        JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n📄 部署信息已保存到 deployment-info.json");
    
    // 生成前端配置
    const frontendConfig = {
        contractAddress: contractAddress,
        abi: [
            "function submitHand(string[] memory cardSymbols) external payable",
            "function getPlayerHand(address player) external view returns (string[] memory, uint256, bool)",
            "function canReselect(address player) external view returns (bool)",
            "function getUnlockTime(address player) external view returns (uint256)",
            "function getPlayerScore(address player) external view returns (uint256)",
            "function getAllPlayers() external view returns (address[] memory)",
            "function getPlayerCount() external view returns (uint256)",
            "function hasSubmittedHand(address player) external view returns (bool)",
            "event HandSubmitted(address indexed player, string[] cardSymbols, uint256 timestamp)",
            "event ScoreUpdated(address indexed player, uint256 newScore)"
        ]
    };
    
    fs.writeFileSync(
        'src/contract-config.json',
        JSON.stringify(frontendConfig, null, 2)
    );
    
    console.log("📱 前端配置已保存到 src/contract-config.json");
    console.log("\n🎉 部署完成! 请在前端代码中更新合约地址:");
    console.log(`const MONAD_CARD_GAME_CONTRACT = {
  address: "${contractAddress}",
  // ... rest of the config
};`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 部署失败:", error);
        process.exit(1);
    });
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MonadCardGame
 * @dev Monad测试网卡牌游戏合约
 * 
 * 使用说明：
 * 1. 复制此代码到 Remix IDE (https://remix.ethereum.org)
 * 2. 编译合约 (Ctrl+S)
 * 3. 连接MetaMask到Monad测试网
 * 4. 部署合约
 * 5. 复制合约地址到前端应用
 */
contract MonadCardGame {
    // 游戏参数
    uint256 public constant ENTRY_FEE = 0.01 ether;  // 参与费用
    uint256 public constant LOCK_DURATION = 24 hours; // 锁定时间
    
    // 状态变量
    address public owner;
    uint256 public totalSupply;
    uint256 public playerCount;
    
    // 玩家手牌结构
    struct Hand {
        string cards;           // 卡牌符号，逗号分隔
        uint256 submissionTime; // 提交时间
        bool isLocked;         // 是否锁定
    }
    
    // 映射
    mapping(address => Hand) public playerHands;
    mapping(address => uint256) public balances;
    
    // 事件
    event HandSubmitted(address indexed player, uint256 value, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev 提交手牌
     * @param cardSymbols 5张卡牌的符号数组，如: ["BTC", "ETH", "SOL", "BNB", "ADA"]
     */
    function submitHand(string[] memory cardSymbols) external payable {
        require(cardSymbols.length == 5, "Must submit exactly 5 cards");
        require(msg.value >= ENTRY_FEE, "Insufficient entry fee");
        
        // 将卡牌符号连接成字符串
        string memory cards = "";
        for (uint i = 0; i < cardSymbols.length; i++) {
            if (i > 0) cards = string(abi.encodePacked(cards, ","));
            cards = string(abi.encodePacked(cards, cardSymbols[i]));
        }
        
        // 保存玩家手牌
        playerHands[msg.sender] = Hand({
            cards: cards,
            submissionTime: block.timestamp,
            isLocked: true
        });
        
        // 更新玩家计数
        if (balances[msg.sender] == 0) {
            playerCount++;
        }
        
        // 更新余额
        balances[msg.sender] += msg.value;
        totalSupply += msg.value;
        
        emit HandSubmitted(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev 获取玩家手牌信息
     * @param player 玩家地址
     * @return cards 卡牌字符串
     * @return submissionTime 提交时间
     * @return isLocked 是否锁定
     * @return balance 玩家余额
     * @return unlockTime 解锁时间
     * @return currentTime 当前时间
     */
    function getPlayerHand(address player) external view returns (
        string memory cards,
        uint256 submissionTime,
        bool isLocked,
        uint256 balance,
        uint256 unlockTime,
        uint256 currentTime
    ) {
        Hand memory hand = playerHands[player];
        bool stillLocked = hand.isLocked && (block.timestamp < hand.submissionTime + LOCK_DURATION);
        
        return (
            hand.cards,
            hand.submissionTime,
            stillLocked,
            balances[player],
            hand.submissionTime + LOCK_DURATION,
            block.timestamp
        );
    }
    
    /**
     * @dev 检查玩家是否已提交手牌
     * @param player 玩家地址
     * @return 是否已提交
     */
    function hasSubmittedHand(address player) external view returns (bool) {
        return playerHands[player].submissionTime > 0;
    }
    
    /**
     * @dev 获取合约余额
     * @return 合约中的总金额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
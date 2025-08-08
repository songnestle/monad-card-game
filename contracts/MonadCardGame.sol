// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MonadCardGame {
    // 玩家手牌结构
    struct PlayerHand {
        string[] cardSymbols;      // 5张卡牌的符号
        uint256 submissionTime;    // 提交时间
        uint256 score;             // 当前分数
        bool isLocked;             // 是否锁定
    }
    
    // 游戏配置
    uint256 public constant LOCK_DURATION = 24 hours;  // 24小时锁定
    uint256 public constant ENTRY_FEE = 0.01 ether;    // 0.01 ETH参与费
    
    // 状态变量
    mapping(address => PlayerHand) public playerHands;
    address[] public players;
    address public owner;
    uint256 public totalPrizePool;
    
    // 事件
    event HandSubmitted(address indexed player, string[] cardSymbols, uint256 timestamp);
    event ScoreUpdated(address indexed player, uint256 newScore);
    event PrizeDistributed(address indexed player, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier validHandSize(string[] memory cardSymbols) {
        require(cardSymbols.length == 5, "Must submit exactly 5 cards");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * 提交手牌
     */
    function submitHand(string[] memory cardSymbols) 
        external 
        payable 
        validHandSize(cardSymbols) 
    {
        require(msg.value >= ENTRY_FEE, "Insufficient entry fee");
        require(canReselect(msg.sender), "Cannot reselect within 24 hours");
        
        // 如果是新玩家，添加到玩家列表
        if (playerHands[msg.sender].submissionTime == 0) {
            players.push(msg.sender);
        }
        
        // 保存手牌
        playerHands[msg.sender] = PlayerHand({
            cardSymbols: cardSymbols,
            submissionTime: block.timestamp,
            score: 0,
            isLocked: true
        });
        
        // 增加奖金池
        totalPrizePool += msg.value;
        
        emit HandSubmitted(msg.sender, cardSymbols, block.timestamp);
    }
    
    /**
     * 查询玩家手牌
     */
    function getPlayerHand(address player) 
        external 
        view 
        returns (string[] memory cardSymbols, uint256 submissionTime, bool isLocked) 
    {
        PlayerHand memory hand = playerHands[player];
        return (hand.cardSymbols, hand.submissionTime, hand.isLocked);
    }
    
    /**
     * 检查是否可以重新选择
     */
    function canReselect(address player) public view returns (bool) {
        PlayerHand memory hand = playerHands[player];
        if (hand.submissionTime == 0) return true; // 从未提交过
        return (block.timestamp >= hand.submissionTime + LOCK_DURATION);
    }
    
    /**
     * 获取解锁时间
     */
    function getUnlockTime(address player) external view returns (uint256) {
        PlayerHand memory hand = playerHands[player];
        if (hand.submissionTime == 0) return 0;
        return hand.submissionTime + LOCK_DURATION;
    }
    
    /**
     * 获取玩家分数
     */
    function getPlayerScore(address player) external view returns (uint256) {
        return playerHands[player].score;
    }
    
    /**
     * 更新玩家分数 (只有合约所有者可以调用)
     */
    function updatePlayerScore(address player, uint256 newScore) external onlyOwner {
        require(playerHands[player].isLocked, "Player hand not locked");
        playerHands[player].score = newScore;
        emit ScoreUpdated(player, newScore);
    }
    
    /**
     * 批量更新分数
     */
    function batchUpdateScores(address[] memory playerList, uint256[] memory scores) 
        external 
        onlyOwner 
    {
        require(playerList.length == scores.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < playerList.length; i++) {
            if (playerHands[playerList[i]].isLocked) {
                playerHands[playerList[i]].score = scores[i];
                emit ScoreUpdated(playerList[i], scores[i]);
            }
        }
    }
    
    /**
     * 获取所有玩家
     */
    function getAllPlayers() external view returns (address[] memory) {
        return players;
    }
    
    /**
     * 获取玩家数量
     */
    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }
    
    /**
     * 分发奖励 (只有合约所有者可以调用)
     */
    function distributePrizes(address[] memory winners, uint256[] memory amounts) 
        external 
        onlyOwner 
    {
        require(winners.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalDistribution = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalDistribution += amounts[i];
        }
        
        require(totalDistribution <= address(this).balance, "Insufficient contract balance");
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (amounts[i] > 0) {
                payable(winners[i]).transfer(amounts[i]);
                emit PrizeDistributed(winners[i], amounts[i]);
            }
        }
    }
    
    /**
     * 紧急提取 (只有合约所有者可以调用)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * 获取合约余额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * 检查玩家是否已提交手牌
     */
    function hasSubmittedHand(address player) external view returns (bool) {
        return playerHands[player].submissionTime > 0;
    }
}
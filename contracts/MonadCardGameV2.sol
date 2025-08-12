// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MonadCardGameV2
 * @dev 优化版 Monad 卡牌游戏合约
 * @notice 增强安全性、Gas 优化、防重入攻击
 */
contract MonadCardGameV2 {
    // 游戏状态枚举
    enum GameState { ACTIVE, PAUSED, ENDED }
    
    // 玩家手牌结构
    struct PlayerHand {
        string[] cardSymbols;      // 5张卡牌的符号
        uint256 submissionTime;    // 提交时间
        uint256 score;             // 当前分数
        bool isLocked;             // 是否锁定
        uint256 totalWinnings;     // 累计赢取金额
    }
    
    // 游戏统计
    struct GameStats {
        uint256 totalGames;        // 总游戏数
        uint256 totalPrizePool;    // 总奖池
        uint256 totalDistributed;  // 已分发奖金
        uint256 highestScore;      // 最高分
        address topPlayer;         // 最高分玩家
    }
    
    // 常量配置
    uint256 public constant LOCK_DURATION = 24 hours;
    uint256 public constant ENTRY_FEE = 0.01 ether;
    uint256 public constant MIN_PLAYERS = 2;
    uint256 public constant MAX_HAND_SIZE = 5;
    uint256 public constant OWNER_FEE_PERCENT = 5; // 5% 平台费
    
    // 状态变量
    mapping(address => PlayerHand) public playerHands;
    mapping(address => bool) public hasEverPlayed;
    address[] public activePlayers;
    address public immutable owner;
    GameState public gameState;
    GameStats public gameStats;
    
    // 防重入锁
    bool private locked;
    
    // 事件
    event HandSubmitted(address indexed player, string[] cardSymbols, uint256 timestamp);
    event ScoreUpdated(address indexed player, uint256 newScore);
    event PrizeDistributed(address indexed player, uint256 amount);
    event GameStateChanged(GameState newState);
    event EmergencyWithdrawal(address indexed owner, uint256 amount);
    
    // 修饰器
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }
    
    modifier gameActive() {
        require(gameState == GameState.ACTIVE, "Game not active");
        _;
    }
    
    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }
    
    modifier validHandSize(string[] memory cardSymbols) {
        require(cardSymbols.length == MAX_HAND_SIZE, "Invalid hand size");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        gameState = GameState.ACTIVE;
    }
    
    /**
     * @dev 提交手牌
     * @param cardSymbols 5张卡牌符号数组
     */
    function submitHand(string[] memory cardSymbols) 
        external 
        payable 
        gameActive
        nonReentrant
        validHandSize(cardSymbols) 
    {
        require(msg.value >= ENTRY_FEE, "Insufficient fee");
        require(canReselect(msg.sender), "Still locked");
        require(validateCardSymbols(cardSymbols), "Invalid cards");
        
        // 记录新玩家
        if (!hasEverPlayed[msg.sender]) {
            hasEverPlayed[msg.sender] = true;
            gameStats.totalGames++;
        }
        
        // 如果玩家当前没有活跃手牌，添加到活跃玩家列表
        if (playerHands[msg.sender].submissionTime == 0 || !playerHands[msg.sender].isLocked) {
            activePlayers.push(msg.sender);
        }
        
        // 保存手牌
        playerHands[msg.sender] = PlayerHand({
            cardSymbols: cardSymbols,
            submissionTime: block.timestamp,
            score: 0,
            isLocked: true,
            totalWinnings: playerHands[msg.sender].totalWinnings
        });
        
        // 更新奖池
        gameStats.totalPrizePool += msg.value;
        
        emit HandSubmitted(msg.sender, cardSymbols, block.timestamp);
    }
    
    /**
     * @dev 验证卡牌符号有效性
     */
    function validateCardSymbols(string[] memory symbols) private pure returns (bool) {
        // 基础验证 - 实际应用中应验证符号是否在允许列表中
        for (uint i = 0; i < symbols.length; i++) {
            if (bytes(symbols[i]).length == 0) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * @dev 批量更新分数（Gas优化版）
     */
    function batchUpdateScores(address[] calldata playerList, uint256[] calldata scores) 
        external 
        onlyOwner 
    {
        require(playerList.length == scores.length, "Length mismatch");
        require(playerList.length <= 100, "Batch too large");
        
        for (uint256 i = 0; i < playerList.length; i++) {
            if (playerHands[playerList[i]].isLocked) {
                playerHands[playerList[i]].score = scores[i];
                
                // 更新最高分
                if (scores[i] > gameStats.highestScore) {
                    gameStats.highestScore = scores[i];
                    gameStats.topPlayer = playerList[i];
                }
                
                emit ScoreUpdated(playerList[i], scores[i]);
            }
        }
    }
    
    /**
     * @dev 分发奖励（安全版）
     */
    function distributePrizes(address[] calldata winners, uint256[] calldata amounts) 
        external 
        onlyOwner
        nonReentrant 
    {
        require(winners.length == amounts.length, "Length mismatch");
        require(winners.length <= 10, "Too many winners");
        
        uint256 totalDistribution = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalDistribution += amounts[i];
        }
        
        uint256 availableBalance = address(this).balance;
        require(totalDistribution <= availableBalance, "Insufficient balance");
        
        // 分发奖金
        for (uint256 i = 0; i < winners.length; i++) {
            if (amounts[i] > 0 && winners[i] != address(0)) {
                playerHands[winners[i]].totalWinnings += amounts[i];
                gameStats.totalDistributed += amounts[i];
                
                (bool success, ) = payable(winners[i]).call{value: amounts[i]}("");
                require(success, "Transfer failed");
                
                emit PrizeDistributed(winners[i], amounts[i]);
            }
        }
    }
    
    /**
     * @dev 清理非活跃玩家（Gas优化）
     */
    function cleanupInactivePlayers() external onlyOwner {
        address[] memory newActivePlayers = new address[](activePlayers.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < activePlayers.length; i++) {
            if (playerHands[activePlayers[i]].isLocked && 
                block.timestamp < playerHands[activePlayers[i]].submissionTime + LOCK_DURATION) {
                newActivePlayers[activeCount] = activePlayers[i];
                activeCount++;
            }
        }
        
        // 重置活跃玩家数组
        delete activePlayers;
        for (uint256 i = 0; i < activeCount; i++) {
            activePlayers.push(newActivePlayers[i]);
        }
    }
    
    /**
     * @dev 获取游戏状态视图
     */
    function getGameStatus() external view returns (
        uint256 totalPlayers,
        uint256 activePlayers_,
        uint256 prizePool,
        uint256 distributed,
        address topPlayer,
        uint256 highScore
    ) {
        return (
            gameStats.totalGames,
            activePlayers.length,
            gameStats.totalPrizePool,
            gameStats.totalDistributed,
            gameStats.topPlayer,
            gameStats.highestScore
        );
    }
    
    /**
     * @dev 获取玩家详细信息
     */
    function getPlayerDetails(address player) external view returns (
        string[] memory cardSymbols,
        uint256 submissionTime,
        uint256 score,
        bool isLocked,
        uint256 totalWinnings,
        bool canReselectNow,
        uint256 unlockTime
    ) {
        PlayerHand memory hand = playerHands[player];
        bool canReselect_ = canReselect(player);
        uint256 unlock = hand.submissionTime > 0 ? hand.submissionTime + LOCK_DURATION : 0;
        
        return (
            hand.cardSymbols,
            hand.submissionTime,
            hand.score,
            hand.isLocked,
            hand.totalWinnings,
            canReselect_,
            unlock
        );
    }
    
    /**
     * @dev 检查是否可以重新选择
     */
    function canReselect(address player) public view returns (bool) {
        PlayerHand memory hand = playerHands[player];
        if (hand.submissionTime == 0) return true;
        return block.timestamp >= hand.submissionTime + LOCK_DURATION;
    }
    
    /**
     * @dev 暂停/恢复游戏
     */
    function setGameState(GameState newState) external onlyOwner {
        require(newState != gameState, "State unchanged");
        gameState = newState;
        emit GameStateChanged(newState);
    }
    
    /**
     * @dev 提取平台费用
     */
    function withdrawPlatformFee() external onlyOwner nonReentrant {
        uint256 platformFee = (gameStats.totalPrizePool * OWNER_FEE_PERCENT) / 100;
        uint256 withdrawable = platformFee - gameStats.totalDistributed;
        
        require(withdrawable > 0, "No fees to withdraw");
        require(address(this).balance >= withdrawable, "Insufficient balance");
        
        (bool success, ) = payable(owner).call{value: withdrawable}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev 紧急提取（仅在游戏结束时）
     */
    function emergencyWithdraw() external onlyOwner nonReentrant {
        require(gameState == GameState.ENDED, "Game not ended");
        
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit EmergencyWithdrawal(owner, balance);
    }
    
    /**
     * @dev 获取合约余额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev 获取活跃玩家列表
     */
    function getActivePlayers() external view returns (address[] memory) {
        return activePlayers;
    }
    
    /**
     * @dev 接收函数
     */
    receive() external payable {
        gameStats.totalPrizePool += msg.value;
    }
}
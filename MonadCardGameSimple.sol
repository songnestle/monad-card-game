// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MonadCardGame {
    uint256 public constant ENTRY_FEE = 0.01 ether;
    
    struct PlayerHand {
        string cards;
        uint256 submissionTime;
    }
    
    mapping(address => PlayerHand) public playerHands;
    mapping(address => uint256) public balances;
    
    event HandSubmitted(address indexed player, uint256 value, uint256 timestamp);
    
    function submitHand(string[] memory cardSymbols) external payable {
        require(cardSymbols.length == 5, "Must submit 5 cards");
        require(msg.value >= ENTRY_FEE, "Insufficient fee");
        
        // Join cards with comma
        string memory cards = cardSymbols[0];
        for (uint i = 1; i < cardSymbols.length; i++) {
            cards = string(abi.encodePacked(cards, ",", cardSymbols[i]));
        }
        
        playerHands[msg.sender] = PlayerHand({
            cards: cards,
            submissionTime: block.timestamp
        });
        
        balances[msg.sender] += msg.value;
        
        emit HandSubmitted(msg.sender, msg.value, block.timestamp);
    }
    
    function getPlayerHand(address player) external view returns (
        string memory cards,
        uint256 submissionTime,
        bool isLocked,
        uint256 balance,
        uint256 unlockTime,
        uint256 currentTime
    ) {
        PlayerHand memory hand = playerHands[player];
        return (
            hand.cards,
            hand.submissionTime,
            hand.submissionTime > 0,
            balances[player],
            hand.submissionTime + 24 hours,
            block.timestamp
        );
    }
    
    function hasSubmittedHand(address player) external view returns (bool) {
        return bytes(playerHands[player].cards).length > 0;
    }
}
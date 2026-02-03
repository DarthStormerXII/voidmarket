// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/**
 * @title VoidMarketCore
 * @notice Main contract for prediction markets with hidden bet directions
 * @dev Bets use commitment hashes - direction is hidden until reveal
 *
 * Key Features:
 * - Markets created with questions and deadlines
 * - Users place bets via commitment hashes (keccak256(direction, salt))
 * - Users reveal bets after market resolution
 * - Winnings distributed based on reveals
 * - Forked markets inherit resolution from parent
 *
 * Arc Testnet: USDC is native (18 decimals for native, 6 for ERC20 interface)
 */
contract VoidMarketCore is ReentrancyGuard {
    // ============ Enums ============

    enum MarketStatus {
        ACTIVE,
        RESOLVED,
        CANCELLED
    }

    // ============ Structs ============

    struct Market {
        uint256 id;
        string question;
        address creator;
        uint256 deadline;           // Betting deadline
        uint256 resolutionDeadline; // Must resolve by this time
        MarketStatus status;
        bool outcome;               // true = YES won, false = NO won
        uint256 totalYesAmount;     // Revealed YES bets total
        uint256 totalNoAmount;      // Revealed NO bets total
        uint256 totalPool;          // Total USDC in market
        bool isForked;              // Private market forked from public
        uint256 parentMarketId;     // 0 if original, parent ID if forked
        uint256 revealDeadline;     // Deadline to reveal bets
    }

    struct Bet {
        address bettor;
        uint256 marketId;
        uint256 amount;
        bytes32 commitmentHash;     // keccak256(abi.encodePacked(direction, salt))
        bool revealed;
        bool direction;             // true = YES, false = NO (only valid after reveal)
        uint256 timestamp;
        bool claimed;
    }

    // ============ State Variables ============

    address public admin;
    uint256 public marketCount;
    uint256 public betCount;

    // Market ID => Market
    mapping(uint256 => Market) public markets;

    // Bet ID => Bet
    mapping(uint256 => Bet) public bets;

    // Market ID => Bettor => Bet IDs
    mapping(uint256 => mapping(address => uint256[])) public userBets;

    // Market ID => Array of all bet IDs
    mapping(uint256 => uint256[]) public marketBets;

    // Market ID => Child forked market IDs
    mapping(uint256 => uint256[]) public forkedMarkets;

    // ============ Events ============

    event MarketCreated(
        uint256 indexed marketId,
        address indexed creator,
        string question,
        uint256 deadline,
        uint256 resolutionDeadline,
        bool isForked,
        uint256 parentMarketId
    );

    event BetPlaced(
        uint256 indexed betId,
        uint256 indexed marketId,
        address indexed bettor,
        uint256 amount,
        bytes32 commitmentHash
    );

    event BetRevealed(
        uint256 indexed betId,
        uint256 indexed marketId,
        address indexed bettor,
        bool direction
    );

    event MarketResolved(
        uint256 indexed marketId,
        bool outcome,
        uint256 totalYesAmount,
        uint256 totalNoAmount
    );

    event WinningsClaimed(
        uint256 indexed betId,
        uint256 indexed marketId,
        address indexed claimer,
        uint256 amount
    );

    event MarketCancelled(uint256 indexed marketId);

    // ============ Errors ============

    error OnlyAdmin();
    error MarketNotActive();
    error MarketNotResolved();
    error BettingDeadlinePassed();
    error BettingDeadlineNotPassed();
    error RevealDeadlinePassed();
    error InvalidCommitment();
    error AlreadyRevealed();
    error AlreadyClaimed();
    error NotWinner();
    error InsufficientAmount();
    error TransferFailed();
    error InvalidParentMarket();
    error ParentNotResolved();
    error NoBetsToRefund();

    // ============ Modifiers ============

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    // ============ Constructor ============

    constructor() {
        admin = msg.sender;
    }

    // ============ External Functions ============

    /**
     * @notice Create a new prediction market
     * @param question The market question
     * @param deadline Timestamp when betting closes
     * @param resolutionDeadline Timestamp when market must be resolved
     * @return marketId The ID of the created market
     */
    function createMarket(
        string calldata question,
        uint256 deadline,
        uint256 resolutionDeadline
    ) external returns (uint256 marketId) {
        require(deadline > block.timestamp, "Deadline must be in future");
        require(resolutionDeadline > deadline, "Resolution must be after deadline");

        marketId = ++marketCount;

        markets[marketId] = Market({
            id: marketId,
            question: question,
            creator: msg.sender,
            deadline: deadline,
            resolutionDeadline: resolutionDeadline,
            status: MarketStatus.ACTIVE,
            outcome: false,
            totalYesAmount: 0,
            totalNoAmount: 0,
            totalPool: 0,
            isForked: false,
            parentMarketId: 0,
            revealDeadline: resolutionDeadline + 1 days // 24h to reveal after resolution
        });

        emit MarketCreated(
            marketId,
            msg.sender,
            question,
            deadline,
            resolutionDeadline,
            false,
            0
        );
    }

    /**
     * @notice Create a forked (private) market from a public market
     * @param parentMarketId The parent market to fork from
     * @param customQuestion Optional custom question (empty = inherit)
     * @param deadline Custom deadline (0 = inherit)
     * @param resolutionDeadline Custom resolution deadline (0 = inherit)
     * @return marketId The ID of the forked market
     */
    function createForkedMarket(
        uint256 parentMarketId,
        string calldata customQuestion,
        uint256 deadline,
        uint256 resolutionDeadline
    ) external returns (uint256 marketId) {
        Market storage parent = markets[parentMarketId];
        if (parent.id == 0) revert InvalidParentMarket();
        if (parent.isForked) revert InvalidParentMarket(); // Can't fork a fork

        // Use parent values if not specified
        uint256 _deadline = deadline > 0 ? deadline : parent.deadline;
        uint256 _resolutionDeadline = resolutionDeadline > 0 ? resolutionDeadline : parent.resolutionDeadline;
        string memory _question;
        if (bytes(customQuestion).length > 0) {
            _question = customQuestion;
        } else {
            _question = parent.question;
        }

        require(_deadline > block.timestamp, "Deadline must be in future");
        require(_resolutionDeadline > _deadline, "Resolution must be after deadline");

        marketId = ++marketCount;

        markets[marketId] = Market({
            id: marketId,
            question: _question,
            creator: msg.sender,
            deadline: _deadline,
            resolutionDeadline: _resolutionDeadline,
            status: MarketStatus.ACTIVE,
            outcome: false,
            totalYesAmount: 0,
            totalNoAmount: 0,
            totalPool: 0,
            isForked: true,
            parentMarketId: parentMarketId,
            revealDeadline: _resolutionDeadline + 1 days
        });

        forkedMarkets[parentMarketId].push(marketId);

        emit MarketCreated(
            marketId,
            msg.sender,
            _question,
            _deadline,
            _resolutionDeadline,
            true,
            parentMarketId
        );
    }

    /**
     * @notice Place a bet on a market with hidden direction
     * @param marketId The market to bet on
     * @param commitmentHash keccak256(abi.encodePacked(direction, salt))
     * @dev Direction is hidden - only revealed after market resolution
     */
    function placeBet(
        uint256 marketId,
        bytes32 commitmentHash
    ) external payable nonReentrant returns (uint256 betId) {
        Market storage market = markets[marketId];

        if (market.status != MarketStatus.ACTIVE) revert MarketNotActive();
        if (block.timestamp >= market.deadline) revert BettingDeadlinePassed();
        if (msg.value == 0) revert InsufficientAmount();

        betId = ++betCount;

        bets[betId] = Bet({
            bettor: msg.sender,
            marketId: marketId,
            amount: msg.value,
            commitmentHash: commitmentHash,
            revealed: false,
            direction: false,
            timestamp: block.timestamp,
            claimed: false
        });

        market.totalPool += msg.value;
        userBets[marketId][msg.sender].push(betId);
        marketBets[marketId].push(betId);

        emit BetPlaced(betId, marketId, msg.sender, msg.value, commitmentHash);
    }

    /**
     * @notice Reveal a bet after market resolution
     * @param betId The bet to reveal
     * @param direction The actual direction (YES=true, NO=false)
     * @param salt The salt used in the commitment
     */
    function revealBet(
        uint256 betId,
        bool direction,
        bytes32 salt
    ) external nonReentrant {
        Bet storage bet = bets[betId];
        Market storage market = markets[bet.marketId];

        if (market.status != MarketStatus.RESOLVED) revert MarketNotResolved();
        if (block.timestamp > market.revealDeadline) revert RevealDeadlinePassed();
        if (bet.revealed) revert AlreadyRevealed();

        // Verify commitment
        bytes32 expectedHash = keccak256(abi.encodePacked(direction, salt));
        if (expectedHash != bet.commitmentHash) revert InvalidCommitment();

        bet.revealed = true;
        bet.direction = direction;

        // Update market totals
        if (direction) {
            market.totalYesAmount += bet.amount;
        } else {
            market.totalNoAmount += bet.amount;
        }

        emit BetRevealed(betId, bet.marketId, bet.bettor, direction);
    }

    /**
     * @notice Resolve a market (admin only)
     * @param marketId The market to resolve
     * @param outcome The outcome (YES=true, NO=false)
     */
    function resolveMarket(
        uint256 marketId,
        bool outcome
    ) external onlyAdmin {
        Market storage market = markets[marketId];

        if (market.status != MarketStatus.ACTIVE) revert MarketNotActive();
        if (block.timestamp < market.deadline) revert BettingDeadlineNotPassed();

        market.status = MarketStatus.RESOLVED;
        market.outcome = outcome;

        emit MarketResolved(
            marketId,
            outcome,
            market.totalYesAmount,
            market.totalNoAmount
        );

        // Auto-resolve forked markets
        uint256[] storage forks = forkedMarkets[marketId];
        for (uint256 i = 0; i < forks.length; i++) {
            Market storage forked = markets[forks[i]];
            if (forked.status == MarketStatus.ACTIVE) {
                forked.status = MarketStatus.RESOLVED;
                forked.outcome = outcome;

                emit MarketResolved(
                    forks[i],
                    outcome,
                    forked.totalYesAmount,
                    forked.totalNoAmount
                );
            }
        }
    }

    /**
     * @notice Claim winnings for a winning bet
     * @param betId The bet to claim
     */
    function claimWinnings(uint256 betId) external nonReentrant {
        Bet storage bet = bets[betId];
        Market storage market = markets[bet.marketId];

        if (market.status != MarketStatus.RESOLVED) revert MarketNotResolved();
        if (!bet.revealed) revert InvalidCommitment(); // Must reveal first
        if (bet.claimed) revert AlreadyClaimed();
        if (bet.direction != market.outcome) revert NotWinner();

        bet.claimed = true;

        // Calculate payout: bet amount + proportional share of losers' pool
        uint256 winningPool = market.outcome ? market.totalYesAmount : market.totalNoAmount;
        uint256 losingPool = market.outcome ? market.totalNoAmount : market.totalYesAmount;

        uint256 payout = bet.amount;
        if (winningPool > 0 && losingPool > 0) {
            payout += (bet.amount * losingPool) / winningPool;
        }

        (bool success, ) = bet.bettor.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit WinningsClaimed(betId, bet.marketId, bet.bettor, payout);
    }

    /**
     * @notice Cancel a market and refund all bets (admin only)
     * @param marketId The market to cancel
     */
    function cancelMarket(uint256 marketId) external onlyAdmin nonReentrant {
        Market storage market = markets[marketId];

        if (market.status != MarketStatus.ACTIVE) revert MarketNotActive();

        market.status = MarketStatus.CANCELLED;

        // Refund all bets
        uint256[] storage betIds = marketBets[marketId];
        for (uint256 i = 0; i < betIds.length; i++) {
            Bet storage bet = bets[betIds[i]];
            if (!bet.claimed) {
                bet.claimed = true;
                (bool success, ) = bet.bettor.call{value: bet.amount}("");
                if (!success) revert TransferFailed();
            }
        }

        emit MarketCancelled(marketId);
    }

    /**
     * @notice Transfer admin role
     * @param newAdmin The new admin address
     */
    function setAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        admin = newAdmin;
    }

    // ============ View Functions ============

    /**
     * @notice Get market details
     */
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    /**
     * @notice Get bet details
     */
    function getBet(uint256 betId) external view returns (Bet memory) {
        return bets[betId];
    }

    /**
     * @notice Get user's bets for a market
     */
    function getUserBets(uint256 marketId, address user) external view returns (uint256[] memory) {
        return userBets[marketId][user];
    }

    /**
     * @notice Get all bets for a market
     */
    function getMarketBets(uint256 marketId) external view returns (uint256[] memory) {
        return marketBets[marketId];
    }

    /**
     * @notice Get forked markets for a parent
     */
    function getForkedMarkets(uint256 parentMarketId) external view returns (uint256[] memory) {
        return forkedMarkets[parentMarketId];
    }

    /**
     * @notice Calculate potential payout for a bet (estimate)
     */
    function calculatePotentialPayout(
        uint256 marketId,
        uint256 amount,
        bool direction
    ) external view returns (uint256) {
        Market storage market = markets[marketId];

        uint256 winningPool = direction ? market.totalYesAmount + amount : market.totalNoAmount + amount;
        uint256 losingPool = direction ? market.totalNoAmount : market.totalYesAmount;

        if (winningPool == 0) return amount;

        return amount + (amount * losingPool) / winningPool;
    }

    /**
     * @notice Generate commitment hash (helper for frontend)
     */
    function generateCommitment(bool direction, bytes32 salt) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(direction, salt));
    }

    // ============ Receive ============

    receive() external payable {}
}

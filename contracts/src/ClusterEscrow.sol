// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  HACKATHON DECISION: ClusterEscrow NOT used in current flow  ║
 * ╠═══════════════════════════════════════════════════════════════╣
 * ║                                                               ║
 * ║  For ETHGlobal HackMoney 2026, NovaManager.startNova() takes  ║
 * ║  msg.value directly from the Nova initiator. This avoids the  ║
 * ║  extra deployment + deposit flow that ClusterEscrow requires. ║
 * ║                                                               ║
 * ║  ClusterEscrow is kept as-is for post-hackathon integration   ║
 * ║  where each cluster leader pre-funds an escrow, and the       ║
 * ║  NovaManager pulls wager from both escrows at Nova start.     ║
 * ║                                                               ║
 * ║  Status: Contract is complete + tested. Not deployed.         ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

/**
 * @title ClusterEscrow
 * @notice Leader-controlled escrow contract for cluster Nova wagering
 * @dev Each cluster has its own escrow contract for managing Nova wagers
 *
 * Key Features:
 * - Leader deposits funds for Nova wagering
 * - Funds locked when Nova starts
 * - Released to winner when Nova completes
 * - Refunded if Nova is cancelled
 */
contract ClusterEscrow is ReentrancyGuard {
    // ============ State Variables ============

    address public clusterManager;
    address public novaManager;
    address public leader;
    uint256 public clusterId;

    // Total balance available for wagering
    uint256 public availableBalance;

    // Nova ID => Amount deposited for that Nova
    mapping(uint256 => uint256) public novaDeposits;

    // Nova ID => Whether funds have been released
    mapping(uint256 => bool) public novaReleased;

    // ============ Events ============

    event Deposited(address indexed depositor, uint256 amount, uint256 newBalance);
    event Withdrawn(address indexed to, uint256 amount, uint256 newBalance);
    event NovaDepositMade(uint256 indexed novaId, uint256 amount);
    event NovaFundsReleased(uint256 indexed novaId, address indexed recipient, uint256 amount);
    event NovaRefunded(uint256 indexed novaId, uint256 amount);
    event LeaderChanged(address indexed oldLeader, address indexed newLeader);

    // ============ Errors ============

    error OnlyLeader();
    error OnlyClusterManager();
    error OnlyNovaManager();
    error InsufficientBalance();
    error NovaAlreadyDeposited();
    error NovaNotDeposited();
    error NovaAlreadyReleased();
    error TransferFailed();
    error InvalidAddress();
    error InvalidAmount();

    // ============ Modifiers ============

    modifier onlyLeader() {
        if (msg.sender != leader) revert OnlyLeader();
        _;
    }

    modifier onlyClusterManager() {
        if (msg.sender != clusterManager) revert OnlyClusterManager();
        _;
    }

    modifier onlyNovaManager() {
        if (msg.sender != novaManager) revert OnlyNovaManager();
        _;
    }

    modifier onlyAuthorized() {
        if (msg.sender != leader && msg.sender != clusterManager && msg.sender != novaManager) {
            revert OnlyLeader();
        }
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the escrow for a cluster
     * @param _clusterId The cluster ID
     * @param _leader The initial cluster leader
     * @param _clusterManager The ClusterManager contract address
     */
    constructor(uint256 _clusterId, address _leader, address _clusterManager) {
        if (_leader == address(0)) revert InvalidAddress();
        if (_clusterManager == address(0)) revert InvalidAddress();

        clusterId = _clusterId;
        leader = _leader;
        clusterManager = _clusterManager;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the NovaManager address (called by ClusterManager)
     * @param _novaManager The NovaManager contract address
     */
    function setNovaManager(address _novaManager) external onlyClusterManager {
        if (_novaManager == address(0)) revert InvalidAddress();
        novaManager = _novaManager;
    }

    /**
     * @notice Update the leader (called by ClusterManager when leadership transfers)
     * @param newLeader The new leader address
     */
    function updateLeader(address newLeader) external onlyClusterManager {
        if (newLeader == address(0)) revert InvalidAddress();
        address oldLeader = leader;
        leader = newLeader;
        emit LeaderChanged(oldLeader, newLeader);
    }

    // ============ Deposit Functions ============

    /**
     * @notice Deposit funds to the escrow
     * @dev Anyone can deposit, but only leader can withdraw
     */
    function deposit() external payable nonReentrant {
        if (msg.value == 0) revert InvalidAmount();

        availableBalance += msg.value;
        emit Deposited(msg.sender, msg.value, availableBalance);
    }

    /**
     * @notice Receive function to accept direct transfers
     */
    receive() external payable {
        availableBalance += msg.value;
        emit Deposited(msg.sender, msg.value, availableBalance);
    }

    // ============ Withdrawal Functions ============

    /**
     * @notice Withdraw available funds (leader only)
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external onlyLeader nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (amount > availableBalance) revert InsufficientBalance();

        availableBalance -= amount;

        (bool success, ) = leader.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(leader, amount, availableBalance);
    }

    /**
     * @notice Withdraw all available funds (leader only)
     */
    function withdrawAll() external onlyLeader nonReentrant {
        uint256 amount = availableBalance;
        if (amount == 0) revert InsufficientBalance();

        availableBalance = 0;

        (bool success, ) = leader.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(leader, amount, 0);
    }

    // ============ Nova Wagering Functions ============

    /**
     * @notice Deposit funds for a specific Nova wager
     * @param novaId The Nova ID
     * @param amount Amount to wager
     */
    function depositForNova(uint256 novaId, uint256 amount) external onlyLeader nonReentrant {
        if (amount == 0) revert InvalidAmount();
        if (amount > availableBalance) revert InsufficientBalance();
        if (novaDeposits[novaId] > 0) revert NovaAlreadyDeposited();

        availableBalance -= amount;
        novaDeposits[novaId] = amount;

        emit NovaDepositMade(novaId, amount);
    }

    /**
     * @notice Check if funds are deposited for a Nova
     * @param novaId The Nova ID
     * @return deposited Amount deposited (0 if none)
     */
    function getNovaDeposit(uint256 novaId) external view returns (uint256 deposited) {
        return novaDeposits[novaId];
    }

    /**
     * @notice Check if cluster is ready for Nova (has deposited required amount)
     * @param novaId The Nova ID
     * @param requiredAmount The required wager amount
     * @return ready True if sufficient funds deposited
     */
    function isReadyForNova(uint256 novaId, uint256 requiredAmount) external view returns (bool ready) {
        return novaDeposits[novaId] >= requiredAmount;
    }

    /**
     * @notice Release funds for a Nova (called by NovaManager when Nova starts)
     * @param novaId The Nova ID
     * @return amount The amount released
     */
    function releaseForNova(uint256 novaId) external onlyNovaManager nonReentrant returns (uint256 amount) {
        amount = novaDeposits[novaId];
        if (amount == 0) revert NovaNotDeposited();
        if (novaReleased[novaId]) revert NovaAlreadyReleased();

        novaReleased[novaId] = true;

        // Transfer to NovaManager
        (bool success, ) = novaManager.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit NovaFundsReleased(novaId, novaManager, amount);
    }

    /**
     * @notice Refund Nova deposit (called by NovaManager if Nova is cancelled)
     * @param novaId The Nova ID
     */
    function refundNova(uint256 novaId) external onlyNovaManager nonReentrant {
        uint256 amount = novaDeposits[novaId];
        if (amount == 0) revert NovaNotDeposited();
        if (novaReleased[novaId]) revert NovaAlreadyReleased();

        // Mark as released to prevent double refund
        novaReleased[novaId] = true;

        // Return to available balance
        availableBalance += amount;

        emit NovaRefunded(novaId, amount);
    }

    /**
     * @notice Cancel a Nova deposit before it's released (leader only)
     * @param novaId The Nova ID
     */
    function cancelNovaDeposit(uint256 novaId) external onlyLeader nonReentrant {
        uint256 amount = novaDeposits[novaId];
        if (amount == 0) revert NovaNotDeposited();
        if (novaReleased[novaId]) revert NovaAlreadyReleased();

        // Clear the deposit
        novaDeposits[novaId] = 0;

        // Return to available balance
        availableBalance += amount;

        emit NovaRefunded(novaId, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get total balance (available + locked in Novas)
     */
    function getTotalBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get available balance (can be withdrawn)
     */
    function getAvailableBalance() external view returns (uint256) {
        return availableBalance;
    }

    /**
     * @notice Get locked balance (deposited for pending Novas)
     */
    function getLockedBalance() external view returns (uint256) {
        return address(this).balance - availableBalance;
    }

    /**
     * @notice Get escrow info
     */
    function getInfo() external view returns (
        uint256 _clusterId,
        address _leader,
        uint256 _availableBalance,
        uint256 _totalBalance
    ) {
        return (clusterId, leader, availableBalance, address(this).balance);
    }
}

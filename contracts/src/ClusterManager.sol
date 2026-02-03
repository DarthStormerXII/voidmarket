// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ClusterManager
 * @notice Manages clusters (teams) and their members for VoidMarket
 * @dev Handles cluster creation, invites, memberships, photons, and energy
 *
 * Key Features:
 * - Users create or join clusters (teams)
 * - Tracks photons (individual performance score)
 * - Tracks energy (team score based on collective photons + nova wins)
 * - Invite system for private clusters
 * - Integration with NovaManager for battle rewards
 */
contract ClusterManager {
    // ============ Structs ============

    struct Cluster {
        uint256 id;
        string name;
        address leader;
        uint256 energy;              // Team score
        uint256 novasWon;
        uint256 totalNovas;
        bool isPrivate;
        uint256 memberCount;
        uint256 maxMembers;
        uint256 createdAt;
    }

    struct Member {
        address memberAddress;
        uint256 clusterId;
        uint256 photons;             // Individual performance score
        uint256 joinedAt;
        bool isActive;
    }

    struct Invite {
        uint256 id;
        uint256 clusterId;
        address invitee;             // address(0) = open invite
        address inviter;
        bytes32 inviteCode;
        uint256 expiresAt;
        bool used;
    }

    // ============ State Variables ============

    address public admin;
    address public novaManager;      // Only NovaManager can update photons/energy

    uint256 public clusterCount;
    uint256 public inviteCount;

    uint256 public constant DEFAULT_MAX_MEMBERS = 50;
    uint256 public constant INVITE_DURATION = 7 days;

    // Cluster ID => Cluster
    mapping(uint256 => Cluster) public clusters;

    // Address => Member
    mapping(address => Member) public members;

    // Cluster ID => Array of member addresses
    mapping(uint256 => address[]) public clusterMembers;

    // Invite ID => Invite
    mapping(uint256 => Invite) public invites;

    // Invite code => Invite ID
    mapping(bytes32 => uint256) public inviteCodeToId;

    // Cluster ID => Array of invite IDs
    mapping(uint256 => uint256[]) public clusterInvites;

    // ============ Events ============

    event ClusterCreated(
        uint256 indexed clusterId,
        address indexed leader,
        string name,
        bool isPrivate
    );

    event MemberJoined(
        uint256 indexed clusterId,
        address indexed member,
        bytes32 inviteCode
    );

    event MemberLeft(
        uint256 indexed clusterId,
        address indexed member
    );

    event InviteCreated(
        uint256 indexed inviteId,
        uint256 indexed clusterId,
        address indexed invitee,
        bytes32 inviteCode,
        uint256 expiresAt
    );

    event InviteUsed(
        uint256 indexed inviteId,
        uint256 indexed clusterId,
        address indexed member
    );

    event PhotonsUpdated(
        uint256 indexed clusterId,
        address indexed member,
        int256 delta,
        uint256 newTotal
    );

    event EnergyUpdated(
        uint256 indexed clusterId,
        int256 delta,
        uint256 newTotal
    );

    event NovaResultRecorded(
        uint256 indexed clusterId,
        bool won
    );

    event LeaderTransferred(
        uint256 indexed clusterId,
        address indexed oldLeader,
        address indexed newLeader
    );

    // ============ Errors ============

    error OnlyAdmin();
    error OnlyNovaManager();
    error OnlyClusterLeader();
    error OnlyClusterMember();
    error ClusterNotFound();
    error AlreadyInCluster();
    error NotInCluster();
    error ClusterFull();
    error ClusterIsPrivate();
    error InvalidInvite();
    error InviteExpired();
    error InviteAlreadyUsed();
    error NameTaken();
    error CannotLeaveAsLeader();
    error InvalidAddress();

    // ============ Modifiers ============

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier onlyNovaManager() {
        if (msg.sender != novaManager) revert OnlyNovaManager();
        _;
    }

    modifier onlyClusterLeader(uint256 clusterId) {
        if (clusters[clusterId].leader != msg.sender) revert OnlyClusterLeader();
        _;
    }

    modifier onlyClusterMember(uint256 clusterId) {
        if (members[msg.sender].clusterId != clusterId || !members[msg.sender].isActive) {
            revert OnlyClusterMember();
        }
        _;
    }

    // ============ Constructor ============

    constructor() {
        admin = msg.sender;
    }

    // ============ Admin Functions ============

    function setNovaManager(address _novaManager) external onlyAdmin {
        if (_novaManager == address(0)) revert InvalidAddress();
        novaManager = _novaManager;
    }

    function setAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert InvalidAddress();
        admin = newAdmin;
    }

    // ============ Cluster Functions ============

    /**
     * @notice Create a new cluster
     * @param name The cluster name (must be unique)
     * @param isPrivate If true, requires invite to join
     * @return clusterId The ID of the created cluster
     */
    function createCluster(
        string calldata name,
        bool isPrivate
    ) external returns (uint256 clusterId) {
        // Check user not already in a cluster
        if (members[msg.sender].isActive) revert AlreadyInCluster();

        // Check name is available (simple hash check)
        bytes32 nameHash = keccak256(abi.encodePacked(name));
        for (uint256 i = 1; i <= clusterCount; i++) {
            if (keccak256(abi.encodePacked(clusters[i].name)) == nameHash) {
                revert NameTaken();
            }
        }

        clusterId = ++clusterCount;

        clusters[clusterId] = Cluster({
            id: clusterId,
            name: name,
            leader: msg.sender,
            energy: 0,
            novasWon: 0,
            totalNovas: 0,
            isPrivate: isPrivate,
            memberCount: 1,
            maxMembers: DEFAULT_MAX_MEMBERS,
            createdAt: block.timestamp
        });

        // Add creator as first member
        members[msg.sender] = Member({
            memberAddress: msg.sender,
            clusterId: clusterId,
            photons: 0,
            joinedAt: block.timestamp,
            isActive: true
        });

        clusterMembers[clusterId].push(msg.sender);

        emit ClusterCreated(clusterId, msg.sender, name, isPrivate);
    }

    /**
     * @notice Create an invite to a cluster
     * @param clusterId The cluster to invite to
     * @param invitee The address to invite (address(0) for open invite)
     * @return inviteCode The invite code
     */
    function inviteToCluster(
        uint256 clusterId,
        address invitee
    ) external onlyClusterMember(clusterId) returns (bytes32 inviteCode) {
        Cluster storage cluster = clusters[clusterId];
        if (cluster.id == 0) revert ClusterNotFound();

        // Generate unique invite code
        inviteCode = keccak256(abi.encodePacked(
            clusterId,
            invitee,
            msg.sender,
            block.timestamp,
            inviteCount
        ));

        uint256 inviteId = ++inviteCount;

        invites[inviteId] = Invite({
            id: inviteId,
            clusterId: clusterId,
            invitee: invitee,
            inviter: msg.sender,
            inviteCode: inviteCode,
            expiresAt: block.timestamp + INVITE_DURATION,
            used: false
        });

        inviteCodeToId[inviteCode] = inviteId;
        clusterInvites[clusterId].push(inviteId);

        emit InviteCreated(inviteId, clusterId, invitee, inviteCode, block.timestamp + INVITE_DURATION);
    }

    /**
     * @notice Join a cluster
     * @param clusterId The cluster to join
     * @param inviteCode The invite code (required for private clusters)
     */
    function joinCluster(
        uint256 clusterId,
        bytes32 inviteCode
    ) external {
        Cluster storage cluster = clusters[clusterId];
        if (cluster.id == 0) revert ClusterNotFound();
        if (members[msg.sender].isActive) revert AlreadyInCluster();
        if (cluster.memberCount >= cluster.maxMembers) revert ClusterFull();

        // Handle private clusters
        if (cluster.isPrivate || inviteCode != bytes32(0)) {
            uint256 inviteId = inviteCodeToId[inviteCode];
            Invite storage invite = invites[inviteId];

            if (invite.id == 0) revert InvalidInvite();
            if (invite.clusterId != clusterId) revert InvalidInvite();
            if (invite.used) revert InviteAlreadyUsed();
            if (block.timestamp > invite.expiresAt) revert InviteExpired();
            if (invite.invitee != address(0) && invite.invitee != msg.sender) {
                revert InvalidInvite();
            }

            invite.used = true;
            emit InviteUsed(inviteId, clusterId, msg.sender);
        } else if (cluster.isPrivate) {
            revert ClusterIsPrivate();
        }

        // Add member
        members[msg.sender] = Member({
            memberAddress: msg.sender,
            clusterId: clusterId,
            photons: 0,
            joinedAt: block.timestamp,
            isActive: true
        });

        clusterMembers[clusterId].push(msg.sender);
        cluster.memberCount++;

        emit MemberJoined(clusterId, msg.sender, inviteCode);
    }

    /**
     * @notice Leave a cluster
     */
    function leaveCluster() external {
        Member storage member = members[msg.sender];
        if (!member.isActive) revert NotInCluster();

        uint256 clusterId = member.clusterId;
        Cluster storage cluster = clusters[clusterId];

        // Leader cannot leave without transferring leadership
        if (cluster.leader == msg.sender) revert CannotLeaveAsLeader();

        member.isActive = false;
        member.clusterId = 0;
        cluster.memberCount--;

        // Remove from clusterMembers array
        address[] storage memberList = clusterMembers[clusterId];
        for (uint256 i = 0; i < memberList.length; i++) {
            if (memberList[i] == msg.sender) {
                memberList[i] = memberList[memberList.length - 1];
                memberList.pop();
                break;
            }
        }

        emit MemberLeft(clusterId, msg.sender);
    }

    /**
     * @notice Transfer cluster leadership
     * @param clusterId The cluster ID
     * @param newLeader The new leader address
     */
    function transferLeadership(
        uint256 clusterId,
        address newLeader
    ) external onlyClusterLeader(clusterId) {
        Member storage newLeaderMember = members[newLeader];
        if (newLeaderMember.clusterId != clusterId || !newLeaderMember.isActive) {
            revert OnlyClusterMember();
        }

        address oldLeader = clusters[clusterId].leader;
        clusters[clusterId].leader = newLeader;

        emit LeaderTransferred(clusterId, oldLeader, newLeader);
    }

    // ============ Nova Manager Functions ============

    /**
     * @notice Update photons for a member (only NovaManager)
     * @param clusterId The cluster ID
     * @param memberAddress The member address
     * @param delta The photon change (can be negative)
     */
    function updatePhotons(
        uint256 clusterId,
        address memberAddress,
        int256 delta
    ) external onlyNovaManager {
        Member storage member = members[memberAddress];
        if (member.clusterId != clusterId || !member.isActive) {
            revert OnlyClusterMember();
        }

        if (delta > 0) {
            member.photons += uint256(delta);
        } else {
            uint256 decrease = uint256(-delta);
            member.photons = member.photons > decrease ? member.photons - decrease : 0;
        }

        emit PhotonsUpdated(clusterId, memberAddress, delta, member.photons);
    }

    /**
     * @notice Update energy for a cluster (only NovaManager)
     * @param clusterId The cluster ID
     * @param delta The energy change (can be negative)
     */
    function updateEnergy(
        uint256 clusterId,
        int256 delta
    ) external onlyNovaManager {
        Cluster storage cluster = clusters[clusterId];
        if (cluster.id == 0) revert ClusterNotFound();

        if (delta > 0) {
            cluster.energy += uint256(delta);
        } else {
            uint256 decrease = uint256(-delta);
            cluster.energy = cluster.energy > decrease ? cluster.energy - decrease : 0;
        }

        emit EnergyUpdated(clusterId, delta, cluster.energy);
    }

    /**
     * @notice Record nova result (only NovaManager)
     * @param clusterId The cluster ID
     * @param won Whether the cluster won
     */
    function recordNovaResult(
        uint256 clusterId,
        bool won
    ) external onlyNovaManager {
        Cluster storage cluster = clusters[clusterId];
        if (cluster.id == 0) revert ClusterNotFound();

        cluster.totalNovas++;
        if (won) {
            cluster.novasWon++;
        }

        emit NovaResultRecorded(clusterId, won);
    }

    // ============ View Functions ============

    /**
     * @notice Get cluster details
     */
    function getCluster(uint256 clusterId) external view returns (Cluster memory) {
        return clusters[clusterId];
    }

    /**
     * @notice Get member details
     */
    function getMember(address memberAddress) external view returns (Member memory) {
        return members[memberAddress];
    }

    /**
     * @notice Get all members of a cluster
     */
    function getClusterMembers(uint256 clusterId) external view returns (address[] memory) {
        return clusterMembers[clusterId];
    }

    /**
     * @notice Get member details for all cluster members
     */
    function getClusterMemberDetails(uint256 clusterId) external view returns (Member[] memory) {
        address[] storage memberAddresses = clusterMembers[clusterId];
        Member[] memory memberDetails = new Member[](memberAddresses.length);

        for (uint256 i = 0; i < memberAddresses.length; i++) {
            memberDetails[i] = members[memberAddresses[i]];
        }

        return memberDetails;
    }

    /**
     * @notice Get invite details
     */
    function getInvite(uint256 inviteId) external view returns (Invite memory) {
        return invites[inviteId];
    }

    /**
     * @notice Get invite by code
     */
    function getInviteByCode(bytes32 inviteCode) external view returns (Invite memory) {
        uint256 inviteId = inviteCodeToId[inviteCode];
        return invites[inviteId];
    }

    /**
     * @notice Get all invites for a cluster
     */
    function getClusterInvites(uint256 clusterId) external view returns (uint256[] memory) {
        return clusterInvites[clusterId];
    }

    /**
     * @notice Check if address is member of cluster
     */
    function isMemberOf(address memberAddress, uint256 clusterId) external view returns (bool) {
        Member storage member = members[memberAddress];
        return member.clusterId == clusterId && member.isActive;
    }

    /**
     * @notice Get total photons for a cluster
     */
    function getClusterTotalPhotons(uint256 clusterId) external view returns (uint256 total) {
        address[] storage memberAddresses = clusterMembers[clusterId];
        for (uint256 i = 0; i < memberAddresses.length; i++) {
            total += members[memberAddresses[i]].photons;
        }
    }
}

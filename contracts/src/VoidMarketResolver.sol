// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VoidMarketResolver
 * @notice ENS CCIP-Read (EIP-3668) resolver for VoidMarket
 * @dev Implements off-chain resolution for subdomains:
 *      - username.voidmarket.eth → Star profile
 *      - market-slug.voidmarket.eth → Market data
 *      - cluster-name.voidmarket.eth → Cluster data
 *
 * The resolver returns OffchainLookup errors that direct clients
 * to the VoidMarket gateway server for actual resolution.
 */
contract VoidMarketResolver {
    // ============ Errors ============

    /**
     * @notice EIP-3668 OffchainLookup error
     * @param sender The address that raised the error
     * @param urls Array of gateway URLs to try
     * @param callData The calldata to send to the gateway
     * @param callbackFunction The function selector for the callback
     * @param extraData Extra data to pass to the callback
     */
    error OffchainLookup(
        address sender,
        string[] urls,
        bytes callData,
        bytes4 callbackFunction,
        bytes extraData
    );

    error InvalidSignature();
    error SignatureExpired();

    // ============ Constants ============

    // EIP-137: ENS Resolver interface IDs
    bytes4 private constant INTERFACE_META_ID = 0x01ffc9a7;           // supportsInterface
    bytes4 private constant ADDR_INTERFACE_ID = 0x3b3b57de;           // addr(bytes32)
    bytes4 private constant ADDR_MULTICHAIN_ID = 0xf1cb7e06;          // addr(bytes32,uint256)
    bytes4 private constant TEXT_INTERFACE_ID = 0x59d1d43c;           // text(bytes32,string)
    bytes4 private constant CONTENTHASH_INTERFACE_ID = 0xbc1c58d1;    // contenthash(bytes32)
    bytes4 private constant NAME_INTERFACE_ID = 0x691f3431;           // name(bytes32)

    // ============ State Variables ============

    address public owner;
    string[] public gatewayUrls;
    address public signer;              // Address that signs gateway responses
    uint256 public signatureValidityPeriod = 5 minutes;

    // ============ Events ============

    event GatewayUrlsUpdated(string[] urls);
    event SignerUpdated(address indexed newSigner);

    // ============ Constructor ============

    constructor(string[] memory _gatewayUrls, address _signer) {
        owner = msg.sender;
        gatewayUrls = _gatewayUrls;
        signer = _signer;
    }

    // ============ Admin Functions ============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setGatewayUrls(string[] calldata _urls) external onlyOwner {
        gatewayUrls = _urls;
        emit GatewayUrlsUpdated(_urls);
    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function setSignatureValidityPeriod(uint256 _period) external onlyOwner {
        signatureValidityPeriod = _period;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    // ============ ENS Resolver Functions ============

    /**
     * @notice Resolve an address for a name (EIP-137)
     * @param node The namehash of the name to resolve
     * @return The resolved address (reverts with OffchainLookup)
     */
    function addr(bytes32 node) external view returns (address) {
        bytes memory callData = abi.encodeWithSelector(
            this.addr.selector,
            node
        );

        revert OffchainLookup(
            address(this),
            gatewayUrls,
            callData,
            this.addrWithProof.selector,
            abi.encode(node)
        );
    }

    /**
     * @notice Callback for addr resolution with gateway proof
     * @param response The response from the gateway
     * @param extraData The extraData passed in OffchainLookup
     * @return The resolved address
     */
    function addrWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (address) {
        (address result, uint64 expires, bytes memory sig) = abi.decode(
            response,
            (address, uint64, bytes)
        );

        bytes32 node = abi.decode(extraData, (bytes32));

        // Verify signature hasn't expired
        if (block.timestamp > expires) revert SignatureExpired();

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(node, result, expires))
            )
        );

        address recoveredSigner = _recoverSigner(messageHash, sig);
        if (recoveredSigner != signer) revert InvalidSignature();

        return result;
    }

    /**
     * @notice Resolve a multichain address (EIP-2304)
     * @param node The namehash of the name
     * @param coinType The coin type (60 = ETH)
     * @return The resolved address as bytes
     */
    function addrMultichain(bytes32 node, uint256 coinType) external view returns (bytes memory) {
        bytes memory callData = abi.encodeWithSelector(
            bytes4(keccak256("addr(bytes32,uint256)")),
            node,
            coinType
        );

        revert OffchainLookup(
            address(this),
            gatewayUrls,
            callData,
            this.addrMultichainWithProof.selector,
            abi.encode(node, coinType)
        );
    }

    /**
     * @notice Callback for multichain addr resolution
     */
    function addrMultichainWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        (bytes memory result, uint64 expires, bytes memory sig) = abi.decode(
            response,
            (bytes, uint64, bytes)
        );

        (bytes32 node, uint256 coinType) = abi.decode(extraData, (bytes32, uint256));

        if (block.timestamp > expires) revert SignatureExpired();

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(node, coinType, result, expires))
            )
        );

        address recoveredSigner = _recoverSigner(messageHash, sig);
        if (recoveredSigner != signer) revert InvalidSignature();

        return result;
    }

    /**
     * @notice Resolve a text record (EIP-634)
     * @param node The namehash of the name
     * @param key The text record key
     * @return The text record value (reverts with OffchainLookup)
     */
    function text(bytes32 node, string calldata key) external view returns (string memory) {
        bytes memory callData = abi.encodeWithSelector(
            this.text.selector,
            node,
            key
        );

        revert OffchainLookup(
            address(this),
            gatewayUrls,
            callData,
            this.textWithProof.selector,
            abi.encode(node, key)
        );
    }

    /**
     * @notice Callback for text resolution with gateway proof
     * @param response The response from the gateway
     * @param extraData The extraData passed in OffchainLookup
     * @return The resolved text value
     */
    function textWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (string memory) {
        (string memory result, uint64 expires, bytes memory sig) = abi.decode(
            response,
            (string, uint64, bytes)
        );

        (bytes32 node, string memory key) = abi.decode(extraData, (bytes32, string));

        if (block.timestamp > expires) revert SignatureExpired();

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(node, key, result, expires))
            )
        );

        address recoveredSigner = _recoverSigner(messageHash, sig);
        if (recoveredSigner != signer) revert InvalidSignature();

        return result;
    }

    /**
     * @notice Resolve a content hash (EIP-1577)
     * @param node The namehash of the name
     * @return The content hash (reverts with OffchainLookup)
     */
    function contenthash(bytes32 node) external view returns (bytes memory) {
        bytes memory callData = abi.encodeWithSelector(
            this.contenthash.selector,
            node
        );

        revert OffchainLookup(
            address(this),
            gatewayUrls,
            callData,
            this.contenthashWithProof.selector,
            abi.encode(node)
        );
    }

    /**
     * @notice Callback for contenthash resolution
     */
    function contenthashWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        (bytes memory result, uint64 expires, bytes memory sig) = abi.decode(
            response,
            (bytes, uint64, bytes)
        );

        bytes32 node = abi.decode(extraData, (bytes32));

        if (block.timestamp > expires) revert SignatureExpired();

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(node, result, expires))
            )
        );

        address recoveredSigner = _recoverSigner(messageHash, sig);
        if (recoveredSigner != signer) revert InvalidSignature();

        return result;
    }

    /**
     * @notice Resolve a name (reverse resolution)
     * @param node The namehash
     * @return The resolved name
     */
    function name(bytes32 node) external view returns (string memory) {
        bytes memory callData = abi.encodeWithSelector(
            this.name.selector,
            node
        );

        revert OffchainLookup(
            address(this),
            gatewayUrls,
            callData,
            this.nameWithProof.selector,
            abi.encode(node)
        );
    }

    /**
     * @notice Callback for name resolution
     */
    function nameWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (string memory) {
        (string memory result, uint64 expires, bytes memory sig) = abi.decode(
            response,
            (string, uint64, bytes)
        );

        bytes32 node = abi.decode(extraData, (bytes32));

        if (block.timestamp > expires) revert SignatureExpired();

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(node, result, expires))
            )
        );

        address recoveredSigner = _recoverSigner(messageHash, sig);
        if (recoveredSigner != signer) revert InvalidSignature();

        return result;
    }

    // ============ EIP-165 Support ============

    /**
     * @notice Check if interface is supported
     * @param interfaceId The interface ID to check
     * @return True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == INTERFACE_META_ID ||
            interfaceId == ADDR_INTERFACE_ID ||
            interfaceId == ADDR_MULTICHAIN_ID ||
            interfaceId == TEXT_INTERFACE_ID ||
            interfaceId == CONTENTHASH_INTERFACE_ID ||
            interfaceId == NAME_INTERFACE_ID;
    }

    // ============ Internal Functions ============

    /**
     * @notice Recover signer from signature
     * @param messageHash The message hash
     * @param sig The signature
     * @return The recovered signer address
     */
    function _recoverSigner(
        bytes32 messageHash,
        bytes memory sig
    ) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid signature v value");

        return ecrecover(messageHash, v, r, s);
    }

    // ============ View Functions ============

    function getGatewayUrls() external view returns (string[] memory) {
        return gatewayUrls;
    }
}

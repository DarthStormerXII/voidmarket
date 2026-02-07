// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VoidMarketResolver
 * @notice ENS CCIP-Read (EIP-3668) resolver for VoidMarket
 * @dev Implements IExtendedResolver.resolve() for off-chain resolution:
 *      - username.voidmarket.eth → Star profile (wallet address)
 *      - market-slug.voidmarket.eth → Market metadata
 *      - cluster-name.voidmarket.eth → Cluster metadata
 *
 * The UniversalResolver calls resolve(name, data) which reverts with
 * OffchainLookup, directing the client to the gateway server.
 * The gateway signs the response, and resolveWithProof verifies it.
 */
contract VoidMarketResolver {
    // ============ Errors ============

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

    bytes4 private constant INTERFACE_META_ID = 0x01ffc9a7;           // supportsInterface
    bytes4 private constant ADDR_INTERFACE_ID = 0x3b3b57de;           // addr(bytes32)
    bytes4 private constant ADDR_MULTICHAIN_ID = 0xf1cb7e06;          // addr(bytes32,uint256)
    bytes4 private constant TEXT_INTERFACE_ID = 0x59d1d43c;           // text(bytes32,string)
    bytes4 private constant CONTENTHASH_INTERFACE_ID = 0xbc1c58d1;    // contenthash(bytes32)
    bytes4 private constant NAME_INTERFACE_ID = 0x691f3431;           // name(bytes32)
    bytes4 private constant RESOLVE_INTERFACE_ID = 0x9061b923;        // resolve(bytes,bytes)

    // ============ State Variables ============

    address public owner;
    string[] public gatewayUrls;
    address public signer;
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

    // ============ IExtendedResolver ============

    /**
     * @notice EIP-3668 resolve entry point called by the UniversalResolver
     * @param name DNS-encoded name (e.g., gabriel.voidmarket.eth)
     * @param data ABI-encoded resolver call (e.g., addr(node), text(node,key))
     * @return Always reverts with OffchainLookup
     */
    function resolve(bytes calldata name, bytes calldata data) external view returns (bytes memory) {
        bytes memory callData = abi.encode(name, data);

        revert OffchainLookup(
            address(this),
            gatewayUrls,
            callData,
            this.resolveWithProof.selector,
            callData
        );
    }

    /**
     * @notice CCIP-Read callback — verifies gateway signature and returns result
     * @param response ABI-encoded (bytes result, uint64 expires, bytes signature)
     * @param extraData The original callData from OffchainLookup (= abi.encode(name, data))
     * @return The verified resolution result
     */
    function resolveWithProof(
        bytes calldata response,
        bytes calldata extraData
    ) external view returns (bytes memory) {
        (bytes memory result, uint64 expires, bytes memory sig) = abi.decode(
            response,
            (bytes, uint64, bytes)
        );

        if (block.timestamp > expires) revert SignatureExpired();

        // Verify signature: gateway signs keccak256(result || expires || extraData)
        // using EIP-191 personal sign
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(result, expires, extraData))
            )
        );

        address recoveredSigner = _recoverSigner(messageHash, sig);
        if (recoveredSigner != signer) revert InvalidSignature();

        return result;
    }

    // ============ EIP-165 Support ============

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == INTERFACE_META_ID ||
            interfaceId == ADDR_INTERFACE_ID ||
            interfaceId == ADDR_MULTICHAIN_ID ||
            interfaceId == TEXT_INTERFACE_ID ||
            interfaceId == CONTENTHASH_INTERFACE_ID ||
            interfaceId == NAME_INTERFACE_ID ||
            interfaceId == RESOLVE_INTERFACE_ID;
    }

    // ============ Internal Functions ============

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

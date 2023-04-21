// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "./dependencies/Strlen.sol";
import "./interfaces/IAffiliateController.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AffiliateController is Initializable, IAffiliateController, OwnableUpgradeable {
    using Strlen for *;
    address internal _core;
    uint256 internal _referralTimeframe;

    // codeNode -> a referrer info
    mapping(bytes32 => ReferrerInfo) internal _referrerInfos;
    // address of a referee -> codeNode
    mapping(address => bytes32) internal _referrers;
    // address of a referrer -> codeNode
    mapping(address => bytes32) internal _codeNodes;
    uint256[] internal _amounts;
    uint256[] internal _payoutBPS;

    event ReferrerRegistered(bytes32 codeNode, string code, address referrer);
    event RefereeRegistered(bytes32 indexed codeNode, address indexed referree);

    function initialize(
        address core,
        uint256 referralTimeframe,
        uint256[] calldata amounts,
        uint256[] calldata payoutBPS
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        _referralTimeframe = referralTimeframe;
        _core = core;
        require(amounts.length + 1 == payoutBPS.length, "AffiliateController: Amounts and BPS length mismatch");

        uint256 i;
        for (; i < amounts.length; i++) {
            _amounts.push(amounts[i]);
            _payoutBPS.push(payoutBPS[i]);
        }

        _payoutBPS.push(payoutBPS[i]);

        transferOwnership(msg.sender);
    }

    function registerReferrer(string calldata code) external {
        require(code.strlen() >= 3, "AffiliateController: Code too short");
        require(_codeNodes[msg.sender] == bytes32(0), "AffiliateController: Referrer already registered");
        bytes32 codeNode = keccak256(bytes(code));
        require(_referrerInfos[codeNode].referrer == address(0), "AffiliateController: Code already taken");
        _referrerInfos[codeNode].referrer = msg.sender;
        _referrerInfos[codeNode].code = code;
        _codeNodes[msg.sender] = codeNode;

        emit ReferrerRegistered(codeNode, code, msg.sender);
    }

    function registerReferee(bytes32 codeNode, address referee) external override {
        require(msg.sender == _core, "AffiliateController: Only BabylonCore can register");
        require(_referrers[referee] == bytes32(0), "AffiliateController: Referee already registered");
        require(_referrerInfos[codeNode].referrer != address(0), "AffiliateController: Invalid code");
        require(_referrerInfos[codeNode].referrer != referee, "AffiliateController: Cannot refer oneself");
        _referrers[referee] = codeNode;

        emit RefereeRegistered(codeNode, referee);
    }

    function getReferrerBPS(address referee, uint256 listingAmount) external override returns (uint256, address) {
        ReferrerInfo storage info = _referrerInfos[_referrers[referee]];

        if (info.referrer == address(0)) {
            return (0, address(0));
        }

        if (block.timestamp - info.lastPayoutTimestamp <= _referralTimeframe) {
            info.generated += listingAmount;
            info.lastPayoutTimestamp = block.timestamp;
            uint256 generated = info.generated;

            uint256 i;
            for (; i < _amounts.length; i++) {
                if (generated <= _amounts[i]) {
                    return (_payoutBPS[i], info.referrer);
                }
            }

            return (_payoutBPS[i], info.referrer);
        }

        info.generated = listingAmount;
        info.lastPayoutTimestamp = block.timestamp;
        return (_payoutBPS[0], info.referrer);
    }

    function setBabylonCore(address core) external onlyOwner {
        require(core != address(0), "AffiliateController: Zero address");
        _core = core;
    }

    function setReferralTimeframe(uint256 newReferralTimeframe) external onlyOwner {
        _referralTimeframe = newReferralTimeframe;
    }

    function setAmountsAndBPS(
        uint256[] calldata amounts,
        uint256[] calldata payoutBPS
    ) external onlyOwner {
        require(amounts.length + 1 == payoutBPS.length, "AffiliateController: Amounts and BPS length mismatch");
        uint256 len = _amounts.length;
        uint256 i;

        for (; i < len; i++) {
            _amounts.pop();
            _payoutBPS.pop();
        }

        _payoutBPS.pop();

        for (i = 0; i < amounts.length; i++) {
            _amounts.push(amounts[i]);
            _payoutBPS.push(payoutBPS[i]);
        }

        _payoutBPS.push(payoutBPS[i]);
    }

    function getAmountsAndBPS() external view returns (uint256[] memory, uint256[] memory) {
        return (_amounts, _payoutBPS);
    }

    function getBabylonCore() external view returns (address) {
        return _core;
    }

    function getCodeNode(address referrer) external view returns (bytes32 codeNode) {
        return _codeNodes[referrer];
    }

    function getReferrer(address referee) external view returns (bytes32 codeNode) {
        return _referrers[referee];
    }

    function getReferralTimeframe() external view returns (uint256) {
        return _referralTimeframe;
    }

    function getReferrerInfo(bytes32 codeNode) external view returns (ReferrerInfo memory) {
        return _referrerInfos[codeNode];
    }
}

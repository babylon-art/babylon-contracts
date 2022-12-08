// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "../interfaces/IRandomProvider.sol";
import "../interfaces/IBabylonCore.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

contract MockRandomProvider is IRandomProvider {
    uint256 public lastRequestId;
    bool public overdue;

    IBabylonCore internal _core;

    constructor() {}

    function getBabylonCore() external view returns (address) {
        return address(_core);
    }

    function setBabylonCore(IBabylonCore core) external {
        _core = core;
    }

    function fulfillRandomWords(uint256 _listingId, uint256[] memory randomWords) external {
        _core.resolveClaimer(_listingId, randomWords[0]);
    }

    function setOverdue(
        bool overdueValue
    ) external {
        overdue = overdueValue;
    }

    function isRequestOverdue(
        uint256 requestId
    ) external view override returns (bool) {
        return overdue;
    }

    function requestRandom(
        uint256 listingId
    ) external override returns (uint256 requestId) {
        requestId = lastRequestId;
        lastRequestId++;
        return requestId;
    }
}

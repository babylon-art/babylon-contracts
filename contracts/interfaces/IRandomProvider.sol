// SPDX-License-Identifier: agpl-3.0

pragma solidity ^0.8.10;

interface IRandomProvider {
    function requestRandom(
        uint256 listingId
    ) external returns (uint256);
}

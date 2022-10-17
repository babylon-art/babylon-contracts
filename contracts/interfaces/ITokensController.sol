// SPDX-License-Identifier: agpl-3.0

pragma solidity ^0.8.10;

import "./IBabylonCore.sol";

interface ITokensController {
    function checkListingPrerequisites(
        address creator,
        IBabylonCore.ListingItem calldata item
    ) external view returns (bool);

    function sendToken(IBabylonCore.ListingItem calldata item, address from, address to) external;
}

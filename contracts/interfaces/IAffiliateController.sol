// SPDX-License-Identifier: agpl-3.0

pragma solidity ^0.8.0;

interface IAffiliateController {
    struct ReferrerInfo {
        address referrer;
        uint256 generated;
        uint256 lastPayoutTimestamp;
        string code;
    }

    function registerReferee(bytes32 codeNode, address referee) external;

    function getReferrerBPS(address referee, uint256 listingAmount) external returns (uint256, address);
}

// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.0;

import "../interfaces/IAffiliateController.sol";

contract MockCoreReferral {
    IAffiliateController internal _affiliateController;
    uint256 public lastReferrerBPS;
    address public lastReferrer;

    constructor(
        IAffiliateController affiliateController_
    ) {
        _affiliateController = affiliateController_;
    }

    function invokeGetReferrerBPS(address referee, uint256 donation) external {
        (uint256 referrerBPS, address referrer) = _affiliateController.getReferrerBPS(referee, donation);
        lastReferrerBPS = referrerBPS;
        lastReferrer = referrer;
    }
}

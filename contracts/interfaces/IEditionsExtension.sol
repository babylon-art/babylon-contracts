// SPDX-License-Identifier: agpl-3.0

pragma solidity ^0.8.10;

interface IEditionsExtension {
    function registerEdition(address creator, uint256 listingId, string calldata editionURI) external;
    function mintEdition(address receiver, uint256 amount, uint256 listingId) external;
}

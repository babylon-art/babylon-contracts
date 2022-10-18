// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.10;
pragma abicoder v2;

import "../interfaces/IBabylonCore.sol";
import "../interfaces/ITokensController.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract TokensController is ITokensController, Ownable {
    function checkListingPrerequisites(
        address creator,
        IBabylonCore.ListingItem calldata item
    ) external view returns (bool) {
        bool approved;
        uint256 amount;

        if (item.itemType == IBabylonCore.ItemType.ERC1155) {
            approved = IERC1155(item.token).isApprovedForAll(creator, address(this));
            amount = IERC1155(item.token).balanceOf(creator, item.identifier);
            return (approved && (amount == item.amount));
        } else if (item.itemType == IBabylonCore.ItemType.ERC721) {
            address operator = IERC721(item.token).getApproved(item.identifier);
            return address(this) == operator;
        }

        return false;
    }

    //TODO check that only Core can call this
    function sendToken(IBabylonCore.ListingItem calldata item, address from, address to) external {
        if (item.itemType == IBabylonCore.ItemType.ERC1155) {
            IERC1155(item.token).safeTransferFrom(from, to, item.identifier, item.amount, "");
        } else if (item.itemType == IBabylonCore.ItemType.ERC721) {
            IERC721(item.token).safeTransferFrom(from, to, item.identifier, "");
        }
    }

    /*function checkApproval(IBabylonCore.ListingItem calldata item) external view returns (bool) {
        if (item.itemType == IBabylonCore.ItemType.ERC1155) {
            return IERC1155(item.token).isApprovedForAll(item.creator, address(this));
        } else if (item.itemType == IBabylonCore.ItemType.ERC721) {
            address operator = IERC721(item.token).getApproved(item.identifier);
            return address(this) == operator;
        }
        return false;
    }*/
}

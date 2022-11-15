// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.10;
pragma abicoder v2;

import "./interfaces/IBabylonCore.sol";
import "./interfaces/IBabylonMintPass.sol";
import "./interfaces/ITokensController.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract TokensController is ITokensController, Ownable {
    IBabylonCore public core;
    address public mintPassImpl;

    constructor(
        IBabylonCore core_,
        address mintPassImpl_
    ) {
        core = core_;
        mintPassImpl = mintPassImpl_;
    }


    function createMintPass(
        uint256 listingId
    ) external returns (address) {
        address proxy = Clones.clone(mintPassImpl);

        IBabylonMintPass(proxy).initialize(listingId, address(core));

        return proxy;
    }

    function checkApproval(
        address creator,
        IBabylonCore.ListingItem calldata item
    ) external view returns (bool) {
        if (item.itemType == IBabylonCore.ItemType.ERC721) {
            address operator = IERC721(item.token).getApproved(item.identifier);
            return address(this) == operator;
        } else if (item.itemType == IBabylonCore.ItemType.ERC1155) {
            bool approved = IERC1155(item.token).isApprovedForAll(creator, address(this));
            uint256 amount = IERC1155(item.token).balanceOf(creator, item.identifier);
            return (approved && (amount == item.amount));
        }

        return false;
    }

    function sendItem(IBabylonCore.ListingItem calldata item, address from, address to) external {
        require(msg.sender == address(core), "TokensController: Only BabylonCore can send");
        if (item.itemType == IBabylonCore.ItemType.ERC1155) {
            IERC1155(item.token).safeTransferFrom(from, to, item.identifier, item.amount, "");
        } else if (item.itemType == IBabylonCore.ItemType.ERC721) {
            IERC721(item.token).safeTransferFrom(from, to, item.identifier, "");
        }
    }
}

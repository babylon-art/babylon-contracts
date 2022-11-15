// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.10;

import "./interfaces/IBabylonCore.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@manifoldxyz/creator-core-solidity/contracts/core/IERC1155CreatorCore.sol";

contract BabylonEditionsExtension is Ownable {
    address internal _creatorCore;
    address internal _babylonCore;

    // id of a listing -> tokenId
    mapping(uint256 => uint256) internal _editions;

    event EditionRegistered(uint256 listingId, uint256 tokenId);
    event EditionMinted(uint256 listingId, uint256 tokenId, uint256 amount);

    constructor(
        address creatorCore_,
        address babylonCore_
    ) {
        _creatorCore = creatorCore_;
        _babylonCore = babylonCore_;
    }

    function registerEdition(address creator, uint256 listingId, string calldata editionURI) external {
        require(msg.sender == _babylonCore, "BabylonEditionsExtension: Only BabylonCore can register");
        require(_editions[listingId] == 0, "BabylonEditionsExtension: Edition already registered for this listing");

        address[] memory to = new address[](1);
        to[0] = creator;
        uint[] memory amounts = new uint[](1);
        amounts[0] = 1;
        string[] memory uris = new string[](1);
        uris[0] = editionURI;

        uint256[] memory ids = IERC1155CreatorCore(_creatorCore).mintExtensionNew(to, amounts, uris);
        _editions[listingId] = ids[0];

        emit EditionRegistered(listingId, ids[0]);
    }

    function mintEdition(address receiver, uint256 amount, uint256 listingId) external {
        require(msg.sender == _babylonCore, "BabylonEditionsExtension: Only BabylonCore can mint");
        require(_editions[listingId] != 0, "BabylonEditionsExtension: Edition should exist for this listing");

        address[] memory to = new address[](1);
        to[0] = receiver;
        uint[] memory tokenIds = new uint[](1);
        tokenIds[0] = _editions[listingId];
        uint[] memory amounts = new uint[](1);
        amounts[0] = amount;

        IERC1155CreatorCore(_creatorCore).mintExtensionExisting(to, tokenIds, amounts);

        emit EditionMinted(listingId, _editions[listingId], amounts[0]);
    }

    function getEdition(uint256 listingId) external view returns (uint256) {
        return _editions[listingId];
    }

    function getEditionURI(uint256 listingId) external view returns (string memory) {
        return IERC1155MetadataURI(_creatorCore).uri(_editions[listingId]);
    }

    function getBabylonCore() external view returns (address) {
        return _babylonCore;
    }

    function getManifoldCreatorCore() external view returns (address) {
        return _creatorCore;
    }
}

// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.10;

import "../interfaces/IBabylonCore.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/IERC1155MetadataURI.sol";
import "@manifoldxyz/creator-core-solidity/contracts/core/IERC1155CreatorCore.sol";

contract BabylonEditionsExtension is Ownable {
    address internal _creatorCore;
    IBabylonCore internal _babylonCore;

    // id of a listing -> tokenId
    mapping(uint256 => uint256) internal _editions;
    // address of a user -> id of a listing -> minted counter
    mapping(address => mapping(uint256 => uint256)) internal _minted;

    event EditionRegistered(uint256 listingId, uint256 tokenId);
    event EditionMinted(uint256 listingId, uint256 tokenId, uint256 amount);

    constructor(
        address creatorCore_,
        IBabylonCore babylonCore_
    ) {
        _creatorCore = creatorCore_;
        _babylonCore = babylonCore_;
    }

    function registerEdition(uint256 listingId, string calldata editionURI) external {
        require(_editions[listingId] == 0, "BabylonEditionsExtension: Edition already registered for this listing");
        IBabylonCore.ListingInfo memory info = _babylonCore.getListingInfo(listingId);
        require(info.state == IBabylonCore.ListingState.Active, "BabylonEditionsExtension: Listing state should be active");
        require(info.creator == msg.sender, "BabylonEditionsExtension: Only listing creator can register an edition");

        address[] memory to = new address[](1);
        to[0] = msg.sender;
        uint[] memory amounts = new uint[](1);
        amounts[0] = 1;
        string[] memory uris = new string[](1);
        uris[0] = editionURI;

        uint256[] memory ids = IERC1155CreatorCore(_creatorCore).mintExtensionNew(to, amounts, uris);
        _editions[listingId] = ids[0];

        emit EditionRegistered(listingId, ids[0]);
    }

    function mintEdition(uint256 listingId) external {
        require(_editions[listingId] != 0, "BabylonEditionsExtension: Edition should exist for this listing");
        IBabylonCore.ListingInfo memory info = _babylonCore.getListingInfo(listingId);

        require(
            info.state == IBabylonCore.ListingState.Successful
            || info.state == IBabylonCore.ListingState.Finalized,
                "BabylonEditionsExtension: Listing state should be successful or finalized"
        );

        IBabylonCore.Participation memory participation = _babylonCore.getParticipation(msg.sender, listingId);
        require(participation.amount > _minted[msg.sender][listingId], "BabylonEditionsExtension: Nothing to mint");

        address[] memory to = new address[](1);
        to[0] = msg.sender;
        uint[] memory tokenIds = new uint[](1);
        tokenIds[0] = _editions[listingId];
        uint[] memory amounts = new uint[](1);
        amounts[0] = participation.amount - _minted[msg.sender][listingId];

        IERC1155CreatorCore(_creatorCore).mintExtensionExisting(to, tokenIds, amounts);
        _minted[msg.sender][listingId] += amounts[0];

        emit EditionMinted(listingId, _editions[listingId], amounts[0]);
    }

    function eligibleForEdition(address user, uint256 listingId) external view returns (bool) {
        IBabylonCore.Participation memory participation = _babylonCore.getParticipation(user, listingId);
        if (_editions[listingId] != 0 && participation.amount > _minted[user][listingId])
            return true;

        return false;
    }

    function getEdition(uint256 listingId) external view returns (uint256) {
        return _editions[listingId];
    }

    function getEditionURI(uint256 listingId) external view returns (string memory) {
        return IERC1155MetadataURI(_creatorCore).uri(_editions[listingId]);
    }

    function getMinted(address user, uint256 listingId) external view returns (uint256) {
        return _minted[user][listingId];
    }

    function getBabylonCore() external view returns (IBabylonCore) {
        return _babylonCore;
    }

    function getManifoldCreatorCore() external view returns (address) {
        return _creatorCore;
    }
}

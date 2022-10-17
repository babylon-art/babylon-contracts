// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.10;
pragma abicoder v2;
import "hardhat/console.sol";

import "../interfaces/IBabylonCore.sol";
import "../interfaces/ITokensController.sol";
import "../interfaces/IRandomProvider.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract BabylonCore is Initializable, IBabylonCore, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    ITokensController internal _tokensController;
    IRandomProvider internal _randomProvider;
    uint256 internal _availableId;

    // collection address -> tokenId -> id of a listing
    mapping(address => mapping(uint256 => uint256)) internal _ids;
    // address of a user -> id of a listing -> participation struct
    mapping(address => mapping(uint256 => Participation)) internal _tickets;
    // id of a listing -> a listing info
    mapping(uint256 => ListingInfo) internal _listingInfos;
    // id of a listing -> index of a participant -> address of a participant
    mapping(uint256 => mapping(uint256 => address)) internal _participantsByIndex;

    event NewParticipant(uint256 listingId, address participant, uint256 ticketsAmount);
    event ListingStarted(uint256 listingId, address creator, address token, uint256 tokenId);
    event ListingResolving(uint256 listingId, uint256 randomRequestId);
    event ListingSuccessful(uint256 listingId, address claimer);
    event ListingCanceled(uint256 listingId);

    function initialize(
        ITokensController tokensController,
        IRandomProvider randomProvider
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ReentrancyGuard_init_unchained();
        _tokensController = tokensController;
        _randomProvider = randomProvider;
    }

    function startListing(
        ListingItem calldata item,
        uint256 timeStart,
        uint256 price,
        uint256 totalTickets
    ) external {
        require(price > 0, "BabylonCore: Price of one ticket is too low");
        require(totalTickets > 0, "BabylonCore: Number of tickets is too low");

        require(
            _tokensController.checkListingPrerequisites(msg.sender, item),
            "BabylonCore: Token should be owned and approved to the controller"
        );

        _ids[item.token][item.identifier] = _availableId;
        ListingInfo storage listing = _listingInfos[_availableId];
        listing.item = item;
        listing.state = ListingState.Active;
        listing.creator = msg.sender;
        listing.timeStart = timeStart;
        listing.totalTickets = totalTickets;
        listing.price = price;
        listing.blockOfCreation = block.number;

        emit ListingStarted(_availableId, msg.sender, item.token, item.identifier);

        _availableId++;
    }

    function participate(uint256 id, uint256 tickets) external payable {
        ListingInfo storage listing =  _listingInfos[id];
        require(listing.state == ListingState.Active, "BabylonCore: Listing state should be active");
        require(block.timestamp >= listing.timeStart, "BabylonCore: Too early to participate");
        uint256 current = listing.currentTickets;
        require(current + tickets <= listing.totalTickets, "BabylonCore: no available tickets");
        uint256 totalPrice = listing.price * tickets;
        require(msg.value == totalPrice, "BabylonCore: msg.value doesn't match price for tickets");

        Participation storage participation = _tickets[msg.sender][id];
        participation.amount += tickets;

        for (uint i = 0; i < tickets; i++) {
           _participantsByIndex[id][current + i] = msg.sender;
        }

        listing.currentTickets = current + tickets;

        emit NewParticipant(id, msg.sender, tickets);

        if (listing.currentTickets == listing.totalTickets) {
            listing.randomRequestId = _randomProvider.requestRandom(id);
            listing.state = ListingState.Resolving;

            emit ListingResolving(id, listing.randomRequestId);
        }
    }

    function cancelListing(uint256 id) external {
        ListingInfo storage listing =  _listingInfos[id];
        require(listing.state == ListingState.Active, "BabylonCore: Listing state should be active");
        require(msg.sender == listing.creator, "BabylonCore: Only listing creator can cancel");
        listing.state = ListingState.Canceled;

        emit ListingCanceled(id);
    }

    function transferETHToCreator(uint256 id) external nonReentrant {
        ListingInfo storage listing =  _listingInfos[id];
        require(listing.state == ListingState.Successful, "BabylonCore: Listing state should be successful");

        uint256 amount = listing.totalTickets * listing.price;
        (bool sent, ) = payable(listing.creator).call{value: amount}("");

        if (sent) {
            listing.state = ListingState.Finalized;
        }
    }

    function refund(uint256 id) external nonReentrant {
        ListingInfo storage listing =  _listingInfos[id];
        require(listing.state == ListingState.Canceled, "BabylonCore: Listing state should be canceled to refund");
        Participation storage participation = _tickets[msg.sender][id];
        require(!participation.refunded, "BabylonCore: Already refunded");

        uint256 amount = participation.amount * listing.price;
        (bool sent, ) = payable(listing.creator).call{value: amount}("");

        if (sent) {
            participation.refunded = true;
        }
    }

    function resolveClaimer(
        uint256 id,
        uint256 random
    ) external override {
        require(msg.sender == address(_randomProvider), "BabylonCore: msg.sender is not the Random Provider");
        ListingInfo storage listing =  _listingInfos[id];
        require(listing.state == ListingState.Resolving, "BabylonCore: Listing state should be resolving");
        uint256 claimerIndex = random % listing.totalTickets;
        address claimer = _participantsByIndex[id][claimerIndex];
        listing.claimer = claimer;
        listing.state = ListingState.Successful;
        _tokensController.sendToken(listing.item, listing.creator, claimer);

        emit ListingSuccessful(id, claimer);
    }

    function getListingId(address token, uint256 tokenId) external view returns (uint256) {
        return _ids[token][tokenId];
    }

    function getListingInfo(uint256 id) external view returns (ListingInfo memory) {
        return _listingInfos[id];
    }

    function getParticipation(address participant, uint256 id) external view returns (Participation memory) {
        return _tickets[participant][id];
    }

    function getTokensController() external view returns (ITokensController) {
        return _tokensController;
    }

    function getRandomProvider() external view returns (IRandomProvider) {
        return _randomProvider;
    }

    //will be removed, only for tests
    function getParticipantById(uint256 listingId, uint256 participantIndex) external view returns (address) {
        return _participantsByIndex[listingId][participantIndex];
    }
}

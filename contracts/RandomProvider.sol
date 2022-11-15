// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.8.10;

import "./interfaces/IRandomProvider.sol";
import "./interfaces/IBabylonCore.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

contract RandomProvider is IRandomProvider, Ownable, VRFConsumerBaseV2 {
    event RequestSent(uint256 requestId, uint256 listingId);
    event RequestFulfilled(uint256 requestId, uint256 listingId, uint256[] randomWords);

    struct RequestStatus {
        bool exists; // whether a requestId exists
        bool fulfilled; // whether the request has been successfully fulfilled
        uint256 listingId; //to which listing request corresponds
    }

    mapping(uint256 => RequestStatus) public requests;  //requestId --> requestStatus

    VRFCoordinatorV2Interface immutable VRF_COORDINATOR;
    uint64 immutable subscriptionId;
    bytes32 immutable keyHash;

    IBabylonCore internal _babylonCore;

    uint32 constant CALLBACK_GAS_LIMIT = 500000;
    uint16 constant REQUEST_CONFIRMATIONS = 3;
    uint16 constant NUM_WORDS = 1;

    constructor(
        IBabylonCore babylonCore_,
        uint64 subscriptionId_
    ) VRFConsumerBaseV2(0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D) {
        VRF_COORDINATOR = VRFCoordinatorV2Interface(0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D);
        keyHash = 0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15;
        _babylonCore = babylonCore_;
        subscriptionId = subscriptionId_;
    }

    function setCore(IBabylonCore babylonCore) external onlyOwner {
        _babylonCore = babylonCore;
    }

    function fulfillRandomWords(uint256 _requestId, uint256[] memory randomWords) internal override {
        require(requests[_requestId].exists, 'RandomProvider: requestId not found');
        requests[_requestId].fulfilled = true;
        _babylonCore.resolveClaimer(requests[_requestId].listingId, randomWords[0]);
        emit RequestFulfilled(_requestId, requests[_requestId].listingId, randomWords);
    }

    function requestRandom(
        uint256 listingId
    ) external override returns (uint256 requestId) {
        requestId = VRF_COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );

        requests[requestId] = RequestStatus({exists: true, fulfilled: false, listingId: listingId});
        emit RequestSent(requestId, listingId);
        return requestId;
    }
}

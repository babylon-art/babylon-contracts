// SPDX-License-Identifier: agpl-3.0

pragma solidity ^0.8.10;

interface IBabylonCore {
    enum ItemType {
        ERC721,
        ERC1155
    }

    struct Participation {
        uint256 amount;
        bool refunded;
    }

    struct ListingItem {
        ItemType itemType;
        address token;
        uint256 identifier;
        uint256 amount;
    }

    /**
     * @dev Indicates state of a listing.
    */
    enum ListingState {
        Active,
        Resolving,
        Successful,
        Finalized,
        Canceled
    }

    /**
     * @dev Contains all information for a specific listing.
    */
    struct ListingInfo {
        ListingItem item;
        ListingState state;
        address creator;
        address claimer;
        uint256 randomRequestId;
        uint256 price;
        uint256 timeStart;
        uint256 totalTickets;
        uint256 currentTickets;
        uint256 blockOfCreation;
    }

    function resolveClaimer(
        uint256 id,
        uint256 random
    ) external;
}

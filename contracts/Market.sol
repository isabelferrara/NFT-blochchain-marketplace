//SPDX-License-Identifier:MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTMarket is ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;
    Counters.Counter private _itemsSold;

    address payable owner;
    uint256 listingPrice = 0.025 ether;

    // Allowed withdrawals of previous bids
    mapping(address => uint256) pendingReturns;

    constructor() {
        owner = payable(msg.sender);
    }

    struct MarketItem {
        uint256 itemId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable owner;
        uint256 price;
        uint256 auctionEndsTime;
        bool isBid;
        bool sold;
        address highestBidder;
        uint256 highestBid;
    }

    mapping(uint256 => MarketItem) private idToMarketItem;

    event MarketItemCreated(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address owner,
        uint256 price,
        uint256 auctionEndsTime,
        bool isBid,
        bool sold,
        address highestBidder,
        uint256 highestBid
    );

    // Events that will be emitted on changes.
    event HighestBidIncreased(address bidder, uint256 amount);
    event AuctionEnded(address winner, uint256 amount);

    function getListingPrice() public view returns (uint256) {
        return listingPrice;
    }

    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        bool isBid
    ) public payable nonReentrant {
        require(price > listingPrice, "Price must be at least 0.25");
        require(
            msg.value == listingPrice,
            "Price must be equal to listing price"
        );
        uint256 auctionEndsTime = block.timestamp + 5 minutes;
        _itemIds.increment();
        uint256 itemId = _itemIds.current();
        idToMarketItem[itemId] = MarketItem(
            itemId,
            nftContract,
            tokenId,
            //person selling
            payable(msg.sender),
            //there is no owner, setting up an empty account
            payable(address(0)),
            price,
            auctionEndsTime,
            isBid,
            false,
            payable(msg.sender),
            price
        );

        /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {safeTransferFrom} whenever possible.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.

      function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
     */

        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        emit MarketItemCreated(
            itemId,
            nftContract,
            tokenId,
            msg.sender,
            address(0),
            price,
            auctionEndsTime,
            isBid,
            false,
            msg.sender,
            price
        );
    }

    function createMarketSale(address nftContract, uint256 itemId)
        public
        payable
        nonReentrant
    {
        uint256 price = idToMarketItem[itemId].price;
        uint256 tokenId = idToMarketItem[itemId].tokenId;
        require(
            msg.value == price,
            "please submit the asking price in order to complete the purchase"
        );
        idToMarketItem[itemId].seller.transfer(msg.value);
        // transfere teh ownership from contract address to buyer
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        idToMarketItem[itemId].owner = payable(msg.sender);
        idToMarketItem[itemId].sold = true;
        _itemsSold.increment();
        //comission
        payable(owner).transfer(listingPrice);
    }

    /// Withdraw a bid that was overbid.
    function withdraw() public returns (bool) {
        uint256 amount = pendingReturns[msg.sender];
        if (amount > 0) {
            // It is important to set this to zero because the recipient
            // can call this function again as part of the receiving call
            // before `send` returns.
            pendingReturns[msg.sender] = 0;

            if (!payable(msg.sender).send(amount)) {
                // No need to call throw here, just reset the amount owing
                pendingReturns[msg.sender] = amount;
                return false;
            }
        }
        return true;
    }

    function createMarketBid(uint256 itemId) public payable nonReentrant {
        uint256 initialPrice = idToMarketItem[itemId].price;
        uint256 auctionEndsTime = idToMarketItem[itemId].auctionEndsTime;
        address highestBidder = idToMarketItem[itemId].highestBidder;
        uint256 highestBid = idToMarketItem[itemId].highestBid;

        require(block.timestamp <= auctionEndsTime, "Auction already ended");
        require(
            msg.value >= initialPrice,
            "bid needs to be higher than initial price"
        );
        require(
            msg.value > highestBid + listingPrice,
            "needs to be higher than previous bid + listing price of 0.025"
        );
        // //comission
        payable(owner).transfer(listingPrice);
        if (highestBid != 0) {
            // Sending back the money by simply using
            // highestBidder.send(highestBid) is a security risk
            // because it could execute an untrusted contract.
            // It is always safer to let the recipients
            // withdraw their money themselves..
            pendingReturns[highestBidder] += highestBid;
        }
        idToMarketItem[itemId].highestBidder = msg.sender;
        idToMarketItem[itemId].highestBid = msg.value;
        emit HighestBidIncreased(msg.sender, msg.value);
    }

    /// End the auction and send the highest bid
    /// to the beneficiary.
    function auctionEnd(address nftContract, uint256 itemId) public {
        uint256 auctionEndsTime = idToMarketItem[itemId].auctionEndsTime;
        uint256 tokenId = idToMarketItem[itemId].tokenId;
        address highestBidder = idToMarketItem[itemId].highestBidder;
        uint256 highestBid = idToMarketItem[itemId].highestBid;
        require(block.timestamp >= auctionEndsTime, "Auction not yet ended.");
        emit AuctionEnded(highestBidder, highestBid);

        // highestBidder = msg.sender;
        // highestBid = msg.value;
        // // transfere the highest bid
        idToMarketItem[itemId].seller.transfer(highestBid);
        // transfere tmhe ownership from contract address to buyer
        IERC721(nftContract).transferFrom(
            address(this),
            //last bid in array
            highestBidder,
            tokenId
        );
        idToMarketItem[itemId].owner = payable(highestBidder);

        // //when time passes and item is sold to last bidder
        idToMarketItem[itemId].sold = true;
        _itemsSold.increment();
        emit AuctionEnded(highestBidder, highestBid);
    }

    //create array of unsold items
    function fetchMarketItems() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 unsoldItemCount = _itemIds.current() - _itemsSold.current();
        uint256 currentIndex = 0;

        // if address is empty, the its unsold
        //create array of unsold items
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            // check if its unsold
            //address(0) means there is no owner
            if (idToMarketItem[i + 1].owner == address(0)) {
                uint256 currentId = idToMarketItem[i + 1].itemId;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    //create array of bids items
    function fetchMarketItemsBids() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemIds.current();
        uint256 unsoldItemCount = _itemIds.current() - _itemsSold.current();
        uint256 currentIndex = 0;

        // if address is empty, the its unsold
        //create array of unsold items
        MarketItem[] memory items = new MarketItem[](unsoldItemCount);
        for (uint256 i = 0; i < itemCount; i++) {
            // check if its unsold
            if (idToMarketItem[i + 1].owner == address(0)) {
                uint256 currentId = idToMarketItem[i + 1].itemId;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    // Return ntfs that user has purchased
    function fetchMyNfts() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _itemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].owner == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    /* Returns only items a user has created */
    function fetchItemsCreated() public view returns (MarketItem[] memory) {
        uint256 totalItemCount = _itemIds.current();
        uint256 itemCount = 0;
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 i = 0; i < totalItemCount; i++) {
            if (idToMarketItem[i + 1].seller == msg.sender) {
                uint256 currentId = i + 1;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }
}

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTMarket", function () {
  it("Should create and execute market sales", async function () {
   const Market = await ethers.getContractFactory('NFTMarket')
   const market = await Market.deploy()
   await market.deployed()
   const marketAddress =market.address

   const NFT= await ethers.getContractFactory("NFT")
   const nft = await NFT.deploy(marketAddress)
   await nft.deployed()
   const nftContractAddress =nft.address

   let listingPrice = await market.getListingPrice()
   listingPrice = listingPrice.toString()

// price in Matuic
    const auctionPrice = ethers.utils.parseUnits('100', 'ether')
    const higherAuction = ethers.utils.parseUnits('500', 'ether')
    const higherAuction2 = ethers.utils.parseUnits('600', 'ether')
    const higherAuction3 = ethers.utils.parseUnits('400', 'ether')
    const higherAuction4 = ethers.utils.parseUnits('800', 'ether')

    await nft.createToken('https://www.myTokenLocation.com')
    await nft.createToken('https://www.myTokenLocation2.com')

    await market.createMarketItem(nftContractAddress, 1, auctionPrice, true, {value:listingPrice})
    // await market.createMarketItem(nftContractAddress, 2, auctionPrice, true, {value:listingPrice})


    const [_, buyerAddress] = await ethers.getSigners()

    // await market.connect(buyerAddress).createMarketSale(nftContractAddress, 1, { value: auctionPrice})
    await market.connect(buyerAddress).createMarketBid( 1, { value: higherAuction})
    await market.connect(buyerAddress).createMarketBid( 1, { value: higherAuction2})
    await market.connect(buyerAddress).createMarketBid( 1, { value: higherAuction3})
    await market.connect(buyerAddress).createMarketBid( 1, { value: higherAuction4})
    await market.connect(buyerAddress).auctionEnd(nftContractAddress, 1)

    items = await market.fetchMarketItems()
    items = await Promise.all(items.map(async i => {
      const tokenUri = await nft.tokenURI(i.tokenId)
     return {
        price: i.price.toString(),
        tokenId: i.price.toString(),
        seller: i.seller,
        owner: i.owner,
        tokenUri,
        auctionEndsTime: i.auctionEndsTime,
        isBid: i.isBid,
        sold: i.sold,
        highestBidder: i.highestBidder,
        highestBid: i.highestBid.toString()
      }
    }))
    console.log('items: ', items)

  });
});

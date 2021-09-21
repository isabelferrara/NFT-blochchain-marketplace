import { ethers } from 'ethers'
import { useEffect, useState, useMemo} from 'react'
import axios from 'axios'
import Web3Modal from "web3modal"


import {
  nftaddress, nftmarketaddress
} from '../config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import Market from '../artifacts/contracts/Market.sol/NFTMarket.json'

export default function Home() {
  const [nfts, setNfts] = useState([])
  const [loadingState, setLoadingState] = useState('not-loaded')
  const [formInput, updateFormInput] = useState(0)
  const [current, setCurrent] = useState(null)
  const [ended, setEnded] = useState(false)
  const [diff, setDiff] = useState({});

  useEffect(() => {
    // var currentTime = new Date().getTime() / 1000;
    getSelectedAddress()

    loadNFTs()
  }, [])

  const getSelectedAddress = ()=>{
    const providers = new ethers.providers.Web3Provider(window.ethereum)
setCurrent(providers.provider.selectedAddress)
  }
  
  async function loadNFTs() {    
    const provider = new ethers.providers.JsonRpcProvider()
    const tokenContract = new ethers.Contract(nftaddress, NFT.abi, provider)
    const marketContract = new ethers.Contract(nftmarketaddress, Market.abi, provider)

    const data = await marketContract.fetchMarketItems()

    const items = await Promise.all(data.map(async i => {
      
      //   ////
      //   function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
      //     require(_exists(tokenId), "ERC721URIStorage: URI query for nonexistent token");
  
      //     string memory _tokenURI = _tokenURIs[tokenId];
      //     string memory base = _baseURI();
  
      //     // If there is no base URI, return the token URI.
      //     if (bytes(base).length == 0) {
      //         return _tokenURI;
      //     }
      //     // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
      //     if (bytes(_tokenURI).length > 0) {
      //         return string(abi.encodePacked(base, _tokenURI));
      //     }
  
      //     return super.tokenURI(tokenId);
      // }

      //is the url of the token we want to get
      const tokenUri = await tokenContract.tokenURI(i.tokenId)
      const meta = await axios.get(tokenUri)
      let price = ethers.utils.formatUnits(i.price.toString(), 'ether')
      let time = i.auctionEndsTime.toNumber()
      let highestBid = ethers.utils.formatUnits(i.highestBid.toString(), 'ether')
      let date = new Date(time * 1000)
     let datevalues =` ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`

     console.log(i.highestBidder.toString(), 'isa', current)
     return {
        price,
        tokenId: i.tokenId.toNumber(),
        seller: i.seller,
        owner: i.owner,
        image: meta.data.image,
        name: meta.data.name,
        description: meta.data.description,
        isBid: i.isBid,
        sold: i.sold,
         highestBidder: i.highestBidder,
         highestBid: highestBid,
         auctionEndsTime: datevalues
      }
    }))
    setNfts(items)
    setLoadingState('loaded') 

  }


  // const getDateDiff = (date1, date2) => {
  //   const diff = new Date(date2.getTime() - date1.getTime());
  //   return {
  //     year: diff.getUTCFullYear() - 1970,
  //     month: diff.getUTCMonth(),
  //     day: diff.getUTCDate() - 1,
  //     hour: diff.getUTCHours(),
  //     minute: diff.getUTCMinutes(),
  //     second: diff.getUTCSeconds()
  //   };
  // };



  // useMemo(() => {
  //   const timer = setInterval(() => {
  //     setDiff(getDateDiff(new Date(), futureDate));
  //   }, 1000);
  //   return () => clearInterval(timer);
  // }, []);

  async function buyNft(nft) {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    let transaction=[]
    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether')

    if(nft.isBid){
  let priceFormatted= ethers.utils.parseUnits(formInput, 'ether')
      try{
        transaction = await contract.createMarketBid(nft.tokenId, {
          value: priceFormatted 
        })
        await transaction.wait()

      }catch(e){
console.error(e);
      }
   
    }else{
      try{
        transaction = await contract.createMarketSale(nftaddress, nft.tokenId, {
          value: price
        })
        await transaction.wait()

      }catch(e){
console.error(e);
      }

    }

    loadNFTs()
  }


  async function getNft(nft) {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)
    const signer = provider.getSigner()
    const contract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    let transaction=[]
    const providers = new ethers.providers.Web3Provider(window.ethereum)
    const isCurrentAddress= providers.provider.selectedAddress
    if(isCurrentAddress===nft.highestBidder.toString().toLowerCase()){
      transaction = await contract.auctionEnd(nftaddress, nft.tokenId)
      console.log('win');
      await transaction.wait()
    }else{
      transaction = await contract.withdraw()
      console.log('with');
      await transaction.wait()
    }
   
    loadNFTs()
  }



  return (
<div className="flex justify-center">
      <div className="px-4" style={{ maxWidth: '1600px' }}>
      {loadingState === 'loaded' && !nfts.length && 
      <h1 className="px-20 py-10 text-3xl">No items in marketplace</h1>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {
             nfts.map((nft, i) => (
              <div key={i} className="border shadow rounded-xl overflow-hidden">
                <img src={nft.image} alt={nft.image}/>
                <div className="p-4">
                  <p style={{ height: '64px' }} className="text-2xl font-semibold">{nft.name}</p>
                  <p style={{ height: '64px' }} className="text-2xl font-semibold">{nft.seller.toString()}</p>
                  <small style={{ height: '64px', fontSize:'10px'}} className="text-2xl font-semibold">bid: {nft.highestBid}</small><br/>
                  <small style={{ height: '64px', fontSize:'10px'}}  className="text-2xl font-semibold">{nft.highestBidder.toString().toLowerCase()}</small>
                  <small style={{ height: '64px', fontSize:'10px'}}  className="text-2xl font-semibold"> {current}</small>

                  <p style={{ height: '64px' }} className="text-2xl font-semibold">time: {nft.auctionEndsTime}</p>
                  <div style={{ height: '70px', overflow: 'hidden' }}>
                    <p className="text-gray-400">{nft.description}</p>
                  </div>
                </div>
                <div className="p-4 bg-black">
                 { nft.isBid &&
                 <>
                <input
          placeholder="Asset Price in Eth"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput( e.target.value )}
          />
          <button className="w-full bidBtn text-white font-bold py-2 px-12 rounded" onClick={() => buyNft(nft)} disabled={!formInput || formInput<nft.highestBid}>Bid</button>
          <button className="w-full bidBtn text-white font-bold py-2 px-12 rounded" onClick={() => getNft(nft)}>{nft.highestBidder.toString().toLowerCase() === current? 'Get my nft': 'Widthrawl bid'} </button>                

</>
        }
             
               {!nft.isBid &&
               <>
                                 <small className=" mb-4 font-bold text-white">{nft.highestBidder.toString().toLowerCase()=== current}ETH</small>
                                 <button className="w-full bg-pink-500 text-white font-bold py-2 px-12 rounded" onClick={() => buyNft(nft)}>Buy</button>

                  </>
}

                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>

  )
}

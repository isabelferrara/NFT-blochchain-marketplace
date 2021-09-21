import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { create as ipfsHttpClient } from 'ipfs-http-client'
import { useRouter } from 'next/router'
import Web3Modal from 'web3modal'

const client = ipfsHttpClient('https://ipfs.infura.io:5001/api/v0')

import {
  nftaddress, nftmarketaddress
} from '../config'

import NFT from '../artifacts/contracts/NFT.sol/NFT.json'
import Market from '../artifacts/contracts/Market.sol/NFTMarket.json'

export default function CreateItem() {
  const [fileUrl, setFileUrl] = useState(null)
  const [disable, setDisable] = useState(false)
  const [formInput, updateFormInput] = useState({ price: '', name: '', description: '', isBid:false })
  const router = useRouter()


  useEffect(() => {
    console.log(formInput);

  }, [formInput])


  async function onChange(e) {
    const file = e.target.files[0]
    try {
      const added = await client.add(
        file,
        {
          progress: (prog) => console.log(`received: ${prog}`)
        }
      )
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      setFileUrl(url)
    } catch (error) {
      console.log('Error uploading file: ', error)
    }  
  }


  async function createMarket() {
    const { name, description, price, isBid } = formInput
    if (!name || !description || !price || !fileUrl ) {
        setDisable(true)
    }else{ 
        setDisable(false)
    }
    /* first, upload to IPFS */
    const data = JSON.stringify({
      name, description, image: fileUrl, isBid
    })
    try {
      const added = await client.add(data)
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      /* after file is uploaded to IPFS, pass the URL to save it on Polygon */
      createSale(url)
      console.log(added, 'is')

    } catch (error) {
      console.log('Error uploading file: ', error)
    }  
  }

  const createSale = async (url)=> {
    const web3Modal = new Web3Modal()
    const connection = await web3Modal.connect()
    const provider = new ethers.providers.Web3Provider(connection)   

    // The Metamask plugin also allows signing transactions to
// send ether and pay to change state within the blockchain.
// For this, you need the account signer... 
    const signer = provider.getSigner()
    
    /* next, create the item */
    let contract = new ethers.Contract(nftaddress, NFT.abi, signer)
    let transaction = await contract.createToken(url)
    let tx = await transaction.wait()
    let event = tx.events[0]
    let value = event.args[2]
    let tokenId = value.toNumber()
    // console.log(transaction, tx, event,value, tokenId, '1')

    const price = ethers.utils.parseUnits(formInput.price, 'ether')
  
    /* then list the item for sale on the marketplace */
    contract = new ethers.Contract(nftmarketaddress, Market.abi, signer)
    let listingPrice = await contract.getListingPrice()
    listingPrice = listingPrice.toString()
    transaction = await contract.createMarketItem(nftaddress, tokenId, price, formInput.isBid, { value: listingPrice })
    await transaction.wait()
    router.push('/')
  }

  return (
    <div className="flex justify-center">
      <div className="w-1/2 flex flex-col pb-12">
        <input 
          placeholder="Asset Name"
          className="mt-8 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
        />
        <textarea
          placeholder="Asset Description"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
        />
        <input
          placeholder="Asset Price in Eth"
          className="mt-2 border rounded p-4"
          onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
        />
        <input
          type="file"
          name="Asset"
          className="my-4"
          onChange={onChange}
        />
  <div className='flex items-center'>
  <label htmlFor="subscribeNews">Is it an auction?</label>
  <div className="inputRadioContainer flex justify-start items-center  my-1">

  <input
                    className="inputRadio"
                    type="radio"
                    id="si"
                    name="si"
                    onChange={() =>
                      updateFormInput({ ...formInput, isBid: true })
                    }
                    checked={formInput['isBid']}
                  />

                  <label htmlFor="Sí" className="inputRadio">
                    Sí
                  </label>
                </div>
                  <input
                    className="inputRadio"
                    type="radio"
                    name="No"
                    onChange={() =>
                      updateFormInput({ ...formInput, isBid: false })   
                                     }
                                     checked={!formInput['isBid']}
                                     />
                  <label htmlFor="No" className="inputRadio">
                    No
                  </label>
 
  </div>

        {
          fileUrl && (
            <img className="rounded mt-4" width="350" src={fileUrl} />
          )
        }
        <button onClick={createMarket} disabled={disable} className="font-bold mt-4 bg-pink-500 text-white rounded p-4 shadow-lg">
          Create Digital Asset
        </button>
      </div>
    </div>
  )
}
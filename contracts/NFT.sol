//SPDX-License-Identifier:MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// We can use function from storage
contract NFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address contractAddress;

    constructor(address marketplaceAddress) ERC721("Metaverse Tokens", "METT") {
        contractAddress = marketplaceAddress;
    }

    function createToken(string memory tokenURI) public returns (uint256) {
        /**
      Counter.sol
    * @dev Provides counters that can only be incremented, decremented or reset. This can be used e.g. to track the number
    * of elements in a mapping, issuing ERC721 ids, or counting request id
    
    function current(Counter storage counter) internal view returns (uint256) {
        return counter._value;
    }

    function increment(Counter storage counter) internal {
        unchecked {
            counter._value += 1;
        }
        }
     */
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();

        /**
      ERC721
     * @dev Mints `tokenId` and transfers it to `to`.
     *_mint(address to, uint256 tokenId)
     * Requirements:
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     * Emits a {Transfer} event.
        function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(address(0), to, tokenId);
    }
     */
        _mint(msg.sender, newItemId);

        /**
      ERC721URIStorage
     * @dev  Sets `_tokenURI` as the tokenURI of `tokenId.
     * Requirements:
     * - tokenId` must exist.
     *   function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721URIStorage: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;


    }
     */
        _setTokenURI(newItemId, tokenURI);

        /**
      ERC721
     *give marketplace approval  to transact token between users from within another contract
      function setApprovalForAll(address operator, bool approved) public virtual override {
        require(operator != _msgSender(), "ERC721: approve to caller");

        _operatorApprovals[_msgSender()][operator] = approved;
        emit ApprovalForAll(_msgSender(), operator, approved);
    }
     */
        setApprovalForAll(contractAddress, true);

        //we can get a hold of it from the frontend
        return newItemId;
    }
}

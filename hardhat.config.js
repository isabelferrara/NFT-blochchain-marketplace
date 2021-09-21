require("@nomiclabs/hardhat-waffle");
const fs = require("fs")
const privateKey = fs.readFileSync(".secret").toString()
const proyectId= '8a559b5474f042d982df387abed72578' 

module.exports = {
  networks:{
    hardhat:{
      chainId: 1337
    },
    mumbai: {
      url:`https://polygon-mumbai.infura.io/v3/${proyectId}`,
      accounts:[privateKey]
    },
    mainet:{
      url: `https://polygon-mainnet.infura.io/v3/${proyectId}`,
      accounts:[privateKey]
    }
  },
  solidity: "0.8.4",
};

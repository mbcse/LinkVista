require('dotenv').config()

require('@nomiclabs/hardhat-etherscan')
require('@nomiclabs/hardhat-web3')
require('@nomiclabs/hardhat-waffle')
require('@openzeppelin/hardhat-upgrades')

require('hardhat-gas-reporter')
require('solidity-coverage')
require('hardhat-contract-sizer')

require("hardhat-interface-generator");
require('hardhat-deploy');
const ethers = require('ethers')

require('./tasks')
const config = require('./config')

function getPrivateKeys () {
  const privateKeys = config.PRIVATE_KEYS
  // if(Object.keys(privateKeys).length === 0){
  //   throw new Error("Please provide private keys in privateKeys.json file for setup")
  // }
  const privateKeysArray = []

  for (const [, value] of Object.entries(privateKeys)) {
    privateKeysArray.push(value)
  }
  return privateKeysArray
}

function getNamedAccounts () {
  const privateKeys = config.PRIVATE_KEYS
  // if(Object.keys(privateKeys).length === 0){
  //   throw new Error("Please provide private keys in privateKeys.json file for setup")
  // }
  const privateKeysObject = {}

  for (const [name, value] of Object.entries(privateKeys)) {
    privateKeysObject[name] = {default : new ethers.Wallet(value).address}
  }
  return privateKeysObject
}


module.exports = {
  solidity: {
    compilers:[
    {
        version: '0.8.4',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          },
          viaIR: true,
        },
    },
    {
      version: '0.8.9',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        viaIR: true,
      }
    },
    
    {
      version: '0.8.17',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        viaIR: true,
      }
    },
    {
      version: '0.8.19',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        viaIR: true,
      }
    }    
    ]
  },
  networks: {

    local_ganache: {
      url: "http://127.0.0.1:8545",
      accounts: getPrivateKeys()
    },
    
    lightlink_pegasus: {
      url: config.NETWORKS.LIGHTLINK_PEGASUS.RPC_URL || '',
      accounts: getPrivateKeys()
    },

    custom: {
      url: config.NETWORKS.CUSTOM.RPC_URL || '',
      accounts: getPrivateKeys()
    }
  },
  gasReporter: {
    enabled: config.REPORT_GAS,
    currency: 'USD'
  },

  etherscan: {
    apiKey: 'blockscout',
    customChains: [
      {
        network: "lightlink_pegasus",
        chainId: 1891,
        urls: {
          apiURL: "https://pegasus.lightlink.io/api",
          browserURL: "https://pegasus.lightlink.io/"
        }
      }
    ]

  },

  namedAccounts: getNamedAccounts(),

  mocha: {
    timeout: 500000
  }
}

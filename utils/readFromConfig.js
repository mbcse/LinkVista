const path = './contractDataV4'
const { constants } = require('fs')
const fs = require('fs').promises

async function checkFileExists (file) {
  return fs.access(file, constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

async function readFromConfig (chainId, contractName, fieldType) {
  try {
    const fieldTypePath = path + (fieldType === 'ABI' ? '_ABI': '_ADDRESS') +'.json'
    if (!await checkFileExists(fieldTypePath)) {
      await fs.writeFile(fieldTypePath, JSON.stringify({}, null, 4))
    }
    const contractConfig = JSON.parse(await fs.readFile(fieldTypePath))
    if(!contractConfig[chainId][fieldType]) return null
    return contractConfig[chainId][fieldType][contractName]
  } catch (err) {
    console.log(err)
    console.log(`Couldn't Read ${fieldType} for contract ${contractName} from config on ChainId ${chainId}`)
    throw err
  }
}

module.exports = readFromConfig

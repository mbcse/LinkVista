const path = './contractDataV4'
const { constants } = require('fs')
const fs = require('fs').promises

async function checkFileExists (file) {
  return fs.access(file, constants.F_OK)
    .then(() => true)
    .catch(() => false)
}

async function saveToConfig (chainId, contractName, fieldType, value) {
  try {
    const fieldTypePath = path + (fieldType === 'ABI' ? '_ABI': '_ADDRESS') +'.json'
    if (!await checkFileExists(fieldTypePath)) {
      console.log("Contract data File Not Found, Creating One...")
      await fs.writeFile(fieldTypePath, JSON.stringify({}, null, 4))
    }
    const contractConfig = JSON.parse(await fs.readFile(fieldTypePath))
    if(!contractConfig[chainId]) contractConfig[chainId] = {}

    if(!contractConfig[chainId][fieldType]) contractConfig[chainId][fieldType] = {}

    contractConfig[chainId][fieldType][contractName] = value

    await fs.writeFile(fieldTypePath, JSON.stringify(contractConfig, null, 4))
    console.log(`Saved ${contractName} ${fieldType} on ChainId ${chainId} to ${fieldTypePath}`)
  } catch (err) {
    console.log(err)
    console.log(`Couldn't Save ${fieldType} for contract ${contractName} to config`)
  }
}

module.exports = saveToConfig

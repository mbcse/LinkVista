const { ethers, upgrades } = require('hardhat')
const saveToConfig = require('../utils/saveToConfig')
const readFromConfig = require('../utils/readFromConfig')
const deploySettings = require('./deploySettings')

async function main () {

  const chainId = await hre.getChainId()
  console.log("STARTING LinkVista UPGRADE ON ", chainId)
  const CHAIN_NAME = deploySettings[chainId].CHAIN_NAME

  const LinkVistaV2 = await ethers.getContractFactory('LinkVista')

  const LinkVistaABI = (await artifacts.readArtifact('LinkVista')).abi
  await saveToConfig(chainId, `LinkVista`, 'ABI', LinkVistaABI)

  const linkvistaAddress = await readFromConfig(chainId, `LinkVista`, 'ADDRESS')

  console.log('Upgrading LinkVista Contract...')
  const tx = await upgrades.upgradeProxy(linkvistaAddress, LinkVistaV2, {kind:'uups', redeployImplementation: true})
  await new Promise((resolve) => setTimeout(resolve, 25000)) // 25 seconds
  console.log('LinkVista upgraded')

  console.log('Verifying LinkVista Implementation Contract...')
  try {
    const currentImplAddress = await upgrades.erc1967.getImplementationAddress(linkvistaAddress)
    console.log('current implementation address: ', currentImplAddress)
    await run('verify:verify', {
      address: currentImplAddress,
      contract: 'contracts/LinkVista.sol:LinkVista', // Filename.sol:ClassName
      constructorArguments: [],
      network: deploySettings[chainId].NETWORK_NAME
    })
  } catch (error) {
    console.log(error)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

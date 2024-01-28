const { artifacts, ethers, upgrades } = require('hardhat');
const getNamedSigners = require('../utils/getNamedSigners');
const saveToConfig = require('../utils/saveToConfig');
const readFromConfig = require('../utils/readFromConfig');
const deploySettings = require('./deploySettings');

async function main() {
  const chainId = await hre.getChainId();
  console.log("STARTING NEW CONTRACT DEPLOYMENT ON ", chainId);

  // Retrieve necessary deployment settings
  const CHAIN_NAME = deploySettings[chainId].CHAIN_NAME;
  // Add any additional settings needed for the new contract

  console.log('Deploying LinkVista Smart Contract');
  const { payDeployer } = await getNamedSigners();

  // Assuming 'LinkVista' is the name of your new contract
  const LINKVISTA_CONTRACT = await ethers.getContractFactory('LinkVista');
  LINKVISTA_CONTRACT.connect(payDeployer);

  // Replace the following with the actual initialization parameters for your contract
  const defaultAdmin = deploySettings[chainId].DEFAULT_ADMIN; // Replace with the actual default admin address
  const swapRouterAddress = deploySettings[chainId].SWAP_ROUTER_ADDRESS; // Replace with the actual address
  const universalrouterAddresss = deploySettings[chainId].UNIVERSAL_ROUTER_ADDRESS; // Replace with the actual address
  const wethAddress = deploySettings[chainId].WETH_ADDRESS; // Replace with the actual address
  const poolFee = deploySettings[chainId].POOL_FEE; // Replace with the actual pool fee


  // You may need to replace 'NEW_CONTRACT_ARGUMENTS' with the actual constructor arguments
  const linkVistaContract = await upgrades.deployProxy(
    LINKVISTA_CONTRACT,
    [
      defaultAdmin,
      swapRouterAddress,
      universalrouterAddresss,
      wethAddress,
      poolFee
    ],
    { initializer: 'initialize', kind: 'uups' }
  );
  await linkVistaContract.deployed();

  // Save ABI to configuration
  const linkVistaABI = (await artifacts.readArtifact('LinkVista')).abi;
  await saveToConfig(chainId, 'LinkVista', 'ABI', linkVistaABI);

  // Save the deployed contract address to configuration
  await saveToConfig(chainId, 'LinkVista', 'ADDRESS', linkVistaContract.address);
  console.log('LinkVista contract deployed to:', linkVistaContract.address, ` on ${CHAIN_NAME}`);


  console.log('Verifying LinkVista Implementation Contract...')
  try {
    const currentImplAddress = await upgrades.erc1967.getImplementationAddress(linkVistaContract.address)
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
  console.error(error);
  process.exitCode = 1;
});
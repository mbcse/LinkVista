var ethers = require('ethers');  
var crypto = require('crypto');
const { getStringKey, pushStringToRedisWithKey } = require('../redis');
const abi = require('./abi');
const contractAddresses = require('./contractAddresses');
const { getAccount } = require('./accountHelpers');
const TelegramBot = require('node-telegram-bot-api');
const config = require('../bot/config');
const provider = new ethers.providers.JsonRpcProvider('https://replicator.pegasus.lightlink.io/rpc/v1')




const executeLimitOrder = async (orderId) => {
  try {
      const wallet = new ethers.Wallet(config.ADMIN_PRIVATE_KEY, provider);
      const contract = new ethers.Contract(contractAddresses[`1891`].ADDRESS['LinkVista'], abi['1891'].ABI.LinkVista, wallet);
      const tx = await contract.executeLimitOrder(orderId);
      return tx;
  } catch (error) {
    console.log(error.message)
    console.log("Error executing limit order, Will Try Again")
  }
}

const runLimitOrderExecutor = async () => {
    const wallet = new ethers.Wallet(config.ADMIN_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(contractAddresses[`1891`].ADDRESS['LinkVista'], abi['1891'].ABI.LinkVista, wallet);
    const totalActiveLimitOrders = parseInt((await contract.totalActiveLimitOrders()).toString());
    const activeOrders = await contract.getActiveLimitsOrders();
    console.log("No of Active Limit Orders: ", totalActiveLimitOrders)
    for(let i = 0; i< totalActiveLimitOrders; i++) {
        const orderId = activeOrders[i];
        await executeLimitOrder(orderId);
    }
}


setInterval(runLimitOrderExecutor, 30000)


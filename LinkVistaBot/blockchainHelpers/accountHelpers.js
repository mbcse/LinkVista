var ethers = require('ethers');  
var crypto = require('crypto');
const { getStringKey, pushStringToRedisWithKey } = require('../redis');
const abi = require('./abi');
const contractAddresses = require('./contractAddresses');
const provider = new ethers.providers.JsonRpcProvider('https://replicator.pegasus.lightlink.io/rpc/v1')
const supportedTokens = ['WETH', 'USDC']
async function createNewAccount() {
    var id = crypto.randomBytes(32).toString('hex');
    var privateKey = "0x"+id;
    console.log("SAVE BUT DO NOT SHARE THIS:", privateKey);
    var wallet = new ethers.Wallet(privateKey);
    console.log("Address: " + wallet.address);
    return {
        privateKey: privateKey,
        address: wallet.address
    }
}

async function getAccount (userId) {
    const account = await getStringKey(userId+"_account");
    if(account) {
        return JSON.parse(account)
    } else {
        const newAccount = await createNewAccount()
        await pushStringToRedisWithKey(newAccount.address+"_userId", userId)
        await pushStringToRedisWithKey(userId+"_account", JSON.stringify(newAccount))
        return newAccount
    }
}


async function getAccountBalance(userId) {
    const account = await getAccount(userId)
    const balance = await provider.getBalance(account.address);
    const accountBalance = {}
    accountBalance['ETH'] = ethers.utils.formatEther(balance);

    for(let i = 0;i< supportedTokens.length;i++) {
        const token = supportedTokens[i]
        console.log(token)
        const contractAddress = contractAddresses[`1891`].ADDRESS[token]
        const contract = new ethers.Contract(contractAddress, abi.ERC20, provider);
        const decimals =  await contract.decimals();
        const tokenBalance = await contract.balanceOf(account.address);
        console.log(tokenBalance.toString())
        accountBalance[token] = ethers.utils.formatUnits(tokenBalance.toString(), decimals.toString()).toString();
    }
    return accountBalance;
}

module.exports = {
    getAccount,
    getAccountBalance
}
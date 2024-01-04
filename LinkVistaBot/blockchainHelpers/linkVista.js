var ethers = require('ethers');  
var crypto = require('crypto');
const { getStringKey, pushStringToRedisWithKey } = require('../redis');
const abi = require('./abi');
const contractAddresses = require('./contractAddresses');
const { getAccount } = require('./accountHelpers');
const TelegramBot = require('node-telegram-bot-api');
const bot = require('../bot/telegramBot');
const config = require('../bot/config');
const provider = new ethers.providers.JsonRpcProvider('https://replicator.pegasus.lightlink.io/rpc/v1')


const contractListner = async (token) =>{
const bot = new TelegramBot(token)
console.log("ContractListner started...")
const provider = new ethers.providers.JsonRpcProvider('https://replicator.pegasus.lightlink.io/rpc/v1')

const vistaContractAddress = contractAddresses[`1891`].ADDRESS['LinkVista']

const contract = new ethers.Contract(vistaContractAddress, abi['1891'].ABI.LinkVista, provider);
    // Replace the event name and parameters with your specific event
const eventName = 'LimitOrderExecuted';

// Listen to the event
contract.on(eventName, async (from, to, fromToken, toToken, amountIn, amountOut, event) => {
  console.log(event)
  console.log('Limit Order Executed Event:');
  console.log('From:', from);
  console.log('To:', to);
  console.log('From Token:', fromToken);
  console.log('To Token:', toToken);
  console.log('Amount In:', amountIn.toString());
  console.log('Amount Out:', amountOut.toString());
  console.log('Transaction Hash:', event.transactionHash);
  console.log('Block Number:', event.blockNumber);
  console.log('------------------------');

  const userChatId = await getStringKey(from+"_userId");

  const account = await getAccount(userChatId);
  const wallet = new ethers.Wallet(account.privateKey, provider);
  const inTokenContract =  new ethers.Contract(fromToken, abi.ERC20, wallet);
  const outTokenContract =  new ethers.Contract(toToken, abi.ERC20, wallet);

  const messageContent = `Limit Order Executed Successfully! You spent ${ethers.utils.formatUnits(amountIn.toString(), await inTokenContract.decimals())}, You Received ${ethers.utils.formatUnits(amountOut.toString(), await outTokenContract.decimals())} ${"WETH"}.
  txHash: https://pegasus.lightlink.io/tx/${event.transactionHash}`
  bot.sendMessage(userChatId, messageContent)
  .then(async sentMessage => {
    console.log('Message sent:', sentMessage);
    saveWealth(userChatId, fromToken, ethers.utils.formatUnits(amountIn.toString(), await inTokenContract.decimals()))
  })
  .catch(error => {
    console.error('Error sending message:', error);
  });
});

// Handle errors
contract.on('error', error => {
  console.error('Error:', error);
});

}



const pay = async(userId, receiverAddress, amount, tokenName) => {
    try {
        const account = await getAccount(userId);
        const wallet = new ethers.Wallet(account.privateKey, provider);

        let contract, underlyingToken;

        if (!tokenName || tokenName === 'ETH') {
            // If native currency (Ethereum)
            contract = wallet;
            underlyingToken = 'ETH';
        } else {
            // If ERC20 token
            const contractAddress = contractAddresses[`1891`].ADDRESS[tokenName];
            contract = new ethers.Contract(contractAddress, abi.ERC20, wallet);
        }

        

        if (underlyingToken === 'ETH') {
            const amountToSendInUnits = ethers.utils.parseUnits(amount, 18).toString();
            const balance = await wallet.getBalance();
            if (balance.lt(amountToSendInUnits)) {
                return {
                    success: false,
                    message: `You don't have enough ${underlyingToken} to send.`,
                };
            }
            // Native currency (ETH) logic
            const tx = await wallet.sendTransaction({
                to: receiverAddress,
                value: amountToSendInUnits,
            });
            saveWealth(userId, config.NATIVE_ADDRESS, amount)
            return {
                success: true,
                message: `Transaction Submitted Successfully`,
                txHash: "https://pegasus.lightlink.io/tx/" + tx.hash,
            };


        } else {
            const decimals = await contract.decimals();
            const amountToSendInUnits = ethers.utils.parseUnits(amount, decimals).toString();
            const tokenBalance = (await contract.balanceOf(account.address)).toString();

            if (parseInt(tokenBalance) < parseInt(amountToSendInUnits)) {
                return {
                    success: false,
                    message: `You don't have enough ${underlyingToken} to send.`,
                };
            }
            // ERC20 token logic
            const tx = await contract.transfer(receiverAddress, amountToSendInUnits);
            saveWealth(userId, contract.address, amount)
            return {
                success: true,
                message: `Transaction Submitted Successfully`,
                txHash: "https://pegasus.lightlink.io/tx/" + tx.hash,
            };
        }
    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: `Transaction Failed`,
            error: error,
        };
    }
};



const createLimitOrder = async(userId, amount, price, fromTokenName, toTokenName, toChain)=>{
    try {
        const account = await getAccount(userId)
        const wallet = new ethers.Wallet(account.privateKey, provider);
        const vistaContractAddress = contractAddresses[`1891`].ADDRESS['LinkVista']
        const vistaContract = new ethers.Contract(vistaContractAddress, abi['1891'].ABI.LinkVista, wallet);
        vistaContract.connect(wallet)
        const fromTokenContractAddress = contractAddresses[`1891`].ADDRESS[fromTokenName]
        const fromTokenContract = new ethers.Contract(fromTokenContractAddress, abi.ERC20, wallet);
        fromTokenContract.connect(wallet)
        const toTokenContractAddress = contractAddresses[`1891`].ADDRESS[toTokenName]
        const toTokenContract = new ethers.Contract(toTokenContractAddress, abi.ERC20, wallet);
        toTokenContract.connect(wallet)
        const decimals =  await fromTokenContract.decimals();
        const amountToSendInUnits = ethers.utils.parseUnits(amount, decimals).toString()
        const tokenBalance = (await fromTokenContract.balanceOf(account.address)).toString();
        if(parseInt(tokenBalance) < parseInt(amountToSendInUnits)){
            return {
                success: false,
                message: `You don't have enough ${fromTokenName} to send.`
            }
        }else{
            const allowance = (await fromTokenContract.allowance(wallet.address, vistaContractAddress)).toString()
            console.log(allowance)
            if(parseInt(allowance) < parseInt(amountToSendInUnits)){
                console.log("allowance required")
                const allowanceTx = await fromTokenContract.approve(vistaContractAddress, amountToSendInUnits);
                await allowanceTx.wait()
            }
            const tx = await vistaContract.createLimitOrder(wallet.address, wallet.address, amountToSendInUnits, price, fromTokenContractAddress, toTokenContractAddress, toChain )
            return {
                success: true,
                message: `Transaction Submitted Successfully`,
                txHash: "https://pegasus.lightlink.io/tx/"+tx.hash
            }
        }
    } catch (error) {
        console.log(error)
        return {
            success: false,
            message: `Transaction Failed`,
            error: error
        }
    }
}


const saveWealth = async (userId, tokenAddress, amount) => {
    console.log(amount)
    try {
        console.log(`Saving wealth for ${userId}`)
        const account = await getAccount(userId);
        const savingsDetails = JSON.parse(await getStringKey("savings_"+ userId));

        if (savingsDetails) {
            const rounUpAmount = roundUpToNearest(parseFloat(amount));
            console.log(rounUpAmount)
            amount = (rounUpAmount - parseFloat(amount)).toFixed(2);
            console.log(amount)
            const wallet = new ethers.Wallet(account.privateKey, provider);
            const vistaContractAddress = contractAddresses[`1891`].ADDRESS['LinkVista'];
            const vistaContract = new ethers.Contract(vistaContractAddress, abi['1891'].ABI.LinkVista, wallet);
            const lockInPeriod = getTimestampPlusDays(savingsDetails.lockInPeriod);
            let tx;

            let tokenName;

            if (tokenAddress === "0x0000000000000000000000000000000000000000") {
                // Native currency (ETH) transfer
                const balance = await provider.getBalance(account.address);
                const amountInUnits = ethers.utils.parseUnits(amount, 18).toString(); // Assuming 18 decimals for ETH

                if (BigInt(balance) < BigInt(amountInUnits)) {
                    console.log("savings tx failed as don't have enough funds")
                    return;
                }
                tokenName = "ETH"
                tx = await vistaContract.saveWealth(account.address, tokenAddress, amount, lockInPeriod.toString(), {
                    value: amountInUnits,
                });
            } else {
                // ERC20 token transfer
                const tokenContract = new ethers.Contract(tokenAddress, abi.ERC20, wallet);
                const tokenBalance = (await tokenContract.balanceOf(account.address)).toString();
                tokenName = await tokenContract.name();
                const allowance = (await tokenContract.allowance(account.address, vistaContractAddress)).toString();
                const amountInUnits = ethers.utils.parseUnits(amount, await tokenContract.decimals()).toString();

                if (parseInt(tokenBalance) < parseInt(amountInUnits)) {
                    console.log("savings tx failed as don't have enough funds")
                    return;
                }

                if (parseInt(allowance) < parseInt(amountInUnits)) {
                    const approveTx = await tokenContract.approve(vistaContractAddress, ethers.constants.MaxUint256);
                    await approveTx.wait();
                }

                tx = await vistaContract.saveWealth(account.address, tokenAddress, amountInUnits, lockInPeriod.toString());
            }

            bot.sendMessage(userId, `Congrats You have successfully put ${amount} ${tokenName} into Savings!`);
        }
    } catch (error) {
        console.log(error);
        console.log("savings tx failed as don't have enough funds")
        return;
    }
};

function roundUpToNearest(number) {
    console.log(number)
    return Math.ceil(number * 2) / 2;
}

function getTimestampPlusDays(days) {
    // Get the current timestamp in milliseconds
    const currentTimestamp = new Date().getTime();

    // Add 30 days (in milliseconds)
    const timestampPlusDays = currentTimestamp + (parseInt(days) * 24 * 60 * 60 * 1000);

    // Convert the result to seconds (Unix timestamp)
    const timestampPlusDaysInSeconds = Math.floor(timestampPlusDays / 1000);

    return timestampPlusDaysInSeconds;
}


const fetchUserSavings = async (userId) => {
    const account = await getAccount(userId);
    const wallet = new ethers.Wallet(account.privateKey, provider);
    const vistaContractAddress = contractAddresses[`1891`].ADDRESS['LinkVista'];
    const vistaContract = new ethers.Contract(vistaContractAddress, abi['1891'].ABI.LinkVista, wallet);
    const savings = await vistaContract.getUserSavings(account.address);
    console.log(savings);
    let message = "Savings Details:\n\n";

    for (let i = 0; i < savings.length; i++) {
        const savingsDetails = await vistaContract.savings(savings[i]);

        let tokenName;
        let amount;

        if(savingsDetails.token === config.NATIVE_ADDRESS){
            tokenName = "ETH";
            amount = ethers.utils.formatUnits(savingsDetails.amount, 18);
            
        }else{
            const tokenContract = new ethers.Contract(savingsDetails.token, abi.ERC20, wallet);
            tokenName = await tokenContract.name();
            amount = ethers.utils.formatUnits(savingsDetails.amount, await tokenContract.decimals());
        }

        
        message += `Savings ID: ${savingsDetails.id}\n`;
        message += `Depositor: ${savingsDetails.depositor}\n`;
        message += `Token: ${tokenName}\n`;
        message += `Amount: ${amount}\n`;
        message += `Locked Till: ${new Date(savingsDetails.deadline * 1000)}\n\n`;
    }
    
    return message;

}


const withdrawSavingsWealth = async (userId, savingsId) => {
try {
        const account = await getAccount(userId);
        const wallet = new ethers.Wallet(account.privateKey, provider);
        const vistaContractAddress = contractAddresses[`1891`].ADDRESS['LinkVista'];
        const vistaContract = new ethers.Contract(vistaContractAddress, abi['1891'].ABI.LinkVista, wallet);
    
        const savingsDetails = await vistaContract.savings(savingsId);
        const lockInPeriod = savingsDetails.deadline;
    
        if(lockInPeriod > Math.floor(new Date().getTime() / 1000)){
            return "You can't withdraw savings before lock in period"
        }else{
            const tx = await vistaContract.withdrawWealth(savingsId);
            return {
                success: true,
                message: `Transaction Submitted Successfully`,
                txHash: "https://pegasus.lightlink.io/tx/"+tx.hash
            }
        }
} catch (error) {
    console.log(error)
    return {
        success: false,
        message: `Transaction Failed`,
        error: error.code
    }
}

}


module.exports = {
    pay,
    createLimitOrder,
    contractListner,
    fetchUserSavings,
    withdrawSavingsWealth
}
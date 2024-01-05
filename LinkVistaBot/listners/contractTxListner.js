const Web3 = require('web3');
const { getRevertReason } = require('./revertReason');
const { sendSlackAlert, sendSlackMessage } = require('./slackBot');
const { getStringKey, pushStringToRedisWithKey } = require('../redis');
const { ethers } = require('ethers');
require("dotenv").config();

const chainData = {
}

const runContractListner = async (contractAddress, rpcUrl) => {
const web3 = new Web3(rpcUrl)
const chainId = await web3.eth.getChainId()

const blockNumberRedisKey = `${chainId}_${contractAddress}_block_number`
let blockNumber = parseInt(await getStringKey(blockNumberRedisKey)) 

const waitTime = parseInt(getStringKey(`${chainId}_${contractAddress}_wait_time`)) || process.env.WAIT_TIME // seconds

let previousScannedBlockNumber = null


const networkName = chainData[chainId].name
const exploreLink = chainData[chainId].exploreLink
const currency = chainData[chainId].currency

if(!blockNumber) {
  console.log("No block number found in redis, starting from latest block")
  blockNumber = await web3.eth.getBlockNumber()
}else {
  console.log(`Block number found in redis, starting from block ${blockNumber}`)
}
console.log(`Contract Listner Started for contract ${contractAddress} on chain ${chainId}`)
sendSlackMessage("txslackbot", `Contract Listner Started for contract ${contractAddress} on chain ${chainId}`)

while(true){
try {
      console.log(`Checking block ${blockNumber}`)
      const getBlock = await web3.eth.getBlock(blockNumber)
      const txs = getBlock.transactions
      // console.log(getBlock)
      async function scanTxs() {
       try {
        if(previousScannedBlockNumber === blockNumber) throw new Error("Already Scanned Txs in this Block, Skipping...")
        console.log(`Scanning Txs in Block ${blockNumber}`)
          for(let i = 0; i < txs.length; i++){
            const tx = await web3.eth.getTransaction(txs[i])
            // console.log(tx)
            if(tx.to === contractAddress){
                const txReceipt = await web3.eth.getTransactionReceipt(txs[i])
                // console.log(tx)
                // console.log(txReceipt)
                console.log(`Transaction ${tx.hash} is sent to contract ${contractAddress}`)
                const hashLink = exploreLink+"/tx/"+tx.hash
                const when = new Date(getBlock.timestamp*1000).toLocaleString(undefined, {timeZone: 'Asia/Kolkata'})
                const txFee = (ethers.utils.formatUnits(txReceipt.gasUsed * (txReceipt.effectiveGasPrice || 0)))+ " " + currency
                console.log("TxValue",tx.value)
                const txValue = (ethers.utils.formatUnits(tx.value))+ " " + currency
                if(txReceipt.status){
                    console.log(`Transaction ${tx.hash} is successful`)
                    sendSlackAlert("successfull-transactions-alert",constructSlackMessage(`Successful Transaction alert`, networkName, chainId, when, getBlock.number, hashLink, null, txValue, txFee))
                }else{
                    console.log(`Transaction ${tx.hash} is failed`)
                    const error = await getRevertReason(rpcUrl, tx.hash)
                    sendSlackAlert("failed-transactions-alert",constructSlackMessage(`Failed Transaction alert`, networkName, chainId, when, getBlock.number, hashLink, error, txValue, txFee))
                }    
            }
          }
          previousScannedBlockNumber = blockNumber
       } catch (error) {
          console.log(error.message)
       }
      }

      scanTxs()
      const currentBlockNumber = await web3.eth.getBlockNumber()
      await pushStringToRedisWithKey(blockNumberRedisKey, blockNumber)
      if(currentBlockNumber > blockNumber) blockNumber++
      else{
          console.log(`No new block found. Waiting for ${waitTime} seconds`)
          await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
      }
} catch (error) {
    console.log(error)
}

}


}

module.exports = {
    runContractListner
}



const constructSlackMessage = (header, networkName, chainId, when, blockNumber, txHash, error, txValue, txFee) => {
    return [
        {
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": header,
            "emoji": true
          }
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": `*Network Name:*\n${networkName}`
            },
            {
              "type": "mrkdwn",
              "text": `*ChainId:*\n${chainId}`
            }
          ]
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": `*When:*\n${when}`
            },
            {
              "type": "mrkdwn",
              "text": `*Block Number:*\n${blockNumber}`
            }
          ]
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": `*Value:*\n${txValue}`
            },
            {
              "type": "mrkdwn",
              "text": `*Tx Fee:*\n${txFee}`
            }
          ]
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": `*Tx Hash:*\n${txHash}`
            },
            {
              "type": "mrkdwn",
              "text": `*Error:*\n${error|| 'None'}`
            }
          ]
        }
      ]
}
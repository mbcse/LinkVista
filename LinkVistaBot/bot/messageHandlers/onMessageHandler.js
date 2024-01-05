const { pay, createLimitOrder, fetchUserSavings, withdrawSavingsWealth } = require('../../blockchainHelpers/linkVista');
const { pushStringToRedisWithKey } = require('../../redis');
const { getUserState, getActions, setActions, setUserInputs, clearAction, getUserInputs, setUserState } = require('../stateHelpers');
const bot = require('../telegramBot');

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', async (msg) => {
    console.log(msg);
    const chatId = msg.chat.id;
    // if(msg.entities && msg.entities?.type === 'bot_command'){
    //   await setUserState(userState, 'STARTED');
    // }
  
    const userState = await getUserState(msg.chat.id)

    if(userState && userState == "COMMAND_ACTION_IN_PROCESS") {
        const action = await getActions(msg.chat.id);
        switch(action.commandInProcess){
            case 'pay': 
                handlePayAction(msg, action)
                break;
            case 'createLimitOrder': 
                handleCreateLimitOrderAction(msg, action)
                break;
            case 'activateSavings':
                handleActivateSavingsAction(msg, action)
                break;
            case 'checkMySavingsWealth':
                handleCheckMySavingsWealthAction(msg, action)
                break;
            case 'withdrawMySavingsWealth':
                handleWithdrawMySavingsWealthAction(msg, action)
                break;
        }

    }else{
        if(!msg?.entities || msg?.entities[0]?.type !== 'bot_command')
        bot.sendMessage(chatId, 'Hi, Welcome To LinkVista, Please choose an operation from menu!\n\n<b>Note: Due to testnet liquidity and other issues! Please Use WETH/ETH and USDC for testing</b>', { parse_mode: 'HTML' });
    }
  
  });


  const handlePayAction = async (msg, action) => {
    switch (action.nextActionRequested) {
        case 'enterTokenToSend' :{
            await setActions(msg.chat.id, 'pay', 'enterTokenToSend', 'enterAmountToSend')
            await setUserInputs(msg.chat.id, 'tokenToSend', msg.text)
            bot.sendMessage(msg.chat.id, 'Enter Amount', { parse_mode: 'HTML' });
            break;
        }
        case 'enterAmountToSend': {
            await setActions(msg.chat.id, 'pay', 'enterAmountToSend', 'enterReceiverAddress')
            await setUserInputs(msg.chat.id, 'amountToSend', msg.text)
            bot.sendMessage(msg.chat.id, 'Enter Receiver Address', { parse_mode: 'HTML' });
            break;
        }
        case 'enterReceiverAddress': {
            await setUserInputs(msg.chat.id, 'receiverAddress', msg.text)
            bot.sendMessage(msg.chat.id, 'Processing Transaction', { parse_mode: 'HTML' });
            //Process Payment

            const inputs = await getUserInputs(msg.chat.id)

            const txResponse = await pay(msg.chat.id, inputs.receiverAddress, inputs.amountToSend, inputs.tokenToSend.split(' ')[1])

            //******* */

            bot.sendMessage(msg.chat.id, JSON.stringify(txResponse), { parse_mode: 'HTML' });
            await clearAction(msg.chat.id);
            break;
        }
    }
  }


const handleCreateLimitOrderAction = async (msg, action) => {
    switch (action.nextActionRequested) {
        case 'enterLimitOrderType' :{
            await setActions(msg.chat.id, 'createLimitOrder', 'enterLimitOrderType', 'enterConvertType')
            await setUserInputs(msg.chat.id, 'limitOrderType', msg.text)

            const opts = {
                reply_to_message_id: msg.message_id,
                reply_markup: JSON.stringify({
                    keyboard: [
                    ['USDC->WETH'],
                    ['WETH->USDC'],
                    ]
                })
            };
            bot.sendMessage(msg.chat.id, 'Select Convert Type', opts);
            break;
        }
        case 'enterConvertType': {
            await setActions(msg.chat.id, 'createLimitOrder', 'enterConvertType', 'enterAmount')
            await setUserInputs(msg.chat.id, 'convertType', msg.text)
            bot.sendMessage(msg.chat.id, 'Enter Amount', { parse_mode: 'HTML' });
            break;
        }
        case 'enterAmount': {
            await setActions(msg.chat.id, 'createLimitOrder', 'enterAmount', 'enterPrice')
            await setUserInputs(msg.chat.id, 'amount', msg.text)
            bot.sendMessage(msg.chat.id, 'Enter Price', { parse_mode: 'HTML' });
            break;
        }
        case 'enterPrice': {
            await setUserInputs(msg.chat.id, 'price', msg.text)
            bot.sendMessage(msg.chat.id, 'Creating Limit Order', { parse_mode: 'HTML' });
            const inputs = await getUserInputs(msg.chat.id)
            // Process Limit Order

            const txResponse = await createLimitOrder(msg.chat.id, inputs.amount, inputs.price, inputs.convertType.split('->')[0], inputs.convertType.split('->')[1], 1891)

            //*********** */
            bot.sendMessage(msg.chat.id, JSON.stringify(txResponse), { parse_mode: 'HTML' });
            await clearAction(msg.chat.id);
            break;
        }
    }
}

const handleActivateSavingsAction = async (msg, action) => {
    switch (action.nextActionRequested) {
        case 'enterSavingsType' :{
            await setActions(msg.chat.id, 'activateSavings', 'enterSavingsType', 'enterLockInPeriod')
            await setUserInputs(msg.chat.id, 'savingsType', msg.text)
            bot.sendMessage(msg.chat.id, 'Enter LockInPeriod in Days', { parse_mode: 'HTML' });
            break;
        }
        case 'enterLockInPeriod': {
            await setUserInputs(msg.chat.id, 'lockInPeriod', msg.text)
            bot.sendMessage(msg.chat.id, 'Processing Savings Activation', { parse_mode: 'HTML' });
            const inputs = await getUserInputs(msg.chat.id)
            // Process TX
            await pushStringToRedisWithKey('savings_'+msg.chat.id, JSON.stringify({savingsType: inputs.savingsType, lockInPeriod: inputs.lockInPeriod}))
            //******* */
            bot.sendMessage(msg.chat.id, `Savings Activated Successfully`, { parse_mode: 'HTML' });
            await clearAction(msg.chat.id);
            break;
        }
    }
}

const handleCheckMySavingsWealthAction = async (msg, action) => {
    // Process TX
    const fetchUserSavingsMessage = await fetchUserSavings(msg.chat.id)
    await clearAction(msg.chat.id);
    bot.sendMessage(msg.chat.id, fetchUserSavingsMessage, { parse_mode: 'HTML' });
}

const handleWithdrawMySavingsWealthAction = async (msg, action) => {

    switch(action.nextActionRequested) {
        case 'enterSavingsType': {
            await setUserInputs(msg.chat.id, 'savingsType', msg.text)
            await setActions(msg.chat.id, 'withdrawMySavingsWealth', 'enterSavingsType', 'enterSavingsId')
            bot.sendMessage(msg.chat.id, 'Enter Savings Id', { parse_mode: 'HTML' });
            break;
        }case 'enterSavingsId': {
                 await setUserInputs(msg.chat.id, 'savingsId', msg.text)
                // Process TX
                const withdrawMessage = await withdrawSavingsWealth(msg.chat.id, msg.text)
                await clearAction(msg.chat.id);
                bot.sendMessage(msg.chat.id, withdrawMessage, { parse_mode: 'HTML' });
        }
    
    }


}
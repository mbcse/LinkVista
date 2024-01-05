const { getAccount, getAccountBalance } = require('../../blockchainHelpers/accountHelpers');
const { delKey } = require('../../redis');
const { setActions } = require('../stateHelpers');
const bot = require('../telegramBot');

bot.onText(/\/start/, async (msg, match) => {
    const chatId = msg.chat.id;
    bot.sendMessage(msg.chat.id, `Hi ${msg.chat.first_name} Welcome to LightLink Blockchain LinkVista Telegram Bot\nYou can start by creating an account by using Create Account Option in Menu and depositing funds on LightLink Test Network.\n\nYou can do following things with LinkVista Bot:-
1. Pay Someone\n2.Create Limit Orders\n3.Activate Savings\n4.Withdraw Savings\n\n<b>Note: Due to testnet liquidity and other issues! Please Use WETH/ETH for testing</b>`, { parse_mode: 'HTML' });
});

bot.onText(/\/createaccount/, async (msg, match) => {
    const chatId = msg.chat.id;
    const account = await getAccount(msg.chat.id)
    bot.sendMessage(msg.chat.id, `Your Account is Create Successfully \nPrivateKey : <b>${account.privateKey}</b> \nAccount Address: <b>${account.address}</b>`, { parse_mode: 'HTML' });
});
  
bot.onText(/\/getaccount/, async (msg, match) => {
    const chatId = msg.chat.id;
    const account = await getAccount(msg.chat.id)
    bot.sendMessage(msg.chat.id, `Your Account Details \nPrivateKey : <b>${account.privateKey}</b> \nAccount Address: <b>${account.address}</b>`, { parse_mode: 'HTML' });
});
  
bot.onText(/\/getbalance/, async (msg, match) => {

    const chatId = msg.chat.id;

    const account = await getAccount(msg.chat.id)
    const accountBalance = await getAccountBalance(msg.chat.id)
    let resmsg = 'Your Account Balances \n'
    Object.keys(accountBalance).forEach((key) => {
        resmsg = resmsg + `${key} : ${accountBalance[key]} \n`
    })
    bot.sendMessage(msg.chat.id, resmsg, { parse_mode: 'HTML' });
});
  
  
bot.onText(/\/pay/, async (msg, match) => {

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    await setActions(chatId, 'pay', 'start', 'enterTokenToSend')
    // send back the matched "whatever" to the chat
    const opts = {
    reply_to_message_id: msg.message_id,
    reply_markup: JSON.stringify({
        keyboard: [
        ['Send ETH'],
        ['Send USDC'],
        ]
    })
    };
    bot.sendMessage(msg.chat.id, 'Please Select One Option', opts);
});

bot.onText(/\/createlimitorder/, async(msg, match) => {
    const chatId = msg.chat.id;

    await setActions(chatId, 'createLimitOrder', 'start', 'enterLimitOrderType')

    // send back the matched "whatever" to the chat
    const opts = {
    reply_to_message_id: msg.message_id,
    reply_markup: JSON.stringify({
        keyboard: [
        ['Same Chain Limit Order'],
        ['Cross Chain Limit Order'],
        ]
    })
    };
    bot.sendMessage(msg.chat.id, 'Please Select One Option', opts);
});
  
bot.onText(/\/activatesavings/, async (msg, match) => {
    const chatId = msg.chat.id;

    await setActions(chatId, 'activateSavings', 'start', 'enterSavingsType')

    const opts = {
    reply_to_message_id: msg.message_id,
    reply_markup: JSON.stringify({
        keyboard: [
        ['Round Off Savings'],
        ['Threshold Savings(Sweep In)']
        ]
    })
    };
    bot.sendMessage(msg.chat.id, 'Please Select One Option', opts);
});  
  
bot.onText(/\/stopsavings/, async (msg, match) => {
    const chatId = msg.chat.id;
    await delKey('savings_'+msg.chat.id)
    bot.sendMessage(msg.chat.id, 'Savings Deactivated!');
});  
  
bot.onText(/\/checkmysavingswealth/, async (msg, match) => {
    const chatId = msg.chat.id;
    await setActions(chatId, 'checkMySavingsWealth', 'start', 'enterSavingsType')
    const opts = {
        reply_to_message_id: msg.message_id,
        reply_markup: JSON.stringify({
            keyboard: [
            ['Round Off Savings'],
            ['Threshold Savings(Sweep In)']
            ]
        })
        };
        bot.sendMessage(msg.chat.id, 'Please Select One Option', opts);
});  
  
bot.onText(/\/withdrawmysavingswealth/, async (msg, match) => {
    const chatId = msg.chat.id;
    await setActions(chatId, 'withdrawMySavingsWealth', 'start', 'enterSavingsType')
    const opts = {
        reply_to_message_id: msg.message_id,
        reply_markup: JSON.stringify({
            keyboard: [
            ['Round Off Savings'],
            ['Threshold Savings(Sweep In)']
            ]
        })
        };
    bot.sendMessage(msg.chat.id, 'Please Select One Option', opts);
});  
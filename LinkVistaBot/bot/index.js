const bot = require('./telegramBot')
const { setUserState, getUserState, setUserInputs, getUserInputs } = require('./stateHelpers')
const { contractListner } = require('../blockchainHelpers/linkVista.js')
const config = require('./config.js')

require('./messageHandlers/commandsHandler')
require('./messageHandlers/onMessageHandler')
require('../blockchainHelpers/limitOrderProcessor.js')
contractListner(config.TELEGRAM_BOT_API)
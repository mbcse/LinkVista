require("dotenv").config();

module.exports = {
    STATE_EXPIRY: 30, //30 seconds,
    INPUTS_EXPIRY: 30, //30 seconds
    TELEGRAM_BOT_API: process.env.TELEGRAM_BOT_API,
    ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY,
    NATIVE_ADDRESS: "0x0000000000000000000000000000000000000000"
}
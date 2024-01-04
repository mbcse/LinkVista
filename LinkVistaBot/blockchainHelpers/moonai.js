const { MoonSDK, Storage, AUTH } = require('@moonup/moon-sdk');
const { Transaction } = require('@moonup/moon-api');

const MOON_SESSION_KEY = process.env.MOON_SESSION_KEY; // Replace with your actual session key

const moonSDKInstance = new MoonSDK({
  Storage: {
    key: MOON_SESSION_KEY,
    type: Storage.SESSION,
  },
  Auth: {
    AuthType: AUTH.JWT,
  },
});

async function initialize() {
  await moonSDKInstance.login();
}

async function disconnect() {
  await moonSDKInstance.disconnect();
}

async function listAccounts() {
  return moonSDKInstance.listAccounts();
}

async function updateToken(token) {
  await moonSDKInstance.updateToken(token);
}

async function signTransaction(address, txData) {
  if (!moonSDKInstance) {
    throw new Error('Moon SDK is not initialized');
  }

  const raw_tx = await moonSDKInstance
    .getAccountsSDK()
    .signTransaction(address, txData);

  const kek = (raw_tx.data.data instanceof Transaction)
    ? raw_tx.data.data.transactions.at(0).raw_transaction
    : '';

  console.log(kek);

  const tx = await moonSDKInstance
    .getAccountsSDK()
    .broadcastTx(address, {
      chainId: '1891',
      rawTransaction: '',
    });

  console.log(tx);

  return '';
}

// Initialize SDK
initialize();

// Example of using the functions
(async () => {
  try {
    await initialize();
    await listAccounts();
    await signTransaction();
    // Add other function calls as needed
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await disconnect();
  }
})();


//0xAa81f641d4b3546F05260F49DEc69Eb0314c47De
const { pushStringToRedisWithKey, getStringKey, delKey } = require('../redis');

const setUserState = async(userId, state) =>{
    await pushStringToRedisWithKey(userId+"_state", state, 30)
}

const getUserState = async(userId) =>{
    return await getStringKey(userId+"_state")
}

const clearState = async(userId) => {
    await delKey(userId+'_state')
}




const setUserInputs = async(userId, inputKey, inputValue) =>{
    const inputs = await getUserInputs(userId)
    inputs[inputKey] = inputValue
    await pushStringToRedisWithKey(userId+"_inputs", JSON.stringify(inputs), 30)
}

const getUserInputs = async(userId) =>{
    return JSON.parse(await getStringKey(userId+"_inputs")) || {}
}

const clearUserInputs = async(userId) =>{
    await delKey(userId+'_inputs')
}

const setActions = async(userId, commandInProcess, lastActionCompleted, nextActionRequested) =>  {
    await pushStringToRedisWithKey(userId+"_actions", JSON.stringify({commandInProcess, lastActionCompleted, nextActionRequested}), 30)
    await setUserState(userId, "COMMAND_ACTION_IN_PROCESS")
}

const clearAction = async function(userId){
    await delKey(userId+'_actions')
    await clearState(userId)
    await clearUserInputs(userId)
}

const getActions = async(userId) =>{
    return JSON.parse(await getStringKey(userId+"_actions"))
}

module.exports = {
    setUserState,
    getUserState,
    setUserInputs,
    getUserInputs,
    setActions,
    getActions,
    clearAction,
    clearState,
    clearUserInputs
}
const axios = require('axios')

const slackToken = ''
let lastMessage = ''

async function sendSlackAlert (channel, message) {
  try {
    console.log(lastMessage == JSON.stringify(message) ? "Same as Last Message Sent, Skipping Sending Slack Alert" : "Sending Slack Alert")
    if (lastMessage != JSON.stringify(message)) {
      lastMessage = JSON.stringify(message)
      const url = 'https://slack.com/api/chat.postMessage'
      const res = await axios.post(url, {
        channel: channel,
        blocks:  message
        }, { headers: { authorization: `Bearer ${slackToken}` } })
      console.log('Slack Alert Sent', res.data)
    }
  } catch (error) {
    console.log('Slack Alert Failed', error)
  }
}


async function sendSlackMessage (channel, message) {
  try {
    console.log(lastMessage == JSON.stringify(message) ? "Same as Last Message Sent, Skipping Sending Slack Alert" : "Sending Slack Alert")
    if (lastMessage != JSON.stringify(message)) {
      lastMessage = JSON.stringify(message)
      const url = 'https://slack.com/api/chat.postMessage'
      const res = await axios.post(url, {
        channel: channel,
        text:  message
        }, { headers: { authorization: `Bearer ${slackToken}` } })
      console.log('Slack Alert Sent', res.data)
    }
  } catch (error) {
    console.log('Slack Alert Failed', error)
  }
}

module.exports = { sendSlackAlert, sendSlackMessage }

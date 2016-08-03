import login from 'facebook-chat-api'
import fetch from 'isomorphic-fetch'
import { prop } from 'ramda'
import http from 'http'

const { EMAIL, PASSWORD, APP_NAME = 'pickonebot' } = process.env
if (!EMAIL || !PASSWORD) throw Error('Missing email or password')
if (!APP_NAME) throw Error('Missing app name')

const parseToString =
  jsonObject => ((jsonObject instanceof Object)
    ? JSON.stringify(jsonObject)
    : new Error('JSON cannot be parsed'))

const handlePrintConsole =
  (err, chunk) => console.log(parseToString(chunk))

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('')
}).listen(process.env.PORT || 5000)

setInterval(() => {
  http.get(`http://${APP_NAME}.herokuapp.com/`, () => {})
}, (600000 * Math.random()) + 600000) // between 20 and 50 min prevent from hault

// const whiteList = ['619160284'] // Lulala Chen
// const threadIdWhiteList = ['535544279949045', '1245194108'] // LeetCode, hau

login({
  email: EMAIL,
  password: PASSWORD,
}, (err, api) => {
  if (err) return console.error(err)
  api.listen(handlePrintConsole)
  api.setOptions({ selfListen: true, forceLogin: true })
  api.listen((error, { type, senderID, body = '', threadID, attachments = [] }) => {
    const { stickerID = 'No sticker' } = attachments[0]
    console.log(type, senderID, body, threadID, stickerID)
    if (
      type === 'message'
      // && (
      //   senderID === currentUserId
      //     || contains(senderID, whiteList)
      //     || contains(threadID, threadIdWhiteList)
      // )
      && body.startsWith('/leetcode')
    ) {
      // const [command, ...argvs] = drop(1, body.split(' '))
      const endTyping = api.sendTypingIndicator(threadID, console.log)
      fetch('https://leetcode.com/problems/random-one-question/algorithms')
        .then(prop('url'))
        .then(url => {
          endTyping()
          api.sendMessage({
            body: '頑張った！',
            sticker: '1398251827059667',
          }, threadID)
          api.sendMessage({ url }, threadID)
        })
        .catch(errMsg => {
          endTyping()
          api.sendMessage({ body: `Error: ${errMsg}` }, threadID)
        })
    }
  })
})

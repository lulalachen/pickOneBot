import login from 'facebook-chat-api'
import { pathOr, drop, pipe, filter, propEq, pluck, length, contains } from 'ramda'
import cheerio from 'cheerio'
import fetch from 'isomorphic-fetch'
import convertTableToJson from './convertTableToJson'
import dotenv from 'dotenv'
import http from 'http'

dotenv.load()

const { EMAIL, PASSWORD, APP_NAME = 'pickonebot' } = process.env
if (!EMAIL || !PASSWORD) throw Error('Missing email or password')
if (!APP_NAME) throw Error('Missing app name')

let leetcodeTable = {}

const getLeetcodeList = () => new Promise(resolve =>
  fetch('https://leetcode.com/problemset/algorithms/')
    .then(response => response.text())
    .then(html => {
      const $ = cheerio.load(html)
      const htmlForTable = $('table#problemList').html()
      const jsonTable = convertTableToJson(htmlForTable)
      resolve(jsonTable)
    })
  )

const updateLeetcodeTable = () => {
  getLeetcodeList()
  .then(json => {
    leetcodeTable = drop(1, json)
    console.log(`Leetcode table constructed: number of problems is ${length(leetcodeTable)}`)
  })
}
updateLeetcodeTable()

const pickOne = (level = 'Easy') => {
  if (!contains(level, ['Easy', 'Medium', 'Hard'])) {
    /* eslint-disable no-param-reassign */
    level = 'Easy'
    /* eslint-enable no-param-reassign */
  }
  const linkList = pipe(
    filter(propEq('Difficulty', level)),
    pluck('link')
  )(leetcodeTable)
  const problem = Math.floor((Math.random() * 1000) % length(linkList))
  console.log(linkList[problem])
  return linkList[problem]
}


http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('')
}).listen(process.env.PORT || 5000)

setInterval(() => {
  http.get(`http://${APP_NAME}.herokuapp.com/`, () => {})
  updateLeetcodeTable()
}, (600000 * Math.random()) + 600000) // between 20 and 50 min prevent from hault

// const whiteList = ['619160284'] // Lulala Chen
// const threadIdWhiteList = ['535544279949045', '1245194108'] // LeetCode, hau
// const myself = '100000631826547'

login({
  email: EMAIL,
  password: PASSWORD,
}, {
  forceLogin: true,
}, (err, api) => {
  const currentUserId = api.getCurrentUserID()
  if (err) return console.error(err)
  api.setOptions({ selfListen: true })
  api.listen((error, event = {}) => {
    const { type, senderID, body = '', threadID, attachments = [{}] } = event
    const { stickerID = 'No sticker' } = pathOr({}, [0])(attachments)
    console.log(type, senderID, body, threadID, stickerID)
    if (stickerID !== 'No sticker' && senderID !== currentUserId) {
      api.sendMessage({ sticker: stickerID }, threadID)
    }
    const [command, ...argvs] = body.split(' ')
    switch (command) {
      case '/leetcode': {
        const endTyping = api.sendTypingIndicator(threadID, console.log)
        const difficulty = pathOr('Easy', [0], argvs)
        const problem = pickOne(difficulty)
        endTyping()
        api.sendMessage({
          body: `It\'s ${difficulty}! \n頑張った！`,
          sticker: '1398251827059667',
        }, threadID)
        api.sendMessage({ url: problem }, threadID)
        break
      }
      default:
        return
    }
  })
})

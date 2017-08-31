import login from 'facebook-chat-api'
import fs from 'fs'
import R from 'ramda'
import D from 'date-fp'
import chalk from 'chalk'
import fetch from 'isomorphic-fetch'

import dotenv from 'dotenv'

dotenv.load()

const logger = (...textArgs) => {
  const date = D.format('YYYY-MM-DD hh:mm:ss', new Date())
  console.log(`${chalk.gray(`[${date}]`)} - ${textArgs.join(' ')}`)
}
logger('gg', 'wefw', 'wefwe')
const { EMAIL, PASSWORD, APP_NAME = 'pickonebot' } = process.env
if (!EMAIL || !PASSWORD) throw Error('Missing email or password')
if (!APP_NAME) throw Error('Missing app name')

let leetcodeTable = []

const updateLeetcodeTable = () => {
  logger('Start updating')
  return fetch('https://leetcode.com/api/problems/algorithms/')
  .then(response => response.json())
  .then(jsonData => {
    leetcodeTable = jsonData.stat_status_pairs
    logger(`Leetcode table constructed: number of problems is ${R.length(leetcodeTable)}`)
  })
  .catch(e => logger(e))
}

const getDifficulty = (levelText) => ({
  easy: 1,
  medium: 2,
  hard: 3,
})[levelText]

const pickOne = (levelText = 'easy') => {
  const level = R.ifElse(
    R.flip(R.contains)(['easy', 'medium', 'hard']),
    getDifficulty,
    R.always('easy')
  )(levelText)

  const availableQuestions = R.filter(
    R.and(
      R.propEq('paid_only', false),
      R.pathEq(['difficulty', 'level'], level)
    ))(leetcodeTable)
  const length = R.length(availableQuestions)
  const randomIndex = Math.floor(Math.random() * (length - 1))
  logger(availableQuestions[randomIndex])
  return availableQuestions[randomIndex]
}

const parseQuestion = (question) => {
  const baseUrl = 'https://leetcode.com/problems/'
  const url = `${baseUrl}${R.path(['stat', 'question__title_slug'], question)}`
  const questionTitle = R.path(['stat', 'question__title'], question)
  const accept = R.path(['stat', 'total_acs'], question)
  const submit = R.path(['stat', 'total_submitted'], question)
  const acceptRate = `${Math.round((accept / submit) * 10000) / 100}% (${accept}/${submit})`
  return {
    url,
    questionTitle,
    acceptRate,
  }
}

updateLeetcodeTable()
//
// http.createServer((req, res) => {
//   res.writeHead(200, { 'Content-Type': 'text/plain' })
//   res.end('')
// }).listen(process.env.PORT || 5000)
//
// setInterval(() => {
//   http.get(`http://${APP_NAME}.herokuapp.com/`, () => {})
//   updateLeetcodeTable()
// }, (600000 * Math.random()) + 600000) // between 20 and 50 min prevent from hault

// const whiteList = ['619160284'] // Lulala Chen
// const threadIdWhiteList = ['535544279949045', '1245194108'] // LeetCode, hau
// const myself = '100000631826547'
let appState
try {
  appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'))
} catch (e) {
  appState = {}
  fs.appendFileSync('appstate.json', '{}')
}

const credentials = R.ifElse(
  R.equals({}),
  R.always({
    email: EMAIL,
    password: PASSWORD,
  }),
  R.objOf('appState')
)(appState)
logger('Login with: ')
logger(appState === {} ? 'email/password' : 'credentials')

login(credentials, {
  forceLogin: true,
}, (err, api) => {
  fs.writeFileSync('appstate.json', JSON.stringify(api.getAppState()))

  if (err) return console.error(err)
  api.setOptions({ selfListen: true, logLevel: 'silent' })
  api.listen((error, event = {}) => {
    const currentUserId = api.getCurrentUserID()
    const { type, senderID, body = '', threadID, attachments = [{}] } = event
    const { stickerID = 'No sticker' } = R.pathOr({}, [0])(attachments)
    logger(type, senderID, body, threadID, stickerID)
    if (stickerID !== 'No sticker' && senderID !== currentUserId) {
      api.sendMessage({ sticker: stickerID }, threadID)
    }
    const [command, ...argvs] = body.split(' ')
    switch (command.toLowerCase()) {
      case 'pickone':
      case '/leetcode': {
        const endTyping = api.sendTypingIndicator(threadID, logger)
        const difficulty = (R.pathOr('Easy', [0], argvs)).toLowerCase()
        const {
          url,
          questionTitle,
          acceptRate,
        } = parseQuestion(pickOne(difficulty))
        endTyping()
        api.sendMessage({
          url,
          body: `It's ${difficulty}! \n題目：${questionTitle} \n通過率：${acceptRate} \n大家加油！`,
        }, threadID)
        api.sendMessage({ sticker: '1398251827059667' }, threadID)
        break
      }
      default:
        return
    }
  })
})

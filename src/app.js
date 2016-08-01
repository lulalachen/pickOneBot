import login from 'facebook-chat-api'
import fetch from 'isomorphic-fetch'
import cheerio from 'cheerio'
// import { cond, when, otherwise } from 'functional-switch'
import { drop, contains, prop } from 'ramda'
// import { pick, map, filter, pipe, isEmpty, identity, pathOr, length, propEq, __ } from 'ramda'

const { EMAIL, PASSWORD } = process.env
if (!EMAIL || !PASSWORD) throw Error('Missing email or password')

const parseToString =
  jsonObject => ((jsonObject instanceof Object)
    ? JSON.stringify(jsonObject)
    : new Error('JSON cannot be parsed'))

const handlePrintConsole =
  (err, chunk) => console.log(parseToString(chunk))

const leetCodeRootUrl = 'https://leetcode.com'

const pickOne = () =>
  new Promise((resolve, reject) =>
    fetch(`${leetCodeRootUrl}/problemset/algorithms/`)
      .then(response => {
        if (response.status > 400) reject('Server error')
        return response.text()
      })
      .then(html => {
        const $ = cheerio.load(html)
        const href = $('#pick-btn').prop('href')
        resolve(leetCodeRootUrl + href)
      })
      .catch(err => reject(err))
    )


// const getOperationByCommand = cond(
//   when('add', add),
//   when('subtract', subtract),
//   when('pickOne', pickOne),
//   otherwise(() => 'Do nothing')
// )

const whiteList = ['619160284']

login({
  email: EMAIL,
  password: PASSWORD,
}, (err, api) => {
  if (err) return console.error(err)
  api.listen(handlePrintConsole)
  api.setOptions({ selfListen: true })
  const currentUserId = api.getCurrentUserID()
  api.listen((error, { type, senderID, body = '', threadID }) => {
    console.log(type, senderID, body, threadID)
    if (
      type === 'message' &&
      (senderID === currentUserId || contains(senderID, whiteList)) &&
      body.startsWith('/leetcode')
    ) {
      const [command, ...argvs] = drop(1, body.split(' '))
      const endTyping = api.sendTypingIndicator(threadID, console.log)
      pickOne(argvs[0])
        .then(fetch)
        .then(prop('url'))
        .then(url => {
          endTyping()
          api.sendMessage({
            body: `Answer of ${command} ${(argvs).join(' ')} is ${url}`,
            url,
          }, threadID)
        })
        .catch(errMsg => {
          endTyping()
          api.sendMessage({ body: `Error: ${errMsg}` }, threadID)
        })
      // const answer = apply(operationFunction, processedArgvs)
      // answer.then(console.log)
    }
  })
})

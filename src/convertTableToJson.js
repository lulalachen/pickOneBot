import cheerio from 'cheerio'

const LEETCODE_ROOT = 'https://leetcode.com'

const convertTableToJson = (html) => {
  const $ = cheerio.load(html)

  const tableAsJson = []

  const columnHeadings = []
  $(html).find('tr').each((i, row) => {
    $(row).find('th').each((j, cell) => {
      columnHeadings[j] = $(cell).text().trim()
    })
  })

  $(html).find('tr').each((i, row) => {
    const rowAsJson = {}
    $(row).find('td').each((j, cell) => {
      const columnHeader = columnHeadings[j]
      if (columnHeader === 'Title') {
        rowAsJson[columnHeader] = $(cell).text().trim()
        const link = $(cell).children('a').attr('href')
        rowAsJson.link = `${LEETCODE_ROOT}${link}`
      } else if (columnHeader) {
        rowAsJson[columnHeader] = $(cell).text().trim()
      } else {
        rowAsJson[j] = $(cell).text().trim()
      }
    })

    if (rowAsJson !== {}) {
      tableAsJson.push(rowAsJson)
    }
  })

  return tableAsJson
}

export default convertTableToJson

const request = require('request')
const {GoogleSpreadsheet} = require('google-spreadsheet');
const sheet = new GoogleSpreadsheet('1ADIJvAkL0XHGBDhO7PP9aQOuK3mPIKB2cVPbshuBBHc'); // accurate leaderboard spreadsheet

let lastIndex = {"stars": 0, "coins": 0, "demons": 0}
let caches = [{"stars": null, "coins": null, "demons": null}, {"stars": null, "coins": null, "demons": null}] // 0 for JSON, 1 for GD

module.exports = async (app, req, res) => {

      if (app.offline || !app.sheetsKey || app.endpoint != "http://boomlings.com/database/") return res.send([])
      let gdMode = req.query.hasOwnProperty("gd")
      let cache = caches[gdMode ? 1 : 0]

      let type = req.query.type ? req.query.type.toLowerCase() : 'stars'
      if (type == "usercoins") type = "coins"
      if (!["stars", "coins", "demons"].includes(type)) type = "stars"
      if (lastIndex[type] + 600000 > Date.now() && cache[type]) return res.send(gdMode ? cache[type] : JSON.parse(cache[type]))   // 10 min cache

      sheet.useApiKey(app.sheetsKey)
      sheet.loadInfo().then(async () => {
      let tab = sheet.sheetsById[1555821000]
      await tab.loadCells('A2:C2')
      let topPlayers = tab.getCell(1, type == "demons" ? 2 : type == "coins" ? 1 : 0).value
      
      let idArray = topPlayers.split(",")

      let leaderboard = []
      let total = idArray.length

      idArray.forEach((x, y) => {
        
        request.post(app.endpoint + 'getGJUserInfo20.php', {
          form: {targetAccountID: x, secret: app.secret}
        }, function (err, resp, body) {
          if (err || !body || body == '-1') return res.send([])

          let account = app.parseResponse(body)
          let accObj = {
            rank: "0",
            username: account[1],
            playerID: account[2],
            accountID: account[16],
            stars: account[3],
            demons: account[4],
            cp: account[8],
            coins: account[13],
            usercoins: account[17],
            diamonds: account[46],
            icon: [account[21], account[10], account[11], account[28] == "1" ? "2" : "0"]
          }

          leaderboard.push(accObj)
          if (leaderboard.length == total) {
            let sortBy = type == "coins" ? "usercoins" : type
            leaderboard = leaderboard.filter(x => x.stars).sort(function (a, b) {return parseInt(b[sortBy]) - parseInt(a[sortBy])})
            leaderboard.forEach((a, b) => a.rank = b + 1)

            let gdFormatting = ""
            leaderboard.forEach(x => { gdFormatting += `1:${x.username}:2:${x.playerID}:13:${x.coins}:17:${x.usercoins}:6:${x.rank}:9:${x.icon[0]}:10:${x.icon[1]}:11:${x.icon[2]}:14:0:15:${x.icon[3]}:16:${x.accountID}:3:${x.stars}:8:${x.cp}:46:${x.diamonds}:4:${x.demons}|`; delete x.icon})
            caches[0][type] = JSON.stringify(leaderboard)
            caches[1][type] = gdFormatting
            lastIndex[type] = Date.now()
            return res.send(gdMode ? gdFormatting : leaderboard)

          } 

      })
    })
  })
}
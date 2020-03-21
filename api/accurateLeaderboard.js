const request = require('request')

module.exports = async (app, req, res) => {

      if (app.endpoint != "http://boomlings.com/database/") return res.send([])

      let type = req.query.type ? req.query.type.toLowerCase() : ''
      if (type == "usercoins") type = "coins"
      if (type == "demons" || type == "coins") type = `?${type}=1`
      else type = ''
      
      request.get(`https://gdleaderboards.com/incl/lbxml.php${type}`, function (err, resp, topPlayers) {
      if (err || !topPlayers) topPlayers = ""
      let idArray = topPlayers.split(",")

      let leaderboard = []
      let total = idArray.length

      if (!type.length) type = "stars"
      if (type == "coins") type = "usercoins"

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
            diamonds: account[46] == '65535' ? '65535+' : account[46],
          }

          leaderboard.push(accObj)
          if (leaderboard.length == total) {
            leaderboard = leaderboard.filter(x => x.stars).sort(function (a, b) {return parseInt(b[type]) - parseInt(a[type])})
            leaderboard.forEach((a, b) => a.rank = b + 1)
            return res.send(leaderboard)
          } 

      })
    })
  })
}
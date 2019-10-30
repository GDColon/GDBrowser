const request = require('request')

module.exports = async (app, req, res) => {

      request.get(`https://gdleaderboards.com/incl/lbxml.php`, function (err, resp, topPlayers) {
      let idArray = topPlayers.split(",")
      let leaderboard = []
      let total = idArray.length

      idArray.forEach((x, y) => {
        
        request.post('http://boomlings.com/database/getGJUserInfo20.php', {
          form: {targetAccountID: x, secret: app.secret}
        }, function (err, resp, body) {

          let account = app.parseResponse(body)
          let accObj = {
            rank: "0",
            username: app.clean(account[1]),
            playerID: account[2],
            accountID: account[16],
            stars: account[3],
            demons: account[4],
            cp: account[8],
            coins: account[13],
            usercoins: account[17],
            diamonds: account[46],
          }

          leaderboard.push(accObj)
          if (leaderboard.length == total) {
            leaderboard = leaderboard.filter(x => x.stars).sort(function (a, b) {return parseInt(b.stars) - parseInt(a.stars)})
            leaderboard.forEach((a, b) => a.rank = b + 1)
            return res.send(leaderboard)
          } 

      })
    })
  })
}
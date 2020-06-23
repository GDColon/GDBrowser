const request = require('request')
const fs = require('fs')

module.exports = async (app, req, res, api, getLevels) => {

  request.post(app.endpoint + 'getGJUsers20.php', {
    form: {
      str: getLevels || req.params.id,
      secret: app.secret
    }
  }, function (err1, res1, b1) {
    
    let searchResult = (err1 || b1 == '-1' || !b1) ? req.params.id : app.parseResponse(b1)[16]

    request.post(app.endpoint + 'getGJUserInfo20.php', {
      form: {
        targetAccountID: searchResult,
        secret: app.secret
      }
    }, function (err2, res2, body) {

      if (err2 || body == '-1' || !body) {
        if (!api) return res.redirect('/search/' + req.params.id)
        else return res.send("-1")
      }

      let account = app.parseResponse(body)

          let userData = {
              username: account[1],
              playerID: account[2],
              accountID: account[16],
              rank: account[30],
              stars: account[3],
              diamonds: account[46],
              coins: account[13],
              userCoins: account[17],
              demons: account[4],
              cp: account[8],
              friendRequests: account[19] == "0",
              messages: account[18] == "0" ? "all" : account[18] == "1" ? "friends" : "off",
              commentHistory: account[50] == "0" ? "all" : account[50] == "1" ? "friends" : "off",
              moderator: account[49],
              youtube: account[20] || null,
              twitter: account[44] || null,
              twitch: account[45] || null,
              icon: account[21],
              ship: account[22],
              ball: account[23],
              ufo: account[24],
              wave: account[25],
              robot: account[26],
              spider: account[43],
              col1: account[10],
              col2: account[11],
              deathEffect: account[48],
              glow: account[28] == "1",
          }
   
      if (getLevels) {
          req.params.text = account[2]
          return app.run.search(app, req, res)
      }

      else if (api) return res.send(userData)

      else return fs.readFile('./html/profile.html', 'utf8', function(err, data) {
        let html = data;
        let variables = Object.keys(userData)
        variables.forEach(x => {
          let regex = new RegExp(`\\[\\[${x.toUpperCase()}\\]\\]`, "g")
          html = html.replace(regex, app.clean(userData[x]))
        })
        return res.send(html)
      })
  
      })
    })
  }
module.exports = async (app, req, res) => {

   if (req.offline) return res.send("-1")

    let amount = 100;
    let count = req.query.count ? parseInt(req.query.count) : null
    if (count && count > 0) {
      if (count > 10000) amount = 10000
      else amount = count;
    }

    let params = {count: amount, type: "top"}

    if (["creators", "creator", "cp"].some(x => req.query.hasOwnProperty(x) || req.query.type == x)) params.type = "creators"
    else if (["week", "weekly"].some(x => req.query.hasOwnProperty(x) || req.query.type == x)) params.type = "week"

    req.gdRequest('getGJScores20', params, function(err, resp, body) { 

      if (err) return res.send("-1")
      scores = body.split('|').map(x => app.parseResponse(x)).filter(x => x[1])
      if (!scores.length) return res.send("-1")

      scores.forEach(x => {
        let keys = Object.keys(x)
        x.rank = +x[6]
        x.username = x[1]
        x.playerID = x[2]
        x.accountID = x[16]
        x.stars = +x[3]
        x.demons = +x[4]
        x.cp = +x[8]
        x.coins = +x[13]
        x.usercoins = +x[17]
        x.diamonds = +x[46]
        x.icon = {
          form: ['icon', 'ship', 'ball', 'ufo', 'wave', 'robot', 'spider'][+x[14]],
          icon: +x[9] || 1,
          col1: +x[10],
          col2: +x[11],
          glow: +x[15] > 1
        }
        keys.forEach(k => delete x[k])
        app.userCache(req.id, x.accountID, x.playerID, x.username)
      }) 
      return res.send(scores)
      })
}
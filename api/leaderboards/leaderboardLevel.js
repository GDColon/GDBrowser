const colors = require('../../iconkit/sacredtexts/colors.json');

module.exports = async (app, req, res) => {

  if (req.offline) return res.sendError()

    let amount = 100;
    let count = req.query.count ? parseInt(req.query.count) : null
    if (count && count > 0) {
      if (count > 200) amount = 200
      else amount = count;
    }

    let params = {
      levelID: req.params.id,
      accountID: app.id,
      gjp: app.gjp, 
      type: req.query.hasOwnProperty("week") ? "2" : "1",
    }

    req.gdRequest('getGJLevelScores211', params, function(err, resp, body) { 

      if (err) return res.status(500).send({error: true, lastWorked: app.timeSince(req.id)})
      scores = body.split('|').map(x => app.parseResponse(x)).filter(x => x[1])
      if (!scores.length) return res.status(500).send([])
      else app.trackSuccess(req.id)

      scores.forEach(x => {
        let keys = Object.keys(x)
        x.rank = x[6]
        x.username = x[1]
        x.percent = +x[3]
        x.coins = +x[13]
        x.playerID = x[2]
        x.accountID = x[16]
        x.date = x[42] + req.timestampSuffix
        x.icon = {
          form: ['icon', 'ship', 'ball', 'ufo', 'wave', 'robot', 'spider'][+x[14]],
          icon: +x[9],
          col1: +x[10],
          col2: +x[11],
          glow: +x[15] > 1,
          col1RGB: colors[x[10]] || colors["0"],
          col2RGB: colors[x[11]] || colors["3"]
        }
        keys.forEach(k => delete x[k])
        app.userCache(req.id, x.accountID, x.playerID, x.username)
      }) 

      return res.send(scores.slice(0, amount))
      
      })
}
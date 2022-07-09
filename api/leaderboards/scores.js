const Player = require('../../classes/Player.js')

module.exports = async (app, req, res) => {

   if (req.offline) return res.sendError()

    let amount = 100;
    let count = req.query.count ? parseInt(req.query.count) : null
    if (count && count > 0) {
      if (count > 10000) amount = 10000
      else amount = count;
    }

    let params = {count: amount, type: "top"}

    if (["creators", "creator", "cp"].some(x => req.query.hasOwnProperty(x) || req.query.type == x)) params.type = "creators"
    else if (["week", "weekly"].some(x => req.query.hasOwnProperty(x) || req.query.type == x)) params.type = "week"
    else if (["global", "relative"].some(x => req.query.hasOwnProperty(x) || req.query.type == x)) {
      params.type = "relative"
      params.accountID = req.query.accountID
    }

    req.gdRequest('getGJScores20', params, function(err, resp, body) { 

      if (err) return res.sendError()
      scores = body.split('|').map(x => app.parseResponse(x)).filter(x => x[1])
      if (!scores.length) return res.sendError()

      scores = scores.map(x => new Player(x))
      scores.forEach(x => app.userCache(req.id, x.accountID, x.playerID, x.username)) 
      return res.send(scores.slice(0, amount))
    })
}
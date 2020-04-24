const request = require('request')

module.exports = async (app, req, res) => {

    let amount = 100;
    let count = req.query.count ? parseInt(req.query.count) : null
    if (count && count > 0) {
      if (count > 200) amount = 200
      else amount = count;
    }

    let params = {
      levelID: req.params.id,
      secret: app.secret,
      accountID: app.id,
      gjp: app.gjp, 
      type: req.query.hasOwnProperty("week") ? "2" : "1",
    }  

    request.post(app.endpoint + 'getGJLevelScores211.php', {
    form : params, headers: {'x-forwarded-for': req.headers['x-real-ip']}}, async function(err, resp, body) { 

      if (err || body == '-1' || !body) return res.send("-1")
      scores = body.split('|').map(x => app.parseResponse(x))
      if (!(scores.filter(x => x[1]).length)) return res.send("-1")

      scores.forEach(x => {
        let keys = Object.keys(x)
        x.rank = x[6]
        x.username = x[1]
        x.percent = x[3]
        x.coins = x[13]
        x.playerID = x[2]
        x.date = x[42] + app.config.timestampSuffix
        keys.forEach(k => delete x[k])
      }) 

      return res.send(scores.slice(0, amount))
      
      })
}
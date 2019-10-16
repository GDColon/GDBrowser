module.exports = async (app, req, res) => {

    const request = require('request')

    let amount = 100;
    let count = req.query.count ? parseInt(req.query.count) : null
    if (count && count > 0) {
      if (count > 2500) amount = 2500
      else amount = count;
    }

    let params = {
      count: amount,
      secret: app.secret,
      type: (req.query.hasOwnProperty("creator") || req.query.hasOwnProperty("creators")) ? "creators" : "top",
    }  

    request.post('http://boomlings.com/database/getGJScores20.php', {
    form : params}, async function(err, resp, body) { 

      if (body == '-1' || !body) return res.send("-1")
      scores = body.split('|').map(x => app.parseResponse(x)).filter(x => x[1])
      if (!scores.length) return res.send("-1")

      scores.forEach(x => {
        let keys = Object.keys(x)
        x.rank = x[6]
        x.username = x[1]
        x.playerID = x[2]
        x.accountID = x[16]
        x.stars = x[3]
        x.demons = x[4]
        x.cp = x[8]
        x.coins = x[13]
        x.usercoins = x[17]
        x.diamonds = x[46]
        keys.forEach(k => delete x[k])
      }) 
      return res.send(scores)
      })
}
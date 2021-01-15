const request = require('request')

let cache = {data: null, indexed: 0}

module.exports = async (app, req, res) => {

  if (app.offline) return res.send("-1")
  else if (app.config.cacheGauntlets && cache.data != null && cache.indexed + 2000000 > Date.now()) return res.send(cache.data)   // half hour cache

  request.post(app.endpoint + 'getGJGauntlets21.php', req.gdParams({}), function (err, resp, body) {

    if (err || !body || body == '-1' || body.startsWith("<!")) return res.send("-1")
    let gauntlets = body.split('#')[0].split('|').map(x => app.parseResponse(x))
    let gauntletList = gauntlets.map(x => ({ id: +x[1], levels: x[3].split(",") }))

    if (app.config.cacheGauntlets) cache = {data: gauntletList, indexed: Date.now()}
    res.send(gauntletList)

  })
    
} 
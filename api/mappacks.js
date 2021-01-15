const request = require('request')
const difficulties = ["unrated", "easy", "normal", "hard", "harder", "insane", "demon"]

let cache = {data: null, indexed: 0}

module.exports = async (app, req, res) => {

  if (app.offline) return res.send("-1")
  else if (app.config.cacheMapPacks && cache.data != null && cache.indexed + 20000000 > Date.now()) return res.send(cache.data)   // 6 hour cache

  request.post(app.endpoint + 'getGJMapPacks21.php', req.gdParams({ count: 200 }), function (err, resp, body) {

    if (err || !body || body == '-1' || body.startsWith("<!")) return res.send("-1")

    let packs = body.split('#')[0].split('|').map(x => app.parseResponse(x)).filter(x => x[2])

    let mappacks = packs.map(x => ({    // "packs.map()" laugh now please
      id: +x[1],
      levels: x[3].split(","),
      name: x[2],
      stars: +x[4],
      coins: +x[5],
      difficulty: difficulties[+x[6]],
      barColor: x[7],
      textColor: x[8]
    }))

    if (app.config.cacheMapPacks) cache = {data: mappacks, indexed: Date.now()}
    return res.send(mappacks)

  })
    
}
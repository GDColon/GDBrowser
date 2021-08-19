let cache = {}
let gauntletNames = ["Fire", "Ice", "Poison", "Shadow", "Lava", "Bonus", "Chaos", "Demon", "Time", "Crystal", "Magic", "Spike", "Monster", "Doom", "Death"]

module.exports = async (app, req, res) => {

  if (req.offline) return res.send("-1")

  let cached = cache[req.id]
  if (app.config.cacheGauntlets && cached && cached.data && cached.indexed + 2000000 > Date.now()) return res.send(cached.data)   // half hour cache

  req.gdRequest('getGJGauntlets21', {}, function (err, resp, body) {

    if (err) return res.send("-1")
    let gauntlets = body.split('#')[0].split('|').map(x => app.parseResponse(x)).filter(x => x[3])
    let gauntletList = gauntlets.map(x => ({ id: +x[1], name: gauntletNames[+x[1] - 1] || "Unknown", levels: x[3].split(",") }))

    if (app.config.cacheGauntlets) cache[req.id] = {data: gauntletList, indexed: Date.now()}
    res.send(gauntletList)

  })
    
}
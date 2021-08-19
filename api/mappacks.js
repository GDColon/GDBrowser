let difficulties = ["auto", "easy", "normal", "hard", "harder", "insane", "demon", "demon-easy", "demon-medium", "demon-insane", "demon-extreme"]
let cache = {}

module.exports = async (app, req, res) => {

  if (req.offline) return res.send("-1")
  
  let cached = cache[req.id]
  if (app.config.cacheMapPacks && cached && cached.data && cached.indexed + 5000000 > Date.now()) return res.send(cached.data)   // 1.5 hour cache
  let params = { count: 250, page: 0 }
  let packs = []

  function mapPackLoop() {
    req.gdRequest('getGJMapPacks21', params, function (err, resp, body) {

      if (err) return res.send("-1")

      let newPacks = body.split('#')[0].split('|').map(x => app.parseResponse(x)).filter(x => x[2])
      packs = packs.concat(newPacks)

      // not all GDPS'es support the count param, which means recursion time!!!
      if (newPacks.length == 10) {
        params.page++
        return mapPackLoop()
      }
      
      let mappacks = packs.map(x => ({    // "packs.map()" laugh now please
        id: +x[1],
        name: x[2],
        levels: x[3].split(","),
        stars: +x[4],
        coins: +x[5],
        difficulty: difficulties[+x[6]] || "unrated",
        barColor: x[7],
        textColor: x[8]
      }))

      if (app.config.cacheMapPacks) cache[req.id] = {data: mappacks, indexed: Date.now()}
      return res.send(mappacks)
    })
  }
  mapPackLoop()
}
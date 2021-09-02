const request = require('request')

module.exports = async (app, req, res) => {

    if (req.isGDPS) return res.send("0")

    request.post('http://robtopgames.com/Boomlings/get_scores.php', {
    form : { secret: app.config.params.secret || "Wmfd2893gb7", name: "Player" }  }, function(err, resp, body) { 

      if (err || !body || body == 0) return res.send("0")

      let info = body.split(" ").filter(x => x.includes(";"))
      let users = []
      info.forEach((x, y) => {
        let user = x.split(";")
        let scores = user[2]
        let visuals = user[3]
        user = {
          rank: y+1,
          name: user[0],
          ID: user[1],
          level: +scores.slice(1, 3),
          score: +scores.slice(3, 10),
          boomling: +visuals.slice(5, 7),
          boomlingLevel: +visuals.slice(2, 4),
          powerups: [+visuals.slice(7, 9), +visuals.slice(9, 11), +visuals.slice(11, 13)].map(x  => (x > 8 || x < 1) ? 0 : x),

          unknownVisual: +visuals.slice(0, 2),
          unknownScore: +scores.slice(0, 1),
          raw: x
        }

        if (!user.boomling || user.boomling > 66 || user.boomling < 0) user.boomling = 0
        if (!user.boomlingLevel || user.boomlingLevel > 25 || user.boomlingLevel < 1) user.boomlingLevel = 25

      users.push(user)
      })

      return res.send(users)
      
      })
}
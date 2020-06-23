const request = require('request')
const fs = require('fs')
const Level = require('../classes/Level.js')

module.exports = async (app, req, res, api, analyze) => {

  let levelID = req.params.id
  if (levelID == "daily") return app.run.download(app, req, res, api, 'daily', analyze)
  else if (levelID == "weekly") return app.run.download(app, req, res, api, 'weekly', analyze)
  else if (levelID.match(/[^0-9]/)) {
    if (!api) return res.redirect('search/' + req.params.id)
    else return res.send("-1")
  }
  else levelID = levelID.replace(/[^0-9]/g, "")

  if (analyze || req.query.hasOwnProperty("download")) return app.run.download(app, req, res, api, levelID, analyze)

  request.post(app.endpoint + 'getGJLevels21.php', {
    form: {
      str: levelID,
      secret: app.secret,
      type: 0
    }
  }, async function (err, resp, body) {

    if (err || !body || body == '-1') {
      if (!api) return res.redirect('search/' + req.params.id)
      else return res.send("-1")
    }

    let preRes = body.split('#')[0].split('|', 10)
    let author = body.split('#')[1].split('|')[0].split(':')
    let song = '~' + body.split('#')[2];
    song = app.parseResponse(song, '~|~')

    let levelInfo = app.parseResponse(preRes[0])
    let level = new Level(levelInfo, author)


    if (song[2]) {
      level.songName = song[2] || "Unknown"
      level.songAuthor = song[4] || "Unknown"
      level.songSize = (song[5] || "0") + "MB"
      level.songID = song[1] || level.customSong
    }

    else {
      let foundSong = require('../misc/level.json').music[parseInt(levelInfo[12]) + 1] || { "null": true }
      level.songName = foundSong[0] || "Unknown"
      level.songAuthor = foundSong[1] || "Unknown"
      level.songSize = "0MB"
      level.songID = "Level " + [parseInt(levelInfo[12]) + 1]
    }

    function sendLevel() {

      if (api) return res.send(level)

      else return fs.readFile('./html/level.html', 'utf8', function (err, data) {
        let html = data;
        level.songName = level.songName.replace(/[^ -~]/g, "")  // strip off unsupported characters
        let variables = Object.keys(level)
        variables.forEach(x => {
          let regex = new RegExp(`\\[\\[${x.toUpperCase()}\\]\\]`, "g")
          html = html.replace(regex, app.clean(level[x]))
        })
        return res.send(html)
      })
    }

    if (level.difficulty == "Extreme Demon") {
      request.get('http://www.pointercrate.com/api/v1/demons/?name=' + level.name.trim(), function (err, resp, demonList) {
          if (err) return sendLevel()
          let demon = JSON.parse(demonList)
          if (demon[0] && demon[0].position <= 150) level.demonList = demon[0].position
          return sendLevel()
      })
  }

    else return sendLevel()

  })
}
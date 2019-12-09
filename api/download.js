const request = require('request')
const fs = require('fs')
const XOR = require('../misc/XOR.js');
const xor = new XOR();

// level class
const Level = require("./../classes/Level");

module.exports = async (app, req, res, api, ID, analyze) => {

  let levelID = ID || req.params.id
  if (levelID == "daily") levelID = -1
  else if (levelID == "weekly") levelID = -2
  else levelID = levelID.replace(/[^0-9]/g, "")

  request.post('http://boomlings.com/database/downloadGJLevel22.php', {
    form: {
      levelID,
      secret: app.secret
    }
  }, async function (err, resp, body) {

    if (err || !body || body == '-1') {
      if (!api && levelID < 0) return res.redirect('/')
      if (!api) return res.redirect('search/' + req.params.id)
      else return res.send("-1")
    }

    let levelInfo = app.parseResponse(body)
    let level = new Level(levelInfo)

    // parse password
    level.decodePassword();

    level.cp = (level.stars > 0) + level.featured + level.epic;

    // parse difficulty
    level.parseDifficulty();
    level.difficultyFace = `${levelInfo[17] != 1 ? level.difficulty.toLowerCase() : `demon-${level.difficulty.toLowerCase().split(' ')[0]}`}${level.epic ? '-epic' : `${level.featured ? '-featured' : ''}`}`

    request.post('http://boomlings.com/database/getGJUsers20.php', {
      form: { str: level.authorID, secret: app.secret }
    }, function (err1, res1, b1) {
      let gdSearchResult = app.parseResponse(b1)
      request.post('http://boomlings.com/database/getGJUserInfo20.php', {
        form: { targetAccountID: gdSearchResult[16], secret: app.secret }
      }, function (err2, res2, b2) {
        if (b2 != '-1') {
          let account = app.parseResponse(b2)
          level.author = account[1]
          level.accountID = gdSearchResult[16]
        }

        else {
          level.author = "-"
          level.accountID = "0"
        }

        request.post('http://boomlings.com/database/getGJSongInfo.php', {
          form: {
            songID: level.customSong,
            secret: app.secret
          }
        }, async function (err, resp, songRes) {

          if (songRes != '-1') {
            let songData = app.parseResponse(songRes, '~|~')
            level.songName = songData[2] || "Unknown"
            level.songAuthor = songData[4] || "Unknown"
            level.songSize = (songData[5] || "0") + "MB"
            level.songID = songData[1] || level.customSong
            if (!songData[2]) level.invalidSong = true
          }

          else {
            let foundSong = require('../misc/level.json').music[parseInt(levelInfo[12]) + 1] || { "null": true }
            level.songName = foundSong[0] || "Unknown"
            level.songAuthor = foundSong[1] || "Unknown"
            level.songSize = "0MB"
            level.songID = "Level " + [parseInt(levelInfo[12]) + 1]
          }

          level.data = levelInfo[4]

          if (analyze) return app.modules.analyze(app, req, res, level)

          function sendLevel() {
            if (api) return res.send(level)

            else return fs.readFile('./html/level.html', 'utf8', function (err, data) {
              let html = data;
              let variables = Object.keys(level)
              variables.forEach(x => {
                let regex = new RegExp(`\\[\\[${x.toUpperCase()}\\]\\]`, "g")
                html = html.replace(regex, app.clean(level[x]))
              })
              return res.send(html)
            })
          }

          //demon list stuff
          if (level.difficulty == "Extreme Demon") {
            request.get('https://www.pointercrate.com/api/v1/demons/?name=' + level.name.trim(), async function (err, resp, demonList) {
              let demon = JSON.parse(demonList)
              if (demon[0] && demon[0].position <= 150) level.demonList = demon[0].position
              return sendLevel()
            })
          }

          else return sendLevel()

        })
      })
    })
  })
}
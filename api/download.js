const request = require('request')
const fs = require('fs')
const Level = require('../classes/Level.js')
module.exports = async (app, req, res, api, ID, analyze) => {

  if (req.offline) {
    if (!api && levelID < 0) return res.redirect('/')
    if (!api) return res.redirect('search/' + req.params.id)
    else return res.send("-1")
  }

  let levelID = ID || req.params.id
  if (levelID == "daily") levelID = -1
  else if (levelID == "weekly") levelID = -2
  else levelID = levelID.replace(/[^0-9]/g, "")

  req.gdRequest('downloadGJLevel22', { levelID }, function (err, resp, body) {

    if (err || !body || body == '-1' || body.startsWith("<")) {
      if (!api && levelID < 0) return res.redirect(`/?daily=${levelID * -1}`)
      if (!api) return res.redirect('search/' + req.params.id)
      else return res.send("-1")
    }

    let authorData = body.split("#")[3]  // daily/weekly only, most likely

    let levelInfo = app.parseResponse(body)
    let level = new Level(levelInfo, req.server, true)

    let foundID = app.accountCache[Object.keys(app.accountCache).find(x => app.accountCache[x][1] == level.playerID)]
    if (foundID) foundID = foundID.filter(x => x != level.playerID)

    req.gdRequest(authorData ? "" : 'getGJUsers20', { str: level.playerID }, function (err1, res1, b1) {
      let gdSearchResult = authorData ? "" : app.parseResponse(b1)
      req.gdRequest(authorData ? "" : 'getGJUserInfo20', { targetAccountID: gdSearchResult[16] }, function (err2, res2, b2) {

        if (err2 && (foundID || authorData)) {
          let authorInfo = foundID || authorData.split(":")
          level.author = authorInfo[1] || "-"
          level.accountID = authorInfo[0].includes(",") ? "0" : authorInfo[0]
        }

        else if (!err && b2 != '-1') {
          let account = app.parseResponse(b2)
          level.author = account[1] || "-"
          level.accountID = gdSearchResult[16]
        }

        else {
          level.author = "-"
          level.accountID = "0"
        }

        if (level.author != "-") app.userCache(req.id, level.accountID, level.playerID, level.author)

        req.gdRequest('getGJSongInfo', { songID: level.customSong }, function (err, resp, songRes) {

          if (!err && songRes != '-1') {
            let songData = app.parseResponse(songRes, '~|~')
            level.songName = songData[2] || "Unknown"
            level.songAuthor = songData[4] || "Unknown"
            level.songSize = (songData[5] || "0") + "MB"
            level.songID = songData[1] || String(level.customSong)
            if (!songData[2]) level.invalidSong = true
          }

          else {
            let foundSong = require('../misc/level.json').music[parseInt(levelInfo[12]) + 1] || { "null": true }
            level.songName = foundSong[0] || "Unknown"
            level.songAuthor = foundSong[1] || "Unknown"
            level.songSize = "0MB"
            level.songID = "Level " + [parseInt(levelInfo[12]) + 1]
          }

          level.extraString = levelInfo[36]
          level.data = levelInfo[4]

          if (analyze) return app.run.analyze(app, req, res, level)

          if (req.isGDPS) level.gdps = (req.onePointNine ? "1.9/" : "") + req.endpoint
          if (req.onePointNine) {
            level.orbs = 0
            level.diamonds = 0
          }

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

          if (levelID < 0) {
            req.gdRequest('getGJDailyLevel', { weekly: levelID == -2 ? "1" : "0" }, function (err, resp, dailyInfo) {
              if (err || dailyInfo == -1) return sendLevel()
              let dailyTime = dailyInfo.split("|")[1]
              level.nextDaily = +dailyTime
              level.nextDailyTimestamp = Math.round((Date.now() + (+dailyTime * 1000)) / 100000) * 100000
              return sendLevel()
            })  
          }

          else if (req.server.demonList && level.difficulty == "Extreme Demon") {
            request.get(req.server.demonList + 'api/v2/demons/?name=' + level.name.trim(), function (err, resp, demonList) {
                if (err) return sendLevel()
                let demon = JSON.parse(demonList)
                if (demon[0] && demon[0].position) level.demonList = demon[0].position
                return sendLevel()
            })
          }

          else return sendLevel()

        })
      })
    })
  })
}
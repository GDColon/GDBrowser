const request = require('request')
const fs = require('fs')
const Level = require('../classes/Level.js')

module.exports = async (app, req, res, api, ID, analyze) => {

  function rejectLevel() {
    if (!api) return res.redirect('search/' + req.params.id)
    else return res.send("-1")
  }

  if (req.offline) {
    if (!api && levelID < 0) return res.redirect('/')
    return rejectLevel()
  }

  let levelID = ID || req.params.id
  if (levelID == "daily") levelID = -1
  else if (levelID == "weekly") levelID = -2
  else levelID = levelID.replace(/[^0-9]/g, "")

  req.gdRequest('downloadGJLevel22', { levelID }, function (err, resp, body) {

    if (err) {
      if (analyze && api && req.server.downloadsDisabled) return res.send("-3")
      else if (!api && levelID < 0) return res.redirect(`/?daily=${levelID * -1}`)
      else return rejectLevel()
    }

    let authorData = body.split("#")[3]  // daily/weekly only, most likely

    let levelInfo = app.parseResponse(body)
    let level = new Level(levelInfo, req.server, true)
    if (!level.id) return rejectLevel()

    let foundID = app.accountCache[req.id][Object.keys(app.accountCache[req.id]).find(x => app.accountCache[req.id][x][1] == level.playerID)]
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

          level = level.getSongInfo(app.parseResponse(songRes, '~|~'))
          level.extraString = levelInfo[36]
          level.data = levelInfo[4]
          if (req.isGDPS) level.gdps = (req.onePointNine ? "1.9/" : "") + req.server.id

          if (analyze) return app.run.analyze(app, req, res, level)

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
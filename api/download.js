const request = require('request')
const fs = require('fs')

module.exports = async (app, req, res, api, ID, analyze) => {

    let orbs =  [0, 0, 50, 75, 125, 175, 225, 275, 350, 425, 500]
    let length = ['Tiny', 'Short', 'Medium', 'Long', 'XL']
    let difficulty = {0: 'Unrated', 10: 'Easy', 20: 'Normal', 30: 'Hard', 40: 'Harder', 50: 'Insane'}

    let levelID = ID || req.params.id
    if (levelID == "daily") levelID = -1
    else if (levelID == "weekly") levelID = -2
    else levelID = levelID.replace(/[^0-9]/g, "")

    request.post('http://boomlings.com/database/downloadGJLevel22.php', {
    form : { 
        levelID : levelID, 
        secret : app.secret
    }}, async function(err, resp, body) { 

      if (body == '-1') {
        if (!api && levelID < 0) return res.redirect('/')
        if (!api) return res.redirect('search/' + req.params.id)
        else return res.send("-1")
      }

      let levelInfo = app.parseResponse(body)
          let level = {
                name: levelInfo[2],
                id: levelInfo[1],
                description: Buffer.from(levelInfo[3], 'base64').toString() || "(No description provided)",
                author: "-",
                authorID: levelInfo[6],
                accountID: 0,
                difficulty: difficulty[levelInfo[9]],
                downloads: levelInfo[10],
                likes: levelInfo[14],
                disliked : levelInfo[14] < 0,
                length: length[levelInfo[15]],
                stars: levelInfo[18],
                orbs: orbs[levelInfo[18]],
                diamonds: levelInfo[18] < 2 ? 0 : parseInt(levelInfo[18]) + 2,
                featured: levelInfo[19] > 0,
                epic: levelInfo[42] == 1,
                uploaded: levelInfo[28] + ' ago', //not given in search
                updated: levelInfo[29] + ' ago', //not given in search
                version: levelInfo[5],
                password: levelInfo[27],
                copiedID: levelInfo[30],
                officialSong: levelInfo[12] != 0 ? parseInt(levelInfo[12]) + 1 : 0,
                customSong: levelInfo[35],
                coins: levelInfo[37],
                verifiedCoins: levelInfo[38] == 1,
                starsRequested: levelInfo[39],
                ldm: levelInfo[40] == 1, //not given in search
                objects: levelInfo[45] == "65535" ? "65000+" : levelInfo[45],
                large: levelInfo[45] > 40000,
          }
   
          if (level.password != "0") {
            const XOR = require('../misc/XOR.js');
            const xor = new XOR();

            let pass = level.password
            pass = +xor.decrypt(pass, 26364)
            pass = pass.toString()
           
            if (pass.length > 1) level.password = Number(pass) - 1000000
            else level.password = pass
          }

          level.cp = (level.stars > 0) + level.featured + level.epic

          if (levelInfo[17] == 1) level.difficulty += ' Demon'
          if (level.difficulty == "Insane Demon") level.difficulty = "Extreme Demon"
          else if (level.difficulty == "Harder Demon") level.difficulty = "Insane Demon"    
          else if (level.difficulty == "Normal Demon") level.difficulty = "Medium Demon"   
          else if (levelInfo[25] == 1) level.difficulty = 'Auto'
          level.difficultyFace = `${levelInfo[17] != 1 ? level.difficulty.toLowerCase() : `demon-${level.difficulty.toLowerCase().split(' ')[0]}`}${level.epic ? '-epic' : `${level.featured ? '-featured' : ''}`}`


          request.post('http://boomlings.com/database/getGJUsers20.php', {
            form: {str: level.authorID, secret: app.secret}
          }, function (err1, res1, b1) {
            let gdSearchResult = app.parseResponse(b1)
          request.post('http://boomlings.com/database/getGJUserInfo20.php', {
            form: {targetAccountID: gdSearchResult[16], secret: app.secret}
          }, function (err2, res2, b2) {
              if (b2 != '-1') {
                let account = app.parseResponse(b2)
                level.author = app.clean(account[1])
                level.accountID = app.clean(gdSearchResult[16])
              }

              else {
                level.author = "-"
                level.accountID = "0"
              }

        request.post('http://boomlings.com/database/getGJSongInfo.php', {
        form : { 
        songID : level.customSong, 
        secret : app.secret
    }}, async function(err, resp, songRes) { 

      if (songRes != '-1') {
        let songData = app.parseResponse(songRes, '~|~')
        level.songName = songData[2] || "Unknown"
        level.songAuthor = songData[4] || "Unknown"
        level.songSize = (songData[5] || "0") + "MB"
        level.songID = songData[1] || level.customSong
        if (!songData[2]) level.invalidSong = true
    }

      else {
        let foundSong = require('../misc/level.json').music[parseInt(levelInfo[12]) + 1] || {"null": true}
        level.songName =  foundSong[0] || "Unknown"
        level.songAuthor = foundSong[1] || "Unknown"
        level.songSize = "0MB"
        level.songID = "Level " + [parseInt(levelInfo[12]) + 1]
      }

      level.data = levelInfo[4]

      if (analyze) return app.modules.analyze(app, req, res, level)

      function sendLevel() {
      if (api) return res.send(level)

      else return fs.readFile('./html/level.html', 'utf8', function(err, data) {
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
      request.get('https://www.pointercrate.com/api/v1/demons/?name=' + level.name.trim(), async function(err, resp, demonList) {
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
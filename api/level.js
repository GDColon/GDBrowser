const request = require('request')
const fs = require('fs')

module.exports = async (app, req, res, api, analyze) => {

  let orbs =  [0, 0, 50, 75, 125, 175, 225, 275, 350, 425, 500]
  let length = ['Tiny', 'Short', 'Medium', 'Long', 'XL']
  let difficulty = {0: 'Unrated', 10: 'Easy', 20: 'Normal', 30: 'Hard', 40: 'Harder', 50: 'Insane'}

  let levelID = req.params.id
  if (levelID == "daily") return app.modules.download(app, req, res, api, 'daily', analyze)
  else if (levelID == "weekly") return app.modules.download(app, req, res, api, 'weekly', analyze)
  else if (levelID.match(/[^0-9]/)) {
      if (!api) return res.redirect('search/' + req.params.id)
      else return res.send("-1")
  }
  else levelID = levelID.replace(/[^0-9]/g, "")

  if (analyze || req.query.hasOwnProperty("download")) return app.modules.download(app, req, res, api, levelID, analyze)

  request.post('http://boomlings.com/database/getGJLevels21.php', {
  form : { 
      str : levelID, 
      secret : app.secret,
      type: 0
  }}, async function(err, resp, body) { 

    if (body == '-1') {
      if (!api) return res.redirect('search/' + req.params.id)
      else return res.send("-1")
    }

    let preRes = body.split('#')[0].split('|', 10)
    let author = body.split('#')[1].split('|')[0].split(':')
    let song = '~' + body.split('#')[2]; 
    song =  app.parseResponse(song.split(':')[0], '~|~')

    let levelInfo = app.parseResponse(preRes[0])
        let level = {
              name: levelInfo[2],
              id: levelInfo[1],
              description: Buffer.from(levelInfo[3], 'base64').toString() || "(No description provided)",
              author: author[1] || "-",
              authorID: levelInfo[6],
              accountID: author[2] || 0,
              difficulty: difficulty[levelInfo[9]],
              downloads: levelInfo[10],
              likes: levelInfo[14],
              disliked : levelInfo[14] < 0,
              length: length[levelInfo[15]] || "?",
              stars: levelInfo[18],
              orbs: orbs[levelInfo[18]],
              diamonds: levelInfo[18] < 2 ? 0 : parseInt(levelInfo[18]) + 2,
              featured: levelInfo[19] > 0,
              epic: levelInfo[42] == 1,
              //uploaded: levelInfo[28] + ' ago',
              //updated: levelInfo[29] + ' ago',
              version: levelInfo[5],
              copiedID: levelInfo[30],
              officialSong: levelInfo[12] != 0 ? parseInt(levelInfo[12]) + 1 : 0,
              customSong: levelInfo[35],
              coins: levelInfo[37],
              verifiedCoins: levelInfo[38] == 1,
              starsRequested: levelInfo[39],
              //ldm: levelInfo[40] == 1, //not given in search
              objects: levelInfo[45] == "65535" ? "65000+" : levelInfo[45],
              large: levelInfo[45] > 40000,
        }

        level.cp = (level.stars > 0) + level.featured + level.epic

        if (levelInfo[17] == 1) level.difficulty += ' Demon'
        if (level.difficulty == "Insane Demon") level.difficulty = "Extreme Demon"
        else if (level.difficulty == "Harder Demon") level.difficulty = "Insane Demon"    
        else if (level.difficulty == "Normal Demon") level.difficulty = "Medium Demon"   
        else if (levelInfo[25] == 1) level.difficulty = 'Auto'
        level.difficultyFace = `${levelInfo[17] != 1 ? level.difficulty.toLowerCase() : `demon-${level.difficulty.toLowerCase().split(' ')[0]}`}${level.epic ? '-epic' : `${level.featured ? '-featured' : ''}`}`

         if (song[2]) {
           level.songName = song[2] || "Unknown"
           level.songAuthor = song[4] || "Unknown"
           level.songSize = (song[5] || "0") + "MB"
           level.songID = song[1] || level.customSong
       }
  
         else {
           let foundSong = require('../misc/level.json').music[parseInt(levelInfo[12]) + 1] || {"null": true}
           level.songName =  foundSong[0] || "Unknown"
           level.songAuthor = foundSong[1] || "Unknown"
           level.songSize = "0MB"
           level.songID = "Level " + [parseInt(levelInfo[12]) + 1]
        }

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
        request.get('https://www.pointercrate.com/api/v1/demons/?name=' + x.trim(), async function(err, resp, demonList) {
          let demons = JSON.parse(demonList)
          if (demons && demons[0].position <= 150) level.demonList = demons[0].position
          return sendLevel()
      })
    }

    else return sendLevel()

    })
}
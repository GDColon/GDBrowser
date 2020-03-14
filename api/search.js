const request = require('request')
const orbs =  [0, 0, 50, 75, 125, 175, 225, 275, 350, 425, 500]
const difficulty = {0: 'Unrated', 10: 'Easy', 20: 'Normal', 30: 'Hard', 40: 'Harder', 50: 'Insane'}
const length = ['Tiny', 'Short', 'Medium', 'Long', 'XL']
const mapPacks = require('../misc/mapPacks.json')
const levels = require('../misc/level.json').music
const Level = require('../classes/Level.js')

module.exports = async (app, req, res) => {

    let amount = 10;
    let count = req.query.count ? parseInt(req.query.count) : null
    if (count && count > 0) {
      if (count > 10) amount = 10
      else amount = count;
    }
    
    let filters = {
        str: req.params.text,

        diff: req.query.diff,
        demonFilter: req.query.demonFilter,
        page: req.query.page || 0,
        gauntlet: req.query.gauntlet || 0,
        len: req.query.length,
        song: req.query.songID,
        followed: req.query.creators,

        featured: req.query.hasOwnProperty("featured") ? 1 : 0,
        originalOnly: req.query.hasOwnProperty("original") ? 1 : 0,
        twoPlayer: req.query.hasOwnProperty("twoPlayer") ? 1 : 0,
        coins: req.query.hasOwnProperty("coins") ? 1 : 0,
        epic: req.query.hasOwnProperty("epic") ? 1 : 0,
        star: req.query.hasOwnProperty("starred") ? 1 : 0,
        noStar: req.query.hasOwnProperty("noStar") ? 1 : 0,
        customSong: req.query.hasOwnProperty("customSong") ? 1 : 0,

        type: req.query.type || 0,
        gameVersion: app.gameVersion,
        binaryVersion: app.binaryVersion,
        secret: app.secret
    }  

    let foundPack = mapPacks[req.params.text.toLowerCase()]
    if (foundPack) filters.str = `${foundPack[0]},${foundPack[1]},${foundPack[2]}`;

    if (req.query.gauntlet || req.query.hasOwnProperty("mappack") || req.query.type == "saved") filters.type = 10

    if (req.query.songID && filters.customSong == 0 && levels.find(x => req.query.songID.toLowerCase() == x[0].toLowerCase())) {
        filters.song = levels.findIndex(x => req.query.songID.toLowerCase() == x[0].toLowerCase())
    }

    if (req.query.type) {
        let filterCheck = req.query.type.toLowerCase()
        if (filterCheck == 'mostdownloaded') filters.type = 1
        if (filterCheck == 'mostliked') filters.type = 2
        if (filterCheck == 'trending') filters.type = 3
        if (filterCheck == 'recent') filters.type = 4
        if (filterCheck == 'featured') filters.type = 6
        if (filterCheck == 'magic') filters.type = 7
        if (filterCheck == 'awarded' || filterCheck == 'starred') filters.type = 11
        if (filterCheck == 'halloffame' || filterCheck == 'hof') filters.type = 16
    }

    if (req.query.hasOwnProperty("user")) {
        filters.type = 5
        if (!req.params.text.match(/^[0-9]*$/)) return app.run.profile(app, req, res, null, req.params.text)
    } 

    if (req.query.hasOwnProperty("creators")) filters.type = 12

    if (req.params.text == "*") delete filters.str


    request.post(app.endpoint + 'getGJLevels21.php', {
    form : filters}, async function(err, resp, body) {
        
    if (err || !body || body == '-1') return res.send("-1")
    let splitBody = body.split('#')
    let preRes = splitBody[0].split('|', 10)
    let authorList = {}
    let songList = {}
    let authors = splitBody[1].split('|')
    let songs = '~' + splitBody[2]; songs = songs.split('|~1~:').map(x => app.parseResponse(x + '|~1~', '~|~'))
    songs.forEach(x => {songList[x['~1']] = x['2']})

    authors.splice(10, 999)
    authors.forEach(x => {
      if (x.startsWith('~')) return
      let arr = x.split(':')
      authorList[arr[0]] = [arr[1], arr[2]]})

    let levelArray = preRes.map(x => app.parseResponse(x)).filter(x => x[1])
    let parsedLevels = []

    await levelArray.forEach(async (x, y) => {

        let level = new Level(x)
        let songSearch = songs.find(y => y['~1'] == x[35])

        level.author = authorList[x[6]] ? authorList[x[6]][0] : "-";
        level.accountID = authorList[x[6]] ? authorList[x[6]][1] : "0";

        if (songSearch) {
            level.songName = app.clean(songSearch[2] || "Unknown")
            level.songAuthor = songSearch[4] || "Unknown"
            level.songSize = (songSearch[5] || "0") + "MB"
            level.songID = songSearch[1] || level.customSong
        }
   
        else {
            let foundSong = require('../misc/level.json').music[parseInt(x[12]) + 1] || {"null": true}
            level.songName =  foundSong[0] || "Unknown"
            level.songAuthor = foundSong[1] || "Unknown"
            level.songSize = "0MB"
            level.songID = "Level " + [parseInt(x[12]) + 1]
        }

        //this is broken if you're not on page 0, blame robtop
        if (filters.page == 0 && y == 0) {
            let pages = splitBody[3].split(":");
            level.results = +pages[0];
            level.pages = +Math.ceil(pages[0] / 10);

            if (filters.gauntlet || foundPack) {
                level.results = levelArray.length 
                level.pages = 1
            }
        }

        parsedLevels[y] = level
    })

    return res.send(parsedLevels.slice(0, amount))

    })
}
const request = require('request')
const levels = require('../misc/level.json').music
const Level = require('../classes/Level.js')

module.exports = async (app, req, res) => {

    if (app.offline) return res.send("-1")

    let amount = 10;
    let count = +req.query.count
    if (count && count > 0) {
      if (count > 500) amount = 500
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
        count: amount
    }

    if (req.query.gauntlet || req.query.hasOwnProperty("mappack") || req.query.hasOwnProperty("list") || req.query.type == "saved") filters.type = 10

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
        let accountCheck = app.accountCache[filters.str.toLowerCase()]
        filters.type = 5
        if (accountCheck) filters.str = accountCheck[1]
        else if (!filters.str.match(/^[0-9]*$/)) return app.run.profile(app, req, res, null, req.params.text)
    } 

    if (req.query.hasOwnProperty("creators")) filters.type = 12

    if (req.params.text == "*") delete filters.str
    
    request.post(app.endpoint + 'getGJLevels21.php', req.gdParams(filters), async function(err, resp, body) {
    
    if (err || !body || body == '-1' || body.startsWith("<!")) return res.send("-1")
    let splitBody = body.split('#')
    let preRes = splitBody[0].split('|')
    let authorList = {}
    let songList = {}
    let authors = splitBody[1].split('|')
    let songs = '~' + splitBody[2]; songs = songs.split('|~1~:').map(x => app.parseResponse(x + '|~1~', '~|~'))
    songs.forEach(x => {songList[x['~1']] = x['2']})

    authors.forEach(x => {
      if (x.startsWith('~')) return
      let arr = x.split(':')
      authorList[arr[0]] = [arr[1], arr[2]]})

    let levelArray = preRes.map(x => app.parseResponse(x)).filter(x => x[1])
    let parsedLevels = []

    levelArray.forEach(async (x, y) => {

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

            if (filters.gauntlet) {  // gauntlet page stuff
                level.results = levelArray.length 
                level.pages = 1
            }

            else if (filters.type == 10) {  //  custom page stuff
                level.results = levelArray.length
                level.pages = amount ? +Math.ceil(levelArray.length / amount) : 1
            }

            else {  // normal page stuff
                level.results = +pages[0];
                level.pages = +pages[0] == 9999 ? 1000 : +Math.ceil(pages[0] / amount);
            }

        }

        parsedLevels[y] = level
    })

    if (filters.type == 10) parsedLevels = parsedLevels.slice((+filters.page) * amount, (+filters.page + 1) * amount)
    return res.send(parsedLevels)

    })
}
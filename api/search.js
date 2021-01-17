const request = require('request')
const levels = require('../misc/level.json').music
const Level = require('../classes/Level.js')
let demonList = {list: [], lastUpdated: 0}

module.exports = async (app, req, res) => {

    if (app.offline) return res.send("-1")

    let demonMode = req.query.hasOwnProperty("demonlist") || req.query.hasOwnProperty("demonList") || req.query.type == "demonlist" || req.query.type == "demonList"
    if (demonMode) {
        if (app.isGDPS) return res.send('-1')
        if (!demonList.list.length || demonList.lastUpdated + 600000 < Date.now()) {  // 10 minute cache
            return request.get('http://www.pointercrate.com/api/v2/demons/listed/?limit=100', function (err1, resp1, list1) {
                if (err1) return res.send("-1")
                else return request.get('http://www.pointercrate.com/api/v2/demons/listed/?limit=100&after=100', function (err2, resp2, list2) {
                    if (err2) return res.send("-1")
                    demonList = {list: JSON.parse(list1).concat(JSON.parse(list2)).map(x => x.level_id), lastUpdated: Date.now()}
                    return app.run.search(app, req, res)
                })
            })
        }
    }

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

    if (req.query.songID && filters.customSong == 0 && levels.find(x => req.query.songID.toLowerCase() == x[0].toLowerCase())) {
        filters.song = levels.findIndex(x => req.query.songID.toLowerCase() == x[0].toLowerCase())
    }

    if (req.query.type) {
        let filterCheck = req.query.type.toLowerCase()
        switch(filterCheck) {
            case 'mostdownloaded': filters.type = 1; break;
            case 'mostliked': filters.type = 2; break;
            case 'trending': filters.type = 3; break;
            case 'recent': filters.type = 4; break;
            case 'featured': filters.type = 6; break;
            case 'magic': filters.type = 7; break;
            case 'awarded': filters.type = 11; break;
            case 'starred': filters.type = 11; break;
            case 'halloffame': filters.type = 16; break;
            case 'hof': filters.type = 16; break;
        }
    }

    if (req.query.hasOwnProperty("user")) {
        let accountCheck = app.accountCache[app.GDPSName + filters.str.toLowerCase()]
        filters.type = 5
        if (accountCheck) filters.str = accountCheck[1]
        else if (!filters.str.match(/^[0-9]*$/)) return app.run.profile(app, req, res, null, req.params.text)
    } 

    if (req.query.hasOwnProperty("creators")) filters.type = 12

    let listSize = 10
    if (demonMode || req.query.gauntlet || ["mappack", "list", "saved"].some(x => req.query.hasOwnProperty(x))) {
        filters.type = 10
        filters.str = demonMode ? demonList.list : filters.str.split(",")
        listSize = filters.str.length
        filters.str = filters.str.slice(filters.page*amount, filters.page*amount + amount).join()
        filters.page = 0
    }

    if (filters.str == "*") delete filters.str
    
    request.post(app.endpoint + 'getGJLevels21.php', req.gdParams(filters), async function(err, resp, body) {

        if (err || !body || body == '-1' || body.startsWith("<!")) return res.send("-1")
        let splitBody = body.split('#')
        let preRes = splitBody[0].split('|')
        let authorList = {}
        let songList = {}
        let authors = splitBody[1].split('|')
        let songs = '~' + splitBody[2]; songs = songs.split(':').map(x => app.parseResponse(x, '~|~'))
        songs.forEach(x => {songList[x['~1']] = x['2']})

        authors.forEach(x => {
        if (x.startsWith('~')) return
        let arr = x.split(':')
        authorList[arr[0]] = [arr[1], arr[2]]})

        let levelArray = preRes.map(x => app.parseResponse(x)).filter(x => x[1])
        let parsedLevels = []

        levelArray.forEach(async (x, y) => {

            let level = new Level(x)
            let songSearch = songs.find(y => y['~1'] == x[35]) || []

            level.author = authorList[x[6]] ? authorList[x[6]][0] : "-";
            level.accountID = authorList[x[6]] ? authorList[x[6]][1] : "0";

            if (level.customSong) {
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
                    level.results = listSize
                    level.pages = +Math.ceil(listSize / (amount || 10))
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
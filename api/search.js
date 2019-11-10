const request = require('request')
const orbs =  [0, 0, 50, 75, 125, 175, 225, 275, 350, 425, 500]
const difficulty = {0: 'Unrated', 10: 'Easy', 20: 'Normal', 30: 'Hard', 40: 'Harder', 50: 'Insane'}
const length = ['Tiny', 'Short', 'Medium', 'Long', 'XL']
const mapPacks = require('../misc/mapPacks.json')
const levels = require('../misc/level.json').music

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

        featured: req.query.hasOwnProperty("featured") ? 1 : 0,
        originalOnly: req.query.hasOwnProperty("original") ? 1 : 0,
        twoPlayer: req.query.hasOwnProperty("twoPlayer") ? 1 : 0,
        coins: req.query.hasOwnProperty("coins") ? 1 : 0,
        epic: req.query.hasOwnProperty("epic") ? 1 : 0,
        star: req.query.hasOwnProperty("starred") ? 1 : 0,
        noStar: req.query.hasOwnProperty("noStar") ? 1 : 0,
        customSong: req.query.hasOwnProperty("customSong") ? 1 : 0,

        type: req.query.type || 0,
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
        if (!req.params.text.match(/^[0-9]*$/)) return app.modules.profile(app, req, res, null, req.params.text)
    } 

    if (req.params.text == "*") delete filters.str


    request.post('http://boomlings.com/database/getGJLevels21.php', {
    form : filters}, async function(err, resp, body) {
        
    if (!body || body == '-1') return res.send("-1")
    let preRes = body.split('#')[0].split('|', 10)
    let authorList = {}
    let songList = {}
    let authors = body.split('#')[1].split('|')
    let songs = '~' + body.split('#')[2]; songs = songs.split('|~1~:~1~|').map(x => app.parseResponse(x, '~|~'))
    songs.forEach(x => {songList[x['~1']] = x['2']})

    authors.splice(10, 999)
    authors.forEach(x => {
      if (x.startsWith('~')) return
      let arr = x.split(':')
      authorList[arr[0]] = [arr[1], arr[2]]})

    let levelArray = preRes.map(x => app.parseResponse(x))

    await levelArray.forEach(async (x, y) => {
        let keys = Object.keys(x)
        x.name = x[2];
        x.id = x[1];
        x.description = Buffer.from(x[3], 'base64').toString() || "(No description provided)",
        x.author = authorList[x[6]] ? authorList[x[6]][0] : "-";
        x.authorID = x[6];
        x.accountID = authorList[x[6]] ? authorList[x[6]][1] : "0";
        x.difficulty = difficulty[x[9]];
        x.downloads = x[10];
        x.likes = x[14];
        x.disliked = x[14] < 0;
        x.length = length[x[15]] || "?";
        x.stars = x[18];
        x.orbs = orbs[x[18]];
        x.diamonds = x[18] < 2 ? 0 : parseInt(x[18]) + 2,
        x.featured = x[19] > 0;
        x.epic = x[42] == 1;
        x.version = x[5];
        x.copiedID = x[30];
        x.officialSong = x[12] != 0 ? parseInt(x[12]) + 1 : 0;
        x.customSong = x[35];
        x.coins = x[37];
        x.verifiedCoins = x[38] == 1;
        x.starsRequested = x[39];
        x.objects = x[45];
        x.large = x[45] > 40000;
        x.cp = (x.stars > 0) + x.featured + x.epic;

        if (x[17] == 1) x.difficulty += ' Demon'
        if (x.difficulty == "Insane Demon") x.difficulty = "Extreme Demon"
        else if (x.difficulty == "Harder Demon") x.difficulty = "Insane Demon"    
        else if (x.difficulty == "Normal Demon") x.difficulty = "Medium Demon"   
        else if (x[25] == 1) x.difficulty = 'Auto'
        x.difficultyFace = `${x[17] != 1 ? x.difficulty.toLowerCase() : `demon-${x.difficulty.toLowerCase().split(' ')[0]}`}${x.epic ? '-epic' : `${x.featured ? '-featured' : ''}`}`

        let songSearch = songs.find(y => y['~1'] == x[35])

        if (songSearch) {
            x.songName = app.clean(songSearch[2] || "Unknown")
            x.songAuthor = songSearch[4] || "Unknown"
            x.songSize = (songSearch[5] || "0") + "MB"
            x.songID = songSearch[1] || x.customSong
        }
   
        else {
            let foundSong = require('../misc/level.json').music[parseInt(x[12]) + 1] || {"null": true}
            x.songName =  foundSong[0] || "Unknown"
            x.songAuthor = foundSong[1] || "Unknown"
            x.songSize = "0MB"
            x.songID = "Level " + [parseInt(x[12]) + 1]
         }

        keys.forEach(k => delete x[k])
    })

    return res.send(levelArray.slice(0, amount))

    })
}
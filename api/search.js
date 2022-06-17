"use strict";
const request = require('request')
const Level = require('../classes/Level.js')
let demonList = {}

module.exports = async (app, req, res) => {
    const {query} = req
    if (req.offline) return res.status(500).send(query.hasOwnProperty("err") ? "err" : "-1")

    let demonMode = query.hasOwnProperty("demonlist") || query.hasOwnProperty("demonList") || query.type == "demonlist" || query.type == "demonList"
    if (demonMode) {
        if (!req.server.demonList) return res.sendError(400)
        let dList = demonList[req.id]
        if (!dList || !dList.list.length || dList.lastUpdated + 600000 < Date.now()) {  // 10 minute cache
            let demonStr = req.server.demonList + 'api/v2/demons/listed/?limit=100'
            return request.get(demonStr, function (err1, resp1, list1) {
                if (err1) return res.sendError()
                else return request.get(demonStr + '&after=100', function (err2, resp2, list2) {
                    if (err2) return res.sendError()
                    demonList[req.id] = {
                        list: JSON.parse(list1).concat(JSON.parse(list2))
                            .map(x => String(x.level_id)),
                        lastUpdated: Date.now()
                    }
                    return app.run.search(app, req, res)
                })
            })
        }
    }

    let amount = 10
    let count = req.isGDPS ? 10 : +query.count
    if (count && count > 0) amount = Math.min(count, 500)

    let filters = {
        str: req.params.text,

        diff: query.diff,
        demonFilter: query.demonFilter,
        page: query.page || 0,
        gauntlet: query.gauntlet || 0,
        len: query.length,
        song: query.songID,
        followed: query.creators,

        featured: query.hasOwnProperty("featured") ? 1 : 0,
        originalOnly: query.hasOwnProperty("original") ? 1 : 0,
        twoPlayer: query.hasOwnProperty("twoPlayer") ? 1 : 0,
        coins: query.hasOwnProperty("coins") ? 1 : 0,
        epic: query.hasOwnProperty("epic") ? 1 : 0,
        star: query.hasOwnProperty("starred") ? 1 : 0,
        noStar: query.hasOwnProperty("noStar") ? 1 : 0,
        customSong: query.hasOwnProperty("customSong") ? 1 : 0,

        type: query.type || 0,
        count: amount
    }

    if (query.type) {
        let filterCheck = query.type.toLowerCase()
        let typeMap = {
            'mostdownloaded': 1, 'mostliked': 2,
            'trending': 3, 'recent': 4,
            'featured': 6, 'magic': 7,
            'awarded': 11, 'starred': 11,
            'halloffame': 16, 'hof': 16,
            'gdw': 17, 'gdworld': 17
        }
        if (typeMap.hasOwnProperty(filterCheck)) // JIC there's no match
            filters.type = typeMap[filterCheck]
    }

    if (query.hasOwnProperty("user")) {
        let accountCheck = app.userCache(req.id, filters.str)
        filters.type = 5
        if (accountCheck) filters.str = accountCheck[1]
        else if ( !(/^\d*$/).test(filters.str) ) return app.run.profile(app, req, res, null, req.params.text)
    }

    if (query.hasOwnProperty("creators")) filters.type = 12

    let listSize = 10
    if (demonMode || query.gauntlet || query.type == "saved" || ["mappack", "list", "saved"].some(x => query.hasOwnProperty(x))) {
        filters.type = 10
        filters.str = demonMode ? demonList[req.id].list : filters.str.split(",")
        listSize = filters.str.length
        filters.str = filters.str.slice(filters.page*amount, filters.page*amount + amount)
        if (!filters.str.length) return res.sendError(400)
        filters.str = filters.str.map(x => String(Number(x) + (+query.l || 0))).join()
        filters.page = 0
    }

    if (req.isGDPS && filters.diff && !filters.len) filters.len = "-"
    if (filters.str == "*") delete filters.str

    req.gdRequest('getGJLevels21', req.gdParams(filters), function(err, resp, body) {

        if (err) return res.sendError()
        let splitBody = body.split('#')
        let preRes = splitBody[0].split('|')
        let authorList = {}
        let songList = {}
        let authors = splitBody[1].split('|')
        let songs = splitBody[2].split('~:~').map(x => app.parseResponse(`~${x}~`, '~|~'))
        songs.forEach(x => {songList[x['~1']] = x['2']})

        authors.forEach(x => {
            if (x.startsWith('~')) return
            let arr = x.split(':')
            authorList[arr[0]] = [arr[1], arr[2]]
        })

        let levelArray = preRes.map(x => app.parseResponse(x)).filter(x => x[1])
        let parsedLevels = []

        levelArray.forEach((x, y) => {
            let songSearch = songs.find(y => y['~1'] == x[35]) || []

            let level = new Level(x, req.server).getSongInfo(songSearch)
            if (!level.id) return
            level.author = authorList[x[6]] ? authorList[x[6]][0] : "-"
            level.accountID = authorList[x[6]] ? authorList[x[6]][1] : "0"

            if (demonMode) {
                if (!y) level.demonList = req.server.demonList
                level.demonPosition = demonList[req.id].list.indexOf(level.id) + 1
            }

            if (req.isGDPS) level.gdps = (req.onePointNine ? "1.9/" : "") + req.server.id
            if (level.author != "-" && app.config.cacheAccountIDs) app.userCache(req.id, level.accountID, level.playerID, level.author)

            //this is broken if you're not on page 0, blame robtop
            if (filters.page == 0 && y == 0 && splitBody[3]) {
                let pages = splitBody[3].split(":")

                if (filters.gauntlet) {  // gauntlet page stuff
                    level.results = levelArray.length
                    level.pages = 1
                }

                else if (filters.type == 10) {  //  custom page stuff
                    level.results = listSize
                    level.pages = Math.ceil(listSize / (amount || 10))
                }

                else {  // normal page stuff
                    level.results = +pages[0]
                    level.pages = +pages[0] == 9999 ? 1000 : Math.ceil(pages[0] / amount)
                }

            }

            parsedLevels[y] = level
        })

        if (filters.type == 10) parsedLevels = parsedLevels.slice((+filters.page) * amount, (+filters.page + 1) * amount)
        return res.send(parsedLevels)

    })
}
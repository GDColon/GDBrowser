const request = require('request')

module.exports = async (app, req, res) => {

    let info = {error: true, exists: false, artist: { name: "", scouted: false, whitelisted: false }, song: { name: "", externalUse: false, allowed: false } }

    if (app.offline) return res.send(info)

    let songID = req.params.song
    
    request.post('http://boomlings.com/database/testSong.php?songID=' + songID, req.gdParams(), async function(err, resp, body) {
    if (err || !body || body == '-1' || body.startsWith("<!")) return res.send(info)

    request.post(app.endpoint + 'getGJSongInfo.php', req.gdParams({songID: songID}), async function(err2, resp, songAllowed) {
        if (err2 || !songAllowed || songAllowed < 0 || body.startsWith("<!")) return res.send(info)

        let artistInfo = body.split(/<\/?br>/)
        info.artist.name = artistInfo[0].split(": ")[1]
        info.exists = info.artist.name.length > 0
        info.artist.scouted = artistInfo[2].split("is NOT").length == 1
        info.artist.whitelisted = artistInfo[1].split("is NOT").length == 1
        info.song.name = artistInfo[4].split(": ")[1]
        info.song.externalUse = artistInfo[5].split("API NOT").length == 1
        info.song.allowed = songAllowed.length > 15

        delete info.error
        res.send(info)

    })
    })
}
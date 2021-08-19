const request = require('request')

module.exports = async (app, req, res) => {

    // temporary solution until song api is re-enabled

    if (req.offline) return res.send('-1')

    let songID = req.params.song
    req.gdRequest('getGJSongInfo', {songID: songID}, function(err, resp, body) {
        if (err) return res.send('-1')
        else if (body < 0) return res.send(false)
        request.get('https://www.newgrounds.com/audio/listen/' + songID, function(err2, resp2, song) {
            console.log(resp2.statusCode)
            return res.send(resp2.statusCode == 200)
        })
    })
}


    ////////////////////////////////////////////////////
    // RobTop disabled his song checking page soo.... //
    ////////////////////////////////////////////////////

    /* let info = {error: true, exists: false, artist: { name: "", scouted: false, whitelisted: false }, song: { name: "", externalUse: false, allowed: false } }

    if (req.offline) return res.send(info)

    let songID = req.params.song
    let testError = false
    
    request.post('http://boomlings.com/database/testSong.php?songID=' + songID, req.gdParams(), function(err, resp, body) {
    if (err || !body || body == '-1' || body.startsWith("<")) return res.send(info)
    else if (!body.includes("<br>")) testError = true
 
    req.gdRequest('getGJSongInfo', {songID: songID}, function(err2, resp, songAllowed) {
        if (err2 || !songAllowed || songAllowed < 0 || body.startsWith("<")) return res.send(info)

        info.song.allowed = songAllowed.length > 15
        if (testError) return res.send(info)

        let artistInfo = body.split(/<\/?br>/)
        info.artist.name = artistInfo[0].split(": ")[1]
        info.exists = info.artist.name.length > 0
        info.artist.scouted = artistInfo[2].split("is NOT").length == 1
        info.artist.whitelisted = artistInfo[1].split("is NOT").length == 1
        info.song.name = artistInfo[4].split(": ")[1]
        info.song.externalUse = artistInfo[5].split("API NOT").length == 1

        delete info.error
        res.send(info)

    })
    })

} */
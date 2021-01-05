const request = require('request')

let newSong = 732000 // rough estimate of the point when the whitelisted song system was implemented. (around march 1st, 2017)

module.exports = async (app, req, res) => {

    let info = {error: true, exists: false, artist: { name: "", scouted: false, whitelisted: false }, song: { name: "", externalUse: false, allowed: false } }

    if (app.offline) return res.send(info)

    let songID = req.params.song
    
    request.post(app.endpoint + 'testSong.php?songID=' + songID, req.gdParams(), async function(err, resp, body) {
    
        if (err || !body || body == '-1' || body.startsWith("<!")) return res.send(info)

        let artistInfo = body.split(/<\/?br>/)
        info.artist.name = artistInfo[0].split(": ")[1]
        info.exists = info.artist.name.length > 0
        info.artist.scouted = artistInfo[2].split("is NOT").length == 1
        info.artist.whitelisted = artistInfo[1].split("is NOT").length == 1
        info.song.name = artistInfo[4].split(": ")[1]
        info.song.externalUse = artistInfo[5].split("API NOT").length == 1
        info.song.allowed = info.artist.scouted && info.song.externalUse && (+songID > newSong ? info.artist.whitelisted : true)

        delete info.error
        res.send(info)

    })
}
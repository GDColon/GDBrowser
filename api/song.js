const request = require('request')

module.exports = async (app, req, res) => {

    // temporary solution until song api is re-enabled

    if (req.offline) return res.send('-1')

    let songID = req.params.song
    req.gdRequest('getGJSongInfo', {songID: songID}, function(err, resp, body) {
        if (err) return res.send('-1')
        else if (body < 0) return res.send(false)
        request.get('https://www.newgrounds.com/audio/listen/' + songID, function(err2, resp2, song) {
            return res.send(resp2.statusCode == 200)
        })
    })
}
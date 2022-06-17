"use strict";
module.exports = async (app, req, res) => {

    if (req.offline) return res.sendError()

    let songID = req.params.song
    req.gdRequest('getGJSongInfo', {songID: songID}, function(err, resp, body) {
        return err ?
            res.sendError(400) :
            res.send(!body.startsWith("-") && body.length > 10)
    })
}
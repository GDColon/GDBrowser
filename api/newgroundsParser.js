const request = require('request');

// Newgrounds creators can disable song downloading, this bypasses that.
var getSongURL = (songID) => {
    return new Promise((resolve, reject) => {
        request
            .get('https://www.newgrounds.com/audio/listen/' + songID, (err, response, body) => {
                var match = body.match(/https(.*?).mp3/)[1];
                if (!match) return reject();
                resolve(`https${match}.mp3`);
            });
    });
};

module.exports = { getSongURL };
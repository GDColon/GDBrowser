const fs = require('fs');
const http = require('http');
const {
    fork
} = require('child_process');
const {
    port
} = require('./settings.js');
const server = fork('./index.js');
let status = false; // Will be true if everything is ok

server.once('message', async () => {
    // Test levels
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/level/4284013',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                // get resposne JSON
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const json = JSON.parse(data);
                    if (json.id == 4284013) {
                        console.log('LEVEL GET OK');
                        r();
                    } else {
                        console.log('LEVEL GET FAILED: ID is different');
                        r();
                    }
                });
            } else {
                console.log('LEVEL GET FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    // Test profiles
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/profile/robtop',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                // get resposne JSON
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const json = JSON.parse(data);
                    if (json.username.toLowerCase() == 'robtop') {
                        console.log('PROFILE GET OK');
                        r();
                    } else {
                        console.log('PROFILE GET FAILED: Username is different');
                        r();
                    }
                });
            } else {
                console.log('PROFILE GET FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    // Test searching for 2xx status code, using a bunch of queries to thoroughly test the search. Shamelessly using the examples from the documentation.
    // Requests are: /api/search/abc, /api/search/zodiac?diff=-2&demonFilter=5, /api/search/186646,13519,55520?list=1, /api/search/*?diff=-3, /api/search/*?type=trending&noStar, /api/search/*?gauntlet=3
    console.log('Search: ');
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/search/abc',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - GENERAL SEARCH OK');
                r();
            } else {
                console.log(' - GENERAL SEARCH FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/search/zodiac?diff=-2&demonFilter=5',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - SEARCH w/ DIFFICULTY + DEMON DIFFICULTY OK');
                r();
            } else {
                console.log(' - SEARCH w/ DIFFICULTY + DEMON DIFFICULTY FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/search/186646,13519,55520?list=1',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - SEARCH w/ LIST OK');
                r();
            } else {
                console.log(' - SEARCH FOR DEMON PACK 3 FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/search/*?diff=-3',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - SEARCH w/ DIFFICULTY OK');
                r();
            } else {
                console.log(' - SEARCH w/ DIFFICULTY FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/search/*?type=trending&noStar',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - SEARCH w/ TYPE + GENERIC FILTER OK');
                r();
            } else {
                console.log(' - SEARCH w/ TYPE + GENERIC FILTER FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/search/*?gauntlet=3',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - SEARCH w/ GAUNTLET OK');
                r();
            } else {
                console.log(' - SEARCH w/ GAUNTLET FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    // Test leaderboards, /api/leaderboard?count=10 and /api/leaderboard?creator&count=250 (sort top 10 players and top 250 creators, respectively)
    console.log('Leaderboards: ');
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/leaderboard?count=10',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - LEADERBOARD w/ PLAYERS OK');
                r();
            } else {
                console.log(' - LEADERBOARD w/ PLAYERS FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/leaderboard?creator&count=250',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - LEADERBOARD w/ CREATORS OK');
                r();
            } else {
                console.log(' - LEADERBOARD w/ CREATORS FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    // Test map packs, /api/mappacks
    console.log('Map Packs: ');
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/mappacks',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - MAP PACKS OK');
                r();
            } else {
                console.log(' - MAP PACKS FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    // Test level leaderboards, /api/leaderboardLevel/1063115
    console.log('Level Leaderboards: ');
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/leaderboardLevel/1063115',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - LEVEL LEADERBOARD OK');
                r();
            } else {
                console.log(' - LEVEL LEADERBOARD FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    // Test comments/profile posts, /api/comments/26681070?top, /api/comments/16?type=commentHistory, /api/comments/4170784?type=profile (top comments, comment history, and profile comments)
    console.log('Comments: ');
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/comments/26681070?top',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - TOP COMMENTS OK');
                r();
            } else {
                console.log(' - TOP COMMENTS FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/comments/16?type=commentHistory',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - COMMENT HISTORY OK');
                r();
            } else {
                console.log(' - COMMENT HISTORY FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/comments/4170784?type=profile',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log(' - PROFILE COMMENTS OK');
                r();
            } else {
                console.log(' - PROFILE COMMENTS FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    console.log('POST requests are not tested because they would be annoying to remove from the system unless you have 1337 h4x0r skills');
    // Test song verification, /api/song/661012. We also check if data returned is true, which is the only thing that should be returned.
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/song/661012',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log('SONG VERIFICATION OK');
                r();
            } else {
                console.log('SONG VERIFICATION FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    // test level analysis, /api/analyze/27732941
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/api/analyze/27732941',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log('LEVEL ANALYSIS OK');
                r();
            } else {
                console.log('LEVEL ANALYSIS FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
    // Ideally, I would test all of these individually, but it's easier to do one singular test. Plus I need sleep.
    // Testing icons /icon/colon?icon=98&col1=40&col2=12&glow=0
    await new Promise(r => {
        http.request({
            hostname: 'localhost',
            port,
            path: '/icon/colon?icon=98&col1=40&col2=12&glow=0',
            method: 'GET'
        }).end().once('response', (res) => {
            if (res.statusCode == 200) {
                console.log('ICON OK');
                r();
            } else {
                console.log('ICON FAILED: HTTP status code is not 200');
                r();
            }
        });
    });
});
let error = false;
server.on('error', (err) => {
    console.log('Script error: \n', err);
    error = true;
});

server.on('disconnect', () => {
    if (!error && !status) {
        console.log('Script error: \n', 'Server script child process disconnected prematurely. Good luck, I can\'t help you with this one.');
    }
});

process.on('uncaughtException', (e) => {
    // If this script crashes, it kills the child process instantly, and makes my pc think that it's still listening; so I'm going to end it gracefully instead.
    server.disconnect();
    console.error(e);
    process.exit(1);
});
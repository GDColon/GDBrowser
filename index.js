const express = require('express');
const path = require('path');
const fs = require("fs")
const timeout = require('connect-timeout')

let api = true;
let gdicons = fs.readdirSync('./icons/iconkit')


const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(timeout('25s'));
app.use(haltOnTimedout)
app.use(require('cookie-parser')());
if (process.env.NODE_ENV !== 'production') // Avoid extra bytes in production
  app.set('json spaces', 2);

const secrets = require("./misc/secretStuff.json")
app.modules = require("./misc/loadModules.js")();

app.secret = require('./misc/boomlingsSecret.js');
app.id = secrets.id
app.gjp = secrets.gjp

function haltOnTimedout (req, res, next) {
  if (!req.timedout) next()
}

app.parseResponse = function (responseBody, splitter) {
  if (!responseBody) return {};
  let response = responseBody.split('#')[0].split(splitter || ':');
  let res = {};
  for (let i = 0; i < response.length; i += 2) {
    res[response[i]] = response[i + 1];
  }
  return res;
}

console.log("Site online!");

/*
Using this middleware twice is small brain but it'll have to do until every file
not in a nested directory is moved to a nested directory.
*/
const assetsMiddleware = express.static('./assets');
app.use('/assets', assetsMiddleware);
app.use(assetsMiddleware);
app.get("/assets/:file", function (req, res) {
  fs.exists("./assets/" + req.params.file, function (exists) {
    if (exists) {res.status(200).sendFile(path.join(__dirname, "/assets/" + req.params.file));
    }})
})

app.get("/objects/:file", function (req, res) {
  fs.exists("./assets/objects/" + req.params.file, function (exists) {
    if (exists) {res.status(200).sendFile(path.join(__dirname, "/assets/objects/" + req.params.file));
    }})
})

app.get("/blocks/:file", function (req, res) {
  fs.exists("./assets/blocks/" + req.params.file, function (exists) {
    if (exists) {res.status(200).sendFile(path.join(__dirname, "/assets/blocks/" + req.params.file));
    }})
})

app.get("/gauntlets/:file", function (req, res) {
  fs.exists("./assets/gauntlets/" + req.params.file, function (exists) {
    if (exists) {res.status(200).sendFile(path.join(__dirname, "/assets/gauntlets/" + req.params.file));
    }})
})

app.get("/difficulty/:file", function (req, res) {
  fs.exists("./assets/gdfaces/" + req.params.file, function (exists) {
    if (exists) {res.status(200).sendFile(path.join(__dirname, "/assets/gdfaces/" + req.params.file));
    }})
})

app.get("/iconkitbuttons/:file", function (req, res) {
  fs.exists("./assets/iconkitbuttons/" + req.params.file, function (exists) {
    if (exists) {res.status(200).sendFile(path.join(__dirname, "/assets/iconkitbuttons/" + req.params.file));
    }})
})

app.get("/gdicon/:file", function (req, res) {
  fs.exists("./icons/iconkit/" + req.params.file, function (exists) {
    if (exists) {res.status(200).sendFile(path.join(__dirname, "/icons/iconkit/" + req.params.file));
    }})
})

app.get("/api", function(req, res) {
  res.sendFile(__dirname + "/html/api.html")
})   

app.get("/gauntlets", function(req, res) {
  res.sendFile(__dirname + "/html/gauntlets.html")
})   

app.get("/mappacks", function(req, res) {
  res.sendFile(__dirname + "/html/mappacks.html")
})   

app.get("/search", function(req, res) {
  res.sendFile(__dirname + "/html/filters.html")
})   

app.get("/leaderboard", function(req, res) {
  res.sendFile(__dirname + "/html/leaderboard.html")
}) 

app.get("/profile/:id", function(req, res) {
  app.modules.profile(app, req, res)
})  

app.get("/comments/:id", function(req, res) {
  res.sendFile(__dirname + "/html/comments.html")
})  

app.get("/search/:text", function(req, res) {
  res.sendFile(__dirname + "/html/search.html")
}) 

app.get("/analyze/:id", async function(req, res) {
  res.sendFile(__dirname + "/html/analyze.html")
})    

app.get("/icon/:text", function(req, res) {
  app.modules.icon(app, req, res)
})

app.get("/iconkit/:text", function(req, res) {
  app.modules.icon(app, req, res)
})

app.get("/api/level/:id", async function(req, res) {
  app.modules.level(app, req, res, api)
})    

app.get("/api/analyze/:id", async function(req, res) {
  app.modules.level(app, req, res, api, true)
})    

app.get("/api/profile/:id", function(req, res) {
  app.modules.profile(app, req, res, api)
})  

app.get("/api/comments/:id", function(req, res) {
  app.modules.comments(app, req, res, api)
})    

app.get("/api/search/:text", function(req, res) {
  app.modules.search(app, req, res, api)
})   

app.get("/api/leaderboardLevel/:id", function(req, res) {
  app.modules.leaderboardLevel(app, req, res, api)
})   

app.get("/api/leaderboard", function(req, res, api) {
  if (req.query.hasOwnProperty("accurate")) app.modules.accurateLeaderboard(app, req, res)
  else return app.modules.leaderboard(app, req, res)
})   

app.get("/api/mappacks", async function(req, res) {
  res.send(require('./misc/mapPacks.json'))
})

app.get("/iconkit", function(req, res) {
  res.sendFile(__dirname + "/html/iconkit.html")
})

app.get("/icon", function(req, res) {
  res.sendFile(__dirname + "/html/iconkit.html")
})

app.get('/api/icons', function(req, res) {
  res.send(gdicons);
});

app.get("/api/:anythingelse", async function(req, res) {
  res.send('-1')
})    

app.get("/:id", function(req, res) {
  app.modules.level(app, req, res)
})    

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/html/home.html")
})    

app.get('*', function(req, res) {
  res.redirect('/search/404%20')
});

app.listen(2000); 
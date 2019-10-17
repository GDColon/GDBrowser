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
app.set('json spaces', 2)

app.modules = {}
fs.readdirSync('./api').forEach(x => {
  app.modules[x.split('.')[0]] = require('./api/' + x)
})

app.secret = 'Wmfd2893gb7'

const secrets = require("./misc/secretStuff.json")
app.id = secrets.id
app.gjp = secrets.gjp
//these are the only two things in secretStuff.json, both are only used for level leaderboards

function haltOnTimedout (req, res, next) {
  if (!req.timedout) next()
}

app.parseResponse = function (responseBody, splitter) {
  if (!responseBody) return {};
  let response = responseBody.split('#')[0].split(splitter || ':');
  let res = {};
  for (let i = 0; i < response.length; i += 2) {
  res[response[i]] = response[i + 1]}
  return res  }

//xss bad
app.clean = function(text) {if (typeof text != "string") return text; else return text.replace(/&/g, "&#38;").replace(/</g, "&#60;").replace(/>/g, "&#62;").replace(/=/g, "&#61;").replace(/"/g, "&#34;").replace(/'/g, "&#39;")}

console.log("Site online!")

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

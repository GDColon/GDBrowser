const express = require('express');
const fs = require("fs")
const timeout = require('connect-timeout')
const compression = require('compression');
const rateLimit = require("express-rate-limit");

// set to false if you're using gdbrowser locally, for obvious reasons
let useRateLimiting = true

const app = express();
app.offline = false  // set to true to go into "offline" mode (in case of ip ban from rob)
app.secret = "Wmfd2893gb7" // lol

app.config = require('./gdpsConfig')  // tweak settings in this file if you're using a GDPS
app.endpoint = app.config.endpoint  // boomlings.com/database/

app.gdParams = function(obj={}) {
  Object.keys(app.config.params).forEach(x => { if (!obj[x]) obj[x] = app.config.params[x] })
  return obj
}

const RL = rateLimit({
  windowMs: useRateLimiting ? 5 * 60 * 1000 : 0,
  max: useRateLimiting ? 100 : 0, // max requests per 5 minutes
  message: "Rate limited ¯\\_(ツ)_/¯",
  keyGenerator: function(req) { return req.headers['x-real-ip'] },
  skip: function(req) { return ((req.url.includes("api/level") && !req.query.hasOwnProperty("download")) ? true : false) }
})

let api = true;
let gdIcons = fs.readdirSync('./icons/iconkit')
let sampleIcons = require('./misc/sampleIcons.json')

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(timeout('30s'));
app.use(haltOnTimedout)
app.set('json spaces', 2)

let directories = ["", "post", "messages"] //this can probably be automated but i'm lazy

app.run = {}
directories.forEach(d => {
  fs.readdirSync('./api/' + d).forEach(x => {if (x.includes('.')) app.run[x.split('.')[0]] = require('./api/' + d + "/" + x) })
})

function haltOnTimedout (req, res, next) {
  if (!req.timedout) next()
}

try {
  const secrets = require("./misc/secretStuff.json")
  app.id = secrets.id
  app.gjp = secrets.gjp
  app.sheetsKey = secrets.sheetsKey
  if (app.id == "account id goes here" || app.gjp == "account gjp goes here") console.warn("Warning: No account ID and/or GJP has been provided in secretStuff.json! These are required for level leaderboards to work.")
  if (app.sheetsKey.startsWith("google sheets api key")) app.sheetsKey = undefined
}

catch(e) {
  app.id = 0
  app.gjp = 0
  console.warn("Warning: secretStuff.json has not been created! These are required for level leaderboards to work.")
}

app.parseResponse = function (responseBody, splitter) {
  if (!responseBody || responseBody == "-1") return {};
  let response = responseBody.split('#')[0].split(splitter || ':');
  let res = {};
  for (let i = 0; i < response.length; i += 2) {
  res[response[i]] = response[i + 1]}
  return res  }

//xss bad
app.clean = function(text) {if (!text || typeof text != "string") return text; else return text.replace(/&/g, "&#38;").replace(/</g, "&#60;").replace(/>/g, "&#62;").replace(/=/g, "&#61;").replace(/"/g, "&#34;").replace(/'/g, "&#39;")}


// ASSETS

let assets = ['css', 'assets', 'blocks', 'deatheffects', 'difficulty', 'gauntlets', 'gdicon', 'iconkitbuttons', 'levelstyle', 'objects']
app.use('/css', express.static(__dirname + '/assets/css'));
app.use('/assets', express.static(__dirname + '/assets', {maxAge: "7d"}));
app.use('/blocks', express.static(__dirname + '/assets/blocks', {maxAge: "7d"}));
app.use('/deatheffects', express.static(__dirname + '/assets/deatheffects', {maxAge: "7d"}));
app.use('/difficulty', express.static(__dirname + '/assets/gdfaces', {maxAge: "7d"}));
app.use('/gauntlets', express.static(__dirname + '/assets/gauntlets', {maxAge: "7d"}));
app.use('/gdicon', express.static(__dirname + '/icons/iconkit', {maxAge: "7d"}));
app.use('/iconkitbuttons', express.static(__dirname + '/assets/iconkitbuttons', {maxAge: "7d"}));
app.use('/levelstyle', express.static(__dirname + '/assets/initial', {maxAge: "7d"}));
app.use('/objects', express.static(__dirname + '/assets/objects', {maxAge: "7d"}));


// POST REQUESTS

app.post("/like", RL, function(req, res) { app.run.like(app, req, res) })  
app.post("/postComment", RL, function(req, res) { app.run.postComment(app, req, res) })  
app.post("/postProfileComment", RL, function(req, res) { app.run.postProfileComment(app, req, res) })  

app.post("/messages", RL, async function(req, res) { app.run.getMessages(app, req, res) })
app.post("/messages/:id", RL, async function(req, res) { app.run.fetchMessage(app, req, res) })
app.post("/deleteMessage", RL, function(req, res) { app.run.deleteMessage(app, req, res) })  
app.post("/sendMessage", RL, function(req, res) { app.run.sendMessage(app, req, res) })  

app.post("/accurateLeaderboard", function(req, res) { app.run.accurateLeaderboard(app, req, res, true) })


// HTML

app.get("/", function(req, res) { 
  if (app.offline && !req.query.hasOwnProperty("home")) res.sendFile(__dirname + "/html/offline.html")
  else res.sendFile(__dirname + "/html/home.html")
})   

app.get("/analyze/:id", async function(req, res) { res.sendFile(__dirname + "/html/analyze.html") })
app.get("/api", function(req, res) { res.sendFile(__dirname + "/html/api.html") })
app.get("/comments/:id", function(req, res) { res.sendFile(__dirname + "/html/comments.html") })
app.get("/gauntlets", function(req, res) { res.sendFile(__dirname + "/html/gauntlets.html") })
app.get("/iconkit", function(req, res) { res.sendFile(__dirname + "/html/iconkit.html") })
app.get("/leaderboard", function(req, res) { res.sendFile(__dirname + "/html/leaderboard.html") })
app.get("/leaderboard/:text", function(req, res) { res.sendFile(__dirname + "/html/levelboard.html") })
app.get("/mappacks", function(req, res) { res.sendFile(__dirname + "/html/mappacks.html") })
app.get("/messages", function(req, res) { res.sendFile(__dirname + "/html/messages.html") })
app.get("/search", function(req, res) { res.sendFile(__dirname + "/html/filters.html") })
app.get("/search/:text", function(req, res) { res.sendFile(__dirname + "/html/search.html") })


// API

app.get("/api/analyze/:id", RL, async function(req, res) { app.run.level(app, req, res, api, true) })
app.get("/api/comments/:id", function(req, res) { app.run.comments(app, req, res) })
app.get("/api/credits", function(req, res) { res.send(require('./misc/credits.json')) })
app.get("/api/leaderboard", function(req, res) { app.run[req.query.hasOwnProperty("accurate") ? "accurateLeaderboard" : "leaderboard"](app, req, res) })
app.get("/api/leaderboardLevel/:id", RL, function(req, res) { app.run.leaderboardLevel(app, req, res) })
app.get("/api/level/:id", RL, async function(req, res) { app.run.level(app, req, res, api) })
app.get("/api/mappacks", async function(req, res) { res.send(require('./misc/mapPacks.json')) })
app.get("/api/profile/:id", function(req, res) { app.run.profile(app, req, res, api) })
app.get("/api/search/:text", function(req, res) { app.run.search(app, req, res) })
 

// REDIRECTS

app.get("/icon", function(req, res) { res.redirect('/iconkit') })
app.get("/iconkit/:text", function(req, res) { res.redirect('/icon/' + req.params.text) })
app.get("/obj/:text", function(req, res) { res.redirect('/obj/' + req.params.text) })
app.get("/leaderboards/:id", function(req, res) { res.redirect('/leaderboard/' + req.params.id) })
app.get("/profile/:id", function(req, res) { res.redirect('/u/' + req.params.id) })
app.get("/p/:id", function(req, res) { res.redirect('/u/' + req.params.id) })
app.get("/l/:id", function(req, res) { res.redirect('/leaderboard/' + req.params.id) })
app.get("/a/:id", function(req, res) { res.redirect('/analyze/' + req.params.id) })
app.get("/c/:id", function(req, res) { res.redirect('/comments/' + req.params.id) })


// API AND HTML
   
app.get("/u/:id", function(req, res) { app.run.profile(app, req, res) })
app.get("/:id", function(req, res) { app.run.level(app, req, res) }) 


// MISC

app.get("/assets/sizecheck.js", function(req, res) { res.sendFile(__dirname + "/misc/sizecheck.js") }) 
app.get("/icon/:text", function(req, res) { app.run.icon(app, req, res) })
app.get("/object/:text", function(req, res) { app.run.object(app, req, res) })
app.get('/api/icons', function(req, res) { 
  let sample = [JSON.stringify(sampleIcons[Math.floor(Math.random() * sampleIcons.length)].slice(1))]
  res.send(gdIcons.concat(sample)); 
});

app.get('*', function(req, res) {
  if (req.path.startsWith('/api')) res.send('-1')
  if (assets.some(x => req.path.startsWith("/" + x))) res.send("Looks like this file doesn't exist ¯\\_(ツ)_/¯<br>You can check out all of the assets on <a target='_blank' href='https://github.com/GDColon/GDBrowser/tree/master/assets'>GitHub</a>")
  else res.redirect('/search/404%20')
});

app.listen(2000, () => console.log("Site online!"))
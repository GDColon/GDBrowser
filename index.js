const express = require('express');
const fs = require("fs")
const compression = require('compression');
const timeout = require('connect-timeout')
const rateLimit = require("express-rate-limit");
const app = express();

app.offline = false  // set to true to go into "offline" mode (in case of ip ban from rob)
app.config = require('./settings')  // tweak settings in this file if you're using a GDPS
app.endpoint = app.config.endpoint  // default is boomlings.com/database/
app.accountCache = {} // account IDs are cached here to shave off requests to getgjusers

let rlMessage = "Rate limited ¯\\_(ツ)_/¯<br><br>Please do not spam my servers with a crazy amount of requests. It slows things down on my end and stresses RobTop's servers just as much." +
" If you really want to send a zillion requests for whatever reason, please download the GDBrowser repository locally - or even just send the request directly to the GD servers.<br><br>" +
"This kind of spam usually leads to GDBrowser getting IP banned by RobTop, and every time that happens I have to start making the rate limit even stricter. Please don't be the reason for that.<br><br>" +
"(also, keep in mind that most endpoints have a ?count parameter that let you fetch a LOT more stuff in just one request)"

const RL = rateLimit({
  windowMs: app.config.rateLimiting ? 5 * 60 * 1000 : 0,
  max: app.config.rateLimiting ? 100 : 0, // max requests per 5 minutes
  message: rlMessage,
  keyGenerator: function(req) { return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] },
  skip: function(req) { return ((req.url.includes("api/level") && !req.query.hasOwnProperty("download")) ? true : false) }
})

const RL2 = rateLimit({
  windowMs: app.config.rateLimiting ? 2 * 60 * 1000 : 0,
  max: app.config.rateLimiting ? 200 : 0, // max requests per 1 minute
  message: rlMessage,
  keyGenerator: function(req) { return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] }
})

let api = true;
let gdIcons = fs.readdirSync('./icons/iconkit')
let sampleIcons = require('./misc/sampleIcons.json')

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(timeout('20s'));
app.set('json spaces', 2)

app.use(function(req, res, next) {
  req.gdParams = function(obj={}) {
    Object.keys(app.config.params).forEach(x => { if (!obj[x]) obj[x] = app.config.params[x] })
    let ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']
    return {form: obj, headers: app.config.ipForwarding && ip ? {'x-forwarded-for': ip, 'x-real-ip': ip} : {}}
  }
  next()
})

let directories = [""]
fs.readdirSync('./api').filter(x => !x.includes(".")).forEach(x => directories.push(x))

app.run = {}
directories.forEach(d => {
  fs.readdirSync('./api/' + d).forEach(x => {if (x.includes('.')) app.run[x.split('.')[0]] = require('./api/' + d + "/" + x) })
})

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

let assets = ['css', 'assets', 'blocks', 'boomlings', 'deatheffects', 'difficulty', 'gauntlets', 'gdicon', 'iconkitbuttons', 'levelstyle', 'objects', 'trophies']
app.use('/css', express.static(__dirname + '/assets/css'));
app.use('/assets', express.static(__dirname + '/assets', {maxAge: "7d"}));
app.use('/blocks', express.static(__dirname + '/assets/blocks', {maxAge: "7d"}));
app.use('/boomlings', express.static(__dirname + '/assets/boomlings', {maxAge: "7d"}));
app.use('/deatheffects', express.static(__dirname + '/assets/deatheffects', {maxAge: "7d"}));
app.use('/difficulty', express.static(__dirname + '/assets/gdfaces', {maxAge: "7d"}));
app.use('/gauntlets', express.static(__dirname + '/assets/gauntlets', {maxAge: "7d"}));
app.use('/gdicon', express.static(__dirname + '/icons/iconkit', {maxAge: "7d"}));
app.use('/iconkitbuttons', express.static(__dirname + '/assets/iconkitbuttons', {maxAge: "7d"}));
app.use('/levelstyle', express.static(__dirname + '/assets/initial', {maxAge: "7d"}));
app.use('/objects', express.static(__dirname + '/assets/objects', {maxAge: "7d"}));
app.use('/trophies', express.static(__dirname + '/assets/trophies', {maxAge: "7d"}));


// POST REQUESTS

app.post("/like", RL, function(req, res) { app.run.like(app, req, res) })  
app.post("/postComment", RL, function(req, res) { app.run.postComment(app, req, res) })  
app.post("/postProfileComment", RL, function(req, res) { app.run.postProfileComment(app, req, res) })  

app.post("/messages", RL, async function(req, res) { app.run.getMessages(app, req, res) })
app.post("/messages/:id", RL, async function(req, res) { app.run.fetchMessage(app, req, res) })
app.post("/deleteMessage", RL, function(req, res) { app.run.deleteMessage(app, req, res) })  
app.post("/sendMessage", RL, function(req, res) { app.run.sendMessage(app, req, res) })  

app.post("/accurateLeaderboard", function(req, res) { app.run.accurate(app, req, res, true) })


// HTML

app.get("/", function(req, res) { 
  if (app.offline && !req.query.hasOwnProperty("home")) res.sendFile(__dirname + "/html/offline.html")
  else res.sendFile(__dirname + "/html/home.html")
})   

app.get("/analyze/:id", async function(req, res) { res.sendFile(__dirname + "/html/analyze.html") })
app.get("/api", function(req, res) { res.sendFile(__dirname + "/html/api.html") })
app.get("/boomlings", function(req, res) { res.sendFile(__dirname + "/html/boomlings.html") })
app.get("/comments/:id", function(req, res) { res.sendFile(__dirname + "/html/comments.html") })
app.get("/demon/:id", function(req, res) { res.sendFile(__dirname + "/html/demon.html") })
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
app.get("/api/boomlings", function(req, res) { app.run.boomlings(app, req, res) })
app.get("/api/comments/:id", RL2, function(req, res) { app.run.comments(app, req, res) })
app.get("/api/credits", function(req, res) { res.send(require('./misc/credits.json')) })
app.get("/api/leaderboard", function(req, res) { app.run[req.query.hasOwnProperty("accurate") ? "accurate" : "scores"](app, req, res) })
app.get("/api/leaderboardLevel/:id", RL2, function(req, res) { app.run.leaderboardLevel(app, req, res) })
app.get("/api/level/:id", RL, async function(req, res) { app.run.level(app, req, res, api) })
app.get("/api/mappacks", async function(req, res) { app.run.mappack(app, req, res) })
app.get("/api/profile/:id", RL2, function(req, res) { app.run.profile(app, req, res, api) })
app.get("/api/search/:text", RL2, function(req, res) { app.run.search(app, req, res) })
 

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
app.get("/d/:id", function(req, res) { res.redirect('/demon/' + req.params.id) })


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

app.use(function (err, req, res, next) {
  if (err && err.message == "Response timeout") res.status(500).send('Internal server error! (Timed out)')
})

app.listen(2000, () => console.log("Site online!"))
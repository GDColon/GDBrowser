const express = require('express');
const request = require('request');
const compression = require('compression');
const timeout = require('connect-timeout');
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const app = express();

let serverList = require('./servers.json')
let pinnedServers = serverList.filter(x => x.pinned)
let notPinnedServers = serverList.filter(x => !x.pinned).sort((a, b) => a.name.localeCompare(b.name))

app.servers = pinnedServers.concat(notPinnedServers)
app.safeServers = JSON.parse(JSON.stringify(app.servers)) // clone
app.safeServers.forEach(x => { delete x.endpoint; delete x.substitutions; delete x.overrides; delete x.disabled })
app.config = require('./settings.js')

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

let forms = { "player": "cube", "bird": "ufo", "dart": "wave" }
let colorOrder = [0, 1, 2, 3, 16, 4, 5, 6, 13, 7, 8, 9, 29, 10, 14, 11, 12, 17, 18, 15, 27, 32, 28, 38, 20, 33, 21, 34, 22, 39, 23, 35, 24, 36, 25, 37, 30, 26, 31, 19, 40, 41]

let XOR = require('./classes/XOR.js');
let sampleIcons = require('./misc/sampleIcons.json')
let achievements = require('./misc/achievements.json')
let achievementTypes = require('./misc/achievementTypes.json')
let shopIcons = require('./misc/shops.json')
let music = require('./misc/music.json')

let colorList = JSON.parse(fs.readFileSync('./misc/icons/colors.json', 'utf8')) // need a clone of this
let assetPage = fs.readFileSync('./html/assets.html', 'utf8')
let gdIcons = fs.readdirSync('./assets/previewicons')
let whiteIcons = fs.readdirSync('./icons').filter(x => x.endsWith("extra_001.png")).map(function (x) { let xh = x.split("_"); return [xh[1] == "ball" ? "ball" : forms[xh[0]] || xh[0], +xh[xh[1] == "ball" ? 2 : 1]]})

app.accountCache = {}
app.lastSuccess = {}
app.actuallyWorked = {}

app.servers.forEach(x => {
  app.accountCache[x.id || "gd"] = {}
  app.lastSuccess[x.id || "gd"] = Date.now()
})
app.mainEndpoint = app.servers.find(x => !x.id).endpoint // boomlings.com unless changed in fork

app.set('json spaces', 2)
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(timeout('20s'));

app.use(async function(req, res, next) {

  let subdomains = req.subdomains.map(x => x.toLowerCase())
  if (!subdomains.length) subdomains = [""]
  req.server = app.servers.find(x => subdomains.includes(x.id.toLowerCase()))
  if (subdomains.length > 1 || !req.server) return res.redirect("http://" + req.get('host').split(".").slice(subdomains.length).join(".") + req.originalUrl)

  // literally just for convenience
  req.offline = req.server.offline
  req.endpoint = req.server.endpoint
  req.onePointNine = req.server.onePointNine
  req.timestampSuffix = req.server.timestampSuffix || ""
  req.id = req.server.id || "gd"
  req.isGDPS = req.server.endpoint != app.mainEndpoint

  if (req.isGDPS) res.set("gdps", (req.onePointNine ? "1.9/" : "") + req.id)
  if (req.query.online > 0) req.offline = false

  req.gdParams = function(obj={}, substitute=true) {
    Object.keys(app.config.params).forEach(x => { if (!obj[x]) obj[x] = app.config.params[x] })
    Object.keys(req.server.extraParams || {}).forEach(x => { if (!obj[x]) obj[x] = req.server.extraParams[x] })
    let ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']
    let params = {form: obj, headers: app.config.ipForwarding && ip ? {'x-forwarded-for': ip, 'x-real-ip': ip} : {}}

    if (substitute) { // GDPS substitutions in settings.js
      for (let ss in req.server.substitutions) {
        if (params.form[ss]) { params.form[req.server.substitutions[ss]] = params.form[ss]; delete params.form[ss] }
      }
    }
    return params
  }

  req.gdRequest = function(target, params={}, cb=function(){}) {
    if (!target) return cb(true)
    target = req.server.overrides ? (req.server.overrides[target] || target) : target
    let parameters = params.headers ? params : req.gdParams(params)
    let endpoint = req.endpoint
    if (params.forceGD || (params.form && params.form.forceGD)) endpoint = "http://www.boomlings.com/database/"
    request.post(endpoint + target + '.php', parameters, function(err, res, body) {
      let error = err
      if (!error && (err || !body || body.match(/^-\d$/) || body.startsWith("error") || body.startsWith("<"))) {
        error = {serverError: true, response: body}
      }
      return cb(error, res, body)
    })
  }

  next()
})

let directories = [""]
fs.readdirSync('./api').filter(x => !x.includes(".")).forEach(x => directories.push(x))

app.trackSuccess = function(id) {
  app.lastSuccess[id] = Date.now()
  if (!app.actuallyWorked[id]) app.actuallyWorked[id] = true
}

app.timeSince = function(id, time) {
  if (!time) time = app.lastSuccess[id]
  let secsPassed = Math.floor((Date.now() - time) / 1000)
  let minsPassed = Math.floor(secsPassed / 60)
  secsPassed -= 60 * minsPassed;
  return `${app.actuallyWorked[id] ? "" : "~"}${minsPassed}m ${secsPassed}s`
}

app.userCache = function(id, accountID, playerID, name) {
  if (!accountID || accountID == "0" || !app.config.cacheAccountIDs) return
  if (!playerID) return app.accountCache[id][accountID.toLowerCase()]
  let cacheStuff = [accountID, playerID, name]
  app.accountCache[id][name.toLowerCase()] = cacheStuff
  return cacheStuff
}

app.run = {}
directories.forEach(d => {
  fs.readdirSync('./api/' + d).forEach(x => {if (x.includes('.')) app.run[x.split('.')[0]] = require('./api/' + d + "/" + x) })
})

app.xor = new XOR()
let hasSecretStuff = false

try {
  const secrets = require("./misc/secretStuff.json")
  hasSecretStuff = true
  app.id = secrets.id
  app.gjp = secrets.gjp || app.xor.encrypt(secrets.password)
  app.sheetsKey = secrets.sheetsKey
  if (!Number(app.id) || (!secrets.password && !secrets.gjp) || (secrets.password || secrets.gjp).includes("delete this line")) console.warn("Warning: No account ID and/or password has been provided in secretStuff.json! These are required for level leaderboards to work.")
  if (app.sheetsKey.includes("google sheets api key")) app.sheetsKey = undefined
}

catch(e) {
  app.id = 0
  app.gjp = 0
  if (!hasSecretStuff) console.warn("Warning: secretStuff.json has not been created! This file is required for level leaderboards to work.")
  else { console.warn("There was an error parsing your secretStuff.json file!"); console.error(e) }
}

app.parseResponse = function (responseBody, splitter=":") {
  if (!responseBody || responseBody == "-1") return {};
  if (responseBody.startsWith("\nWarning:")) responseBody = responseBody.split("\n").slice(2).join("\n").trim() // GDPS'es are wild
  if (responseBody.startsWith("<br />")) responseBody = responseBody.split("<br />").slice(2).join("<br />").trim() // Seriously screw this
  let response = responseBody.split('#')[0].split(splitter);
  let res = {};
  for (let i = 0; i < response.length; i += 2) {
  res[response[i]] = response[i + 1]}
  return res  
}

//xss bad
app.clean = function(text) {if (!text || typeof text != "string") return text; else return text.replace(/&/g, "&#38;").replace(/</g, "&#60;").replace(/>/g, "&#62;").replace(/=/g, "&#61;").replace(/"/g, "&#34;").replace(/'/g, "&#39;")}

// ASSETS

app.use('/assets', express.static(__dirname + '/assets', {maxAge: "7d"}));
app.use('/assets/css', express.static(__dirname + '/assets/css')); // override maxAge

app.get("/sizecheck.js", function(req, res) { res.sendFile(__dirname + "/misc/sizecheck.js") })
app.get("/dragscroll.js", function(req, res) { res.sendFile(__dirname + "/misc/dragscroll.js") })

app.get("/assets/:dir*?", function(req, res) {
  let main = (req.params.dir || "").toLowerCase()
  let dir = main + (req.params[0] || "").toLowerCase()

  if (dir.includes('.') || !req.path.endsWith("/")) {
    if (!req.params[0]) main = ""
    if (req.params.dir == "deatheffects" || req.params.dir == "trails") return res.sendFile(__dirname + "/assets/deatheffects/0.png")
    else if (req.params.dir == "gdps" && req.params[0].endsWith("_icon.png")) return res.sendFile(__dirname + "/assets/gdps/unknown_icon.png")
    else if (req.params.dir == "gdps" && req.params[0].endsWith("_logo.png")) return res.sendFile(__dirname + "/assets/gdps/unknown_logo.png")
    return res.send(`<p style="font-size: 20px; font-family: aller, helvetica, arial">Looks like this file doesn't exist ¯\\_(ツ)_/¯<br><a href='/assets/${main}'>View directory listing for <b>/assets/${main}</b></a></p>`)
  }

  let path = `./assets/${dir}`
  let files = []
  if (fs.existsSync(path)) { files = fs.readdirSync(path) }

  assetPage = fs.readFileSync('./html/assets.html', 'utf8')
  let assetData = JSON.stringify({files: files.filter(x => x.includes('.')), directories: files.filter(x => !x.includes('.'))})
  res.send(assetPage.replace('{NAME}', dir || "assets").replace('{DATA}', assetData))
})


// POST REQUESTS

app.post("/like", RL, function(req, res) { app.run.like(app, req, res) })  
app.post("/postComment", RL, function(req, res) { app.run.postComment(app, req, res) })  
app.post("/postProfileComment", RL, function(req, res) { app.run.postProfileComment(app, req, res) })  

app.post("/messages", RL, function(req, res) { app.run.getMessages(app, req, res) })
app.post("/messages/:id", RL, function(req, res) { app.run.fetchMessage(app, req, res) })
app.post("/deleteMessage", RL, function(req, res) { app.run.deleteMessage(app, req, res) })  
app.post("/sendMessage", RL, function(req, res) { app.run.sendMessage(app, req, res) })  

app.post("/accurateLeaderboard", function(req, res) { app.run.accurate(app, req, res, true) })
app.post("/analyzeLevel", function(req, res) { app.run.analyze(app, req, res) })

// HTML

let onePointNineDisabled = ['daily', 'weekly', 'gauntlets', 'messages']
let downloadDisabled = ['daily', 'weekly']
let gdpsHide = ['achievements', 'messages']

app.get("/", function(req, res) { 
  if (req.query.hasOwnProperty("offline") || (req.offline && !req.query.hasOwnProperty("home"))) res.sendFile(__dirname + "/html/offline.html")
  else {
    fs.readFile('./html/home.html', 'utf8', function (err, data) {
      let html = data;
      if (req.isGDPS) {
        html = html.replace('"levelBG"', '"levelBG purpleBG"')
        .replace(/Geometry Dash Browser!/g, req.server.name + " Browser!")
        .replace("/assets/gdlogo", `/assets/gdps/${req.id}_logo`)
        .replace("coin.png\" itemprop", `gdps/${req.id}_icon.png" itemprop`)
        .replace(/coin\.png/g, `${req.server.onePointNine ? "blue" : "silver"}coin.png`)
        gdpsHide.forEach(x => { html = html.replace(`menu-${x}`, 'changeDaWorld') })
      }
      if (req.onePointNine) onePointNineDisabled.forEach(x => { html = html.replace(`menu-${x}`, 'menuDisabled') })
      if (req.server.disabled) req.server.disabled.forEach(x => { html = html.replace(`menu-${x}`, 'menuDisabled') })
      if (req.server.downloadsDisabled && process.platform == "linux") {
        downloadDisabled.forEach(x => { html = html.replace(`menu-${x}`, 'menuDisabled') })
        html = html.replace('id="dl" style="display: none', 'style="display: block')
        .replace('No active <span id="noLevel">daily</span> level!', '[Blocked by RobTop]')
      }
      return res.send(html)
    })
  }
})   

app.get("/achievements", function(req, res) { res.sendFile(__dirname + "/html/achievements.html") })
app.get("/analyze/:id", function(req, res) { res.sendFile(__dirname + "/html/analyze.html") })
app.get("/api", function(req, res) { res.sendFile(__dirname + "/html/api.html") })
app.get("/boomlings", function(req, res) { res.sendFile(__dirname + "/html/boomlings.html") })
app.get("/comments/:id", function(req, res) { res.sendFile(__dirname + "/html/comments.html") })
app.get("/demon/:id", function(req, res) { res.sendFile(__dirname + "/html/demon.html") })
app.get("/gauntlets", function(req, res) { res.sendFile(__dirname + "/html/gauntlets.html") })
app.get("/gdps", function(req, res) { res.sendFile(__dirname + "/html/gdps.html") })
app.get("/iconkit", function(req, res) { res.sendFile(__dirname + "/html/iconkit.html") })
app.get("/leaderboard", function(req, res) { res.sendFile(__dirname + "/html/leaderboard.html") })
app.get("/leaderboard/:text", function(req, res) { res.sendFile(__dirname + "/html/levelboard.html") })
app.get("/mappacks", function(req, res) { res.sendFile(__dirname + "/html/mappacks.html") })
app.get("/messages", function(req, res) { res.sendFile(__dirname + "/html/messages.html") })
app.get("/search", function(req, res) { res.sendFile(__dirname + "/html/filters.html") })
app.get("/search/:text", function(req, res) { res.sendFile(__dirname + "/html/search.html") })


// API

app.get("/api/analyze/:id", RL, function(req, res) { app.run.level(app, req, res, true, true) })
app.get("/api/boomlings", function(req, res) { app.run.boomlings(app, req, res) })
app.get("/api/comments/:id", RL2, function(req, res) { app.run.comments(app, req, res) })
app.get("/api/credits", function(req, res) { res.send(require('./misc/credits.json')) })
app.get("/api/gauntlets", function(req, res) { app.run.gauntlets(app, req, res) })
app.get("/api/leaderboard", function(req, res) { app.run[req.query.hasOwnProperty("accurate") ? "accurate" : "scores"](app, req, res) })
app.get("/api/leaderboardLevel/:id", RL2, function(req, res) { app.run.leaderboardLevel(app, req, res) })
app.get("/api/level/:id", RL, function(req, res) { app.run.level(app, req, res, true) })
app.get("/api/mappacks", function(req, res) { app.run.mappacks(app, req, res) })
app.get("/api/profile/:id", RL2, function(req, res) { app.run.profile(app, req, res, true) })
app.get("/api/search/:text", RL2, function(req, res) { app.run.search(app, req, res) })
app.get("/api/song/:song", function(req, res){ app.run.song(app, req, res) })
 

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

app.get("/icon/:text", function(req, res) { app.run.icon(app, req, res) })
app.get("/api/userCache", function(req, res) { res.send(app.accountCache) })
app.get("/api/achievements", function(req, res) { res.send({achievements, types: achievementTypes, shopIcons, colors: colorList }) })
app.get("/api/music", function(req, res) { res.send(music) })
app.get("/api/gdps", function(req, res) {res.send(req.query.hasOwnProperty("current") ? app.safeServers.find(x => req.server.id == x.id) : app.safeServers) })
app.get('/api/icons', function(req, res) { 
  let sample = [JSON.stringify(sampleIcons[Math.floor(Math.random() * sampleIcons.length)].slice(1))]
  let iconserver = req.isGDPS ? req.server.name : undefined
  res.send({icons: gdIcons, colors: colorList, colorOrder, whiteIcons, server: iconserver, noCopy: req.onePointNine || req.offline, sample}); 
});

app.get('*', function(req, res) {
  if (req.path.startsWith('/api')) res.send('-1')
  else res.redirect('/search/404%20')
});

app.use(function (err, req, res, next) {
  if (err && err.message == "Response timeout") res.status(500).send('Internal server error! (Timed out)')
  else if (err) console.log(err)
})

process.on('uncaughtException', (e) => { console.log(e) });
process.on('unhandledRejection', (e, p) => { console.log(e) });

app.listen(app.config.port, () => console.log(`Site online! (port ${app.config.port})`))
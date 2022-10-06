"use strict";
const express = require('express')
const request = require('request')
const compression = require('compression')
const timeout = require('connect-timeout')
const rateLimit = require("express-rate-limit")
const fs = require("fs")
const app = express()

const serverList = require('./servers.json')
const pinnedServers = []
const notPinnedServers = []
serverList.forEach(x => (x.pinned ? pinnedServers : notPinnedServers).push(x))
notPinnedServers.sort((a, b) => a.name.localeCompare(b.name))

app.servers = pinnedServers.concat(notPinnedServers)
app.safeServers = JSON.parse(JSON.stringify(app.servers)) // deep clone
app.safeServers.forEach(x => ['endpoint', 'substitutions', 'overrides', 'disabled'].forEach(k => delete x[k]))
app.config = require('./settings.js')

const rlMessage = "Rate limited ¯\\_(ツ)_/¯<br><br>Please do not spam my servers with a crazy amount of requests. It slows things down on my end and stresses RobTop's servers just as much. "+
"If you really want to send a zillion requests for whatever reason, please download the GDBrowser repository locally - or even just send the request directly to the GD servers.<br><br>"+
"This kind of spam usually leads to GDBrowser getting IP banned by RobTop, and every time that happens I have to start making the rate limit even stricter. Please don't be the reason for that.<br><br>"

const RL = rateLimit({
  windowMs: app.config.rateLimiting ? 5 * 60 * 1000 : 0,
  max: app.config.rateLimiting ? 100 : 0, // max requests per 5 minutes
  message: rlMessage,
  keyGenerator: req => req.headers['x-real-ip'] || req.headers['x-forwarded-for'],
  skip: req => req.url.includes("api/level") && !req.query.hasOwnProperty("download")
})

const RL2 = rateLimit({
  windowMs: app.config.rateLimiting ? 2 * 60 * 1000 : 0,
  max: app.config.rateLimiting ? 200 : 0, // max requests per 1 minute
  message: rlMessage,
  keyGenerator: function(req) { return req.headers['x-real-ip'] || req.headers['x-forwarded-for'] }
})

const XOR = require('./classes/XOR.js')
const achievements = require('./misc/achievements.json')
let achievementTypes = require('./misc/achievementTypes.json')
let music = require('./misc/music.json')
let assetPage = fs.readFileSync('./html/assets.html', 'utf8')

app.accountCache = {}
app.lastSuccess = {}
app.actuallyWorked = {}

app.servers.forEach(x => {
  x = x.id || "gd"
  app.accountCache[x] = {}
  app.lastSuccess[x] = Date.now()
})
app.mainEndpoint = app.servers.find(x => !x.id).endpoint // boomlings.com unless changed in fork

app.set('json spaces', 2)
app.use(compression())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(timeout('20s'))

app.use(async function(req, res, next) {

  let subdomains = req.subdomains.map(x => x.toLowerCase())
  if (!subdomains.length) subdomains = [""]
  req.server = app.servers.find(x => subdomains.includes(x.id.toLowerCase()))
  if (subdomains.length > 1 || !req.server)
    return res.redirect("http://" + req.get('host').split(".").slice(subdomains.length).join(".") + req.originalUrl)

  // will expand this in the future :wink: 😉
  res.sendError = function(errorCode=500) {
    res.status(errorCode).send("-1")
  }

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
    Object.keys(app.config.params).forEach(k => obj[k] ||= app.config.params[k])
    Object.keys(req.server.extraParams || {}).forEach(k => obj[k] ||= req.server.extraParams[k])
    let ip = req.headers['x-real-ip'] || req.headers['x-forwarded-for']
    let params = {form: obj, headers: app.config.ipForwarding && ip ? {'x-forwarded-for': ip, 'x-real-ip': ip} : {}}

    if (substitute) { // GDPS substitutions in settings.js
      for (let ss in req.server.substitutions) {
        if (params.form[ss]) {
          params.form[req.server.substitutions[ss]] = params.form[ss]
          delete params.form[ss]
        }
      }
    }
    return params
  }

  req.gdRequest = function(target, params={}, cb=function(){}) {
    if (!target) return cb(true)
    target = (req.server.overrides && req.server.overrides[target]) || target
    let parameters = params.headers ? params : req.gdParams(params)
    let {endpoint} = req
    if (params.forceGD || (params.form?.forceGD))
      endpoint = "http://www.boomlings.com/database/"
    request.post(endpoint + target + '.php', parameters, function(err, res, body) {
      if (!err && (!body || /(^-\d$)|^error|^</.test(body)))
        err = {serverError: true, response: body}

      return cb(err, res, body)
    })
  }

  next()
})

let directories = [""]
fs.readdirSync('./api').filter(x => !x.includes(".")).forEach(x => directories.push(x))

app.trackSuccess = function(id) {
  app.lastSuccess[id] = Date.now()
  app.actuallyWorked[id] ||= true
}

app.timeSince = function(id, time) {
  if (!time) time = app.lastSuccess[id]
  let secsPassed = Math.floor((Date.now() - time) / 1000)
  let minsPassed = Math.floor(secsPassed / 60)
  secsPassed -= 60 * minsPassed
  return `${app.actuallyWorked[id] ? "" : "~"}${minsPassed}m ${secsPassed}s`
}

app.userCache = function(id, accountID, playerID, name) {

  if ( // "IDK how to format this nicely" @Rudxain
    !accountID || accountID == "0" ||
    (name?.toLowerCase() == "robtop" && accountID != "71") ||
    !app.config.cacheAccountIDs
  )
    return
  if (!playerID) return app.accountCache[id][accountID.toLowerCase()]
  let cacheStuff = [accountID, playerID, name]
  app.accountCache[id][name.toLowerCase()] = cacheStuff
  return cacheStuff
}

app.run = {}
directories.forEach(d => {
  fs.readdirSync('./api/' + d)
    .forEach(x => {
      if (x.includes('.')) app.run[x.split('.', 1)[0]] = require(`./api/${d}/${x}`)
    })
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
  if (!responseBody || responseBody == "-1") return {}
  if (responseBody.startsWith("\nWarning:")) responseBody = responseBody.split("\n").slice(2).join("\n").trim() // GDPS'es are wild
  if (responseBody.startsWith("<br />")) responseBody = responseBody.split("<br />").slice(2).join("<br />").trim() // Seriously screw this
  let response = responseBody.split('#', 1)[0].split(splitter)
  let res = {}
  for (let i = 0; i < response.length; i += 2)
    res[response[i]] = response[i + 1]
  return res
}

//xss bad
app.clean = text => {
  const escChar = c => ({"&": "&#38;", "<": "&#60;", ">": "&#62;", "=": "&#61;", '"': "&#34;", "'": "&#39;"}[c] || c)
  return !text || typeof text != "string" ? text : text.replace(/./gs, escChar)
}

// ASSETS

app.use('/assets', express.static(__dirname + '/assets', {maxAge: "7d"}))
app.use('/assets/css', express.static(__dirname + '/assets/css'))

app.use('/iconkit', express.static(__dirname + '/iconkit'))
app.get("/misc/global.js", function(req, res) { res.status(200).sendFile(__dirname + "/misc/global.js") })
app.get("/dragscroll.js", function(req, res) { res.status(200).sendFile(__dirname + "/misc/dragscroll.js") })

app.get("/assets/:dir*?", function(req, res) {
  let main = (req.params.dir || "").toLowerCase()
  let dir = main + (req.params[0] || "").toLowerCase()

  if (dir.includes('.') || !req.path.endsWith("/")) {
    if (!req.params[0]) main = ""
    if (req.params.dir == "deatheffects" || req.params.dir == "trails") return res.status(200).sendFile(__dirname + "/assets/deatheffects/0.png")
    else if (req.params.dir == "gdps" && req.params[0].endsWith("_icon.png")) return res.status(200).sendFile(__dirname + "/assets/gdps/unknown_icon.png")
    else if (req.params.dir == "gdps" && req.params[0].endsWith("_logo.png")) return res.status(200).sendFile(__dirname + "/assets/gdps/unknown_logo.png")
    return res.status(404).send(`<p style="font-size: 20px; font-family: aller, helvetica, arial">Looks like this file doesn't exist ¯\\_(ツ)_/¯<br><a href='/assets/${main}'>View directory listing for <b>/assets/${main}</b></a></p>`)
  }

  let path = `./assets/${dir}`
  let files = []
  if (fs.existsSync(path)) { files = fs.readdirSync(path) }

  assetPage = fs.readFileSync('./html/assets.html', 'utf8')
  let assetData = JSON.stringify({files: files.filter(x => x.includes('.')), directories: files.filter(x => !x.includes('.'))})
  res.status(200).send(assetPage.replace('{NAME}', dir || "assets").replace('{DATA}', assetData))
})


// POST REQUESTS

function doPOST(name, key, noRL, wtf) {
  const args = ["/" + name]
  if (!noRL) args.push(RL)
  app.post(...args, function(req, res) { app.run[ key || name ](app, req, res, wtf ? true : undefined) })
}
doPOST("like")
doPOST("postComment")
doPOST("postProfileComment")
doPOST("messages", "getMessages")
doPOST("messages/:id", "fetchMessage")
doPOST("deleteMessage")
doPOST("sendMessage")
doPOST("accurateLeaderboard", "accurate", true, true)
doPOST("analyzeLevel", "analyze", true)


// HTML

let downloadDisabled = ['daily', 'weekly']
let onePointNineDisabled = ['daily', 'weekly', 'gauntlets', 'messages'] // using `concat` won't shorten this
let gdpsHide = ['achievements', 'messages']

app.get("/", function(req, res) {
  if (req.query.hasOwnProperty("offline") || (req.offline && !req.query.hasOwnProperty("home")))
    res.status(200).sendFile(__dirname + "/html/offline.html")
  else {
    fs.readFile('./html/home.html', 'utf8', function (err, data) {
      let html = data
      if (req.isGDPS) {
        html = html
          .replace('"levelBG"', '"levelBG purpleBG"')
          .replace(/Geometry Dash Browser!/g, req.server.name + " Browser!")
          .replace("/assets/gdlogo", `/assets/gdps/${req.id}_logo`)
          .replace("coin.png\" itemprop", `gdps/${req.id}_icon.png" itemprop`)
          .replace(/coin\.png/g, `${req.server.onePointNine ? "blue" : "silver"}coin.png`)

        gdpsHide.forEach(x => { html = html.replace(`menu-${x}`, 'changeDaWorld') })
      }
      const htmlReplacer = x => { html = html.replace(`menu-${x}`, 'menuDisabled') }
      if (req.onePointNine) onePointNineDisabled.forEach(htmlReplacer)
      if (req.server.disabled) req.server.disabled.forEach(htmlReplacer)
      if (req.server.downloadsDisabled && process.platform == "linux") {
        downloadDisabled.forEach(htmlReplacer)
        html = html
          .replace('id="dl" style="display: none', 'style="display: block')
          .replace('No active <span id="noLevel">daily</span> level!', '[Blocked by RobTop]')
      }
      if (html.includes('menuDisabled" src="/assets/category-weekly')) { // if weekly disabled, replace with featured
        html = html
          .replace('block" id="menu_weekly', 'none" id="menu_weekly')
          .replace('none" id="menu_featured', 'block" id="menu_featured')
      }
      return res.status(200).send(html)
    })
  }
})

function sendHTML(dir, name) {
  app.get("/" + dir, function(req, res) { res.status(200).sendFile(`${__dirname}/html/${name || dir}.html`) })
}
sendHTML("achievements")
sendHTML("analyze/:id", "analyze")
sendHTML("api")
sendHTML("boomlings")
sendHTML("comments/:id", "comments")
sendHTML("demon/:id", "demon")
sendHTML("gauntlets")
sendHTML("gdps")
sendHTML("iconkit")
sendHTML("leaderboard")
sendHTML("leaderboard/:text", "levelboard")
sendHTML("mappacks")
sendHTML("messages")
sendHTML("search", "filters")
sendHTML("search/:text", "search")


// API


function doGET(name, key, RL, wtf1, wtf2) {
  const args = ["/api/" + name]
  if (RL !== null && RL !== undefined) args.push(RL)
  app.post(...args, function(req, res) { app.run[ key || name ](app, req, res, wtf1 ? true : undefined, wtf2 ? true : undefined) })
}

doGET("analyze/:id", "level", RL, true, true)
doGET("boomlings", "", null)
doGET("comments/:id", "comments", RL2)

app.get("/api/credits", function(req, res) { res.status(200).send(require('./misc/credits.json')) })

doGET("gauntlets")
app.get("/api/leaderboard", function(req, res) { app.run[req.query.hasOwnProperty("accurate") ? "accurate" : "scores"](app, req, res) })
doGET("leaderboardLevel/:id", "leaderboardLevel", RL2)
doGET("level/:id", "level", RL, true)
doGET("mappacks")
doGET("profile/:id", "profile", RL2, true)
doGET("search/:text", "search", RL2)
doGET("song/:song", "song")


// REDIRECTS

function doRedir(name, dir, key = 'id') {
  app.get('/' + name, function(req, res) { res.redirect('/' + dir + (key && '/' + req.params[key]) ) })
}
doRedir('icon', 'iconkit', '')
doRedir('obj/:text', 'obj', 'text')
doRedir('leaderboards/:id', 'leaderboard')
doRedir('profile/:id', 'u')
doRedir('p/:id', 'u')
doRedir('l/:id', 'leaderboard')
doRedir('a/:id', 'analyze')
doRedir('c/:id', 'comments')
doRedir('d/:id', 'demon')


// API AND HTML

doPOST("u/:id", "profile", true)
doPOST(":id", "level", true)

// MISC

app.get("/api/userCache", function(req, res) { res.status(200).send(app.accountCache) })
app.get("/api/achievements", function(req, res) {
  res.status(200).send(
    {achievements, types: achievementTypes, shopIcons: sacredTexts.shops, colors: sacredTexts.colors}
  )
})
app.get("/api/music", function(req, res) { res.status(200).send(music) })
app.get("/api/gdps", function(req, res) {
  res.status(200).send(
    req.query.hasOwnProperty("current")
    ? app.safeServers.find(x => req.server.id == x.id)
    : app.safeServers
  )
})

// important icon stuff
let sacredTexts = {}

fs.readdirSync('./iconkit/sacredtexts').forEach(x => {
  sacredTexts[x.split(".", 1)[0]] = require("./iconkit/sacredtexts/" + x)
})

let previewIcons = fs.readdirSync('./iconkit/premade')
let newPreviewIcons = fs.readdirSync('./iconkit/newpremade')

let previewCounts = {}
previewIcons.forEach(x => {
  if (x.endsWith("_0.png")) return
  let iconType = sacredTexts.forms[x.split("_", 1)[0]].form
  if (!previewCounts[iconType]) previewCounts[iconType] = 1
  else previewCounts[iconType]++
})
sacredTexts.iconCounts = previewCounts

let newIcons = fs.readdirSync('./iconkit/newicons')
sacredTexts.newIcons = []
let newIconCounts = {}
newIcons.forEach(x => {
  if (x.endsWith(".plist")) {
    sacredTexts.newIcons.push(x.split("-", 1)[0])
    let formName = x.split(/_\d/g, 1)[0]
    if (!newIconCounts[formName]) newIconCounts[formName] = 1
    else newIconCounts[formName]++
  }
})
sacredTexts.newIconCounts = newIconCounts

app.get('/api/icons', function(req, res) {
  res.status(200).send(sacredTexts);
});

// important icon kit stuff
let iconKitFiles = {}
let sampleIcons = require('./misc/sampleIcons.json')
fs.readdirSync('./iconkit/extradata').forEach(x => {
  iconKitFiles[x.split(".", 1)[0]] = require("./iconkit/extradata/" + x)
})

Object.assign(iconKitFiles, {previewIcons, newPreviewIcons})

app.get('/api/iconkit', function(req, res) {
  let sample = [JSON.stringify(sampleIcons[Math.random() * sampleIcons.length >>>0].slice(1))]
  let iconserver = req.isGDPS ? req.server.name : undefined
  res.status(200).send(Object.assign(iconKitFiles, {sample, server: iconserver, noCopy: req.onePointNine || req.offline}));
})

app.get('/icon/:text', function(req, res) {
  let iconID = Number(req.query.icon || 1)
  let iconForm = sacredTexts.forms[req.query.form] ? req.query.form : "icon"
  let iconPath = `${iconForm}_${iconID}.png`
  let fileExists = iconKitFiles.previewIcons.includes(iconPath)
  return res.status(200).sendFile(`./iconkit/premade/${fileExists ? iconPath : iconForm + '_01.png'}`, {root: __dirname})
})

app.get('*', function(req, res) {
  if (/^\/(api|iconkit)/.test(req.path))
    res.status(404).send('-1')
  else
    res.redirect('/search/404%20')
})

app.use(function (err, req, res) {
  if (err?.message == "Response timeout") res.status(504).send('Internal server error! (Timed out)')
})

process.on('uncaughtException', e => console.log(e))
process.on('unhandledRejection', e => console.log(e))

app.listen(app.config.port, () => console.log(`Site online! (port ${app.config.port})`))

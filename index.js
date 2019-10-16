const express = require('express');
const path = require('path');
const fs = require("fs")
const timeout = require('connect-timeout')
let api = true;
let gdicons = fs.readdirSync('./icons/iconkit');
const mapPacks = require('./misc/mapPacks.json');

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(timeout('25s'));
app.use(haltOnTimedout)
app.use(require('cookie-parser')());
if (process.env.NODE_ENV !== 'production') // Avoid extra bytes in production
  app.set('json spaces', 2);

app.modules = require("./misc/loadModules.js")();

app.secret = require('./misc/boomlingsSecret.js');

function haltOnTimedout (req, res, next) {
  if (!req.timedout) next()
}

const secrets = require('./misc/secretStuff.json');
app.id = secrets.id;
app.gjp = secrets.gjp;
app.clean = function(text) {if (typeof text != "string") return text; else return text.replace(/&/g, "&#38;").replace(/</g, "&#60;").replace(/>/g, "&#62;").replace(/=/g, "&#61;").replace(/"/g, "&#34;").replace(/'/g, "&#39;")}
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

app.use(express.static('./html', {extensions: ['html']}));
/*
Using this middleware twice is small brain but it'll have to do until every file
not in a nested directory is moved to a nested directory.
*/
const assetsMiddleware = express.static('./assets');
app.use('/assets', assetsMiddleware);
app.use(assetsMiddleware);
app.use('/gdicon', express.static('./icons/iconkit'));

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
  res.send(mapPacks)
})

app.get("/icon", function(req, res) {
  res.redirect('/iconkit');
})

app.get('/api/icons', function(req, res) {
  res.send(gdicons);
});

app.get("/api/:anythingelse", function(req, res) {
  res.send('-1')
})    

app.get("/:id", function(req, res) {
  app.modules.level(app, req, res)
})     

app.get('*', function(req, res) {
  res.redirect('/api/search/404'); // 101arrowz: I think I did this wrong
});
app.listen(2000);
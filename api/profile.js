const fs = require('fs')
const Player = require('../classes/Player.js')

module.exports = async (app, req, res, api, getLevels) => {

  if (req.offline) {
    if (!api) return res.redirect('/search/' + req.params.id)
    else return res.sendError()
  }
  
  let username = getLevels || req.params.id
  let probablyID
  if (username.endsWith(".") && req.isGDPS) {
    username = username.slice(0, -1)
    probablyID = Number(username)
  }
  let accountMode = !req.query.hasOwnProperty("player") && Number(req.params.id)
  let foundID = app.userCache(req.id, username)
  let skipRequest = accountMode || foundID || probablyID
  let searchResult;

  // if you're searching by account id, an intentional error is caused to skip the first request to the gd servers. see i pulled a sneaky on ya. (fuck callbacks man)
  req.gdRequest(skipRequest ? "" : 'getGJUsers20', skipRequest ? {} : { str: username, page: 0 }, function (err1, res1, b1) {   

    if (foundID) searchResult = foundID[0]
    else if (accountMode || err1 || b1 == '-1' || b1.startsWith("<") || !b1) searchResult = probablyID ? username : req.params.id
    else if (!req.isGDPS) searchResult = app.parseResponse(b1.split("|")[0])[16]
    else {  // GDPS's return multiple users, GD no longer does this
     let userResults = b1.split("|").map(x => app.parseResponse(x))
     searchResult = userResults.find(x => x[1].toLowerCase() == username.toLowerCase() || x[2] == username) || ""
     if (searchResult) searchResult = searchResult[16]
    }

    if (getLevels) {
      req.params.text = foundID ? foundID[1] : app.parseResponse(b1)[2]
      return app.run.search(app, req, res)
    }

    req.gdRequest('getGJUserInfo20', { targetAccountID: searchResult }, function (err2, res2, body) {

      let account = app.parseResponse(body || "")
      let dumbGDPSError = req.isGDPS && (!account[16] || account[1].toLowerCase() == "undefined")
      
      if (err2 || dumbGDPSError) {
        if (!api) return res.redirect('/search/' + req.params.id)
        else return res.sendError()
      }
      
      if (!foundID) app.userCache(req.id, account[16], account[2], account[1])
      
      let userData = new Player(account) 
  
      if (api) return res.send(userData)

      else fs.readFile('./html/profile.html', 'utf8', function(err, data) {
        let html = data;
        let variables = Object.keys(userData)
        variables.forEach(x => {
          let regex = new RegExp(`\\[\\[${x.toUpperCase()}\\]\\]`, "g")
          html = html.replace(regex, app.clean(userData[x]))
        })
        return res.send(html)
      })
  
      })
    })
  }
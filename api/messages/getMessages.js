module.exports = async (app, req, res, api) => {

  if (req.body.count) return app.run.countMessages(app, req, res)
  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")

  let params = req.gdParams({
    accountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
    page: req.body.page || 0,
    getSent: req.query.sent ? 1 : 0
  })

  req.gdRequest('getGJMessages20', params, function (err, resp, body) {

    if (err) return res.status(400).send(`Error fetching messages! Messages get blocked a lot so try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    else app.trackSuccess(req.id)

    let messages = body.split("|").map(msg => app.parseResponse(msg))
    let messageArray = []
    messages.forEach(x => {
      let msg = {}

      msg.id = x[1];
      msg.playerID = x[3]
      msg.accountID = x[2]
      msg.author = x[6]
      msg.subject = Buffer.from(x[4], "base64").toString().replace(/^Re: ☆/, "Re: ")
      msg.date = x[7] + req.timestampSuffix
      msg.unread = x[8] != "1"
      if (msg.subject.endsWith("☆") || msg.subject.startsWith("☆")) {
        if (msg.subject.endsWith("☆")) msg.subject = msg.subject.slice(0, -1)
        else msg.subject = msg.subject.slice(1)
        msg.browserColor = true 
    }

      app.userCache(req.id, msg.accountID, msg.playerID, msg.author)
      messageArray.push(msg)
    })
    return res.status(200).send(messageArray)
  })

}
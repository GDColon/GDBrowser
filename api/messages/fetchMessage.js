module.exports = async (app, req, res, api) => {

  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")

  let params = req.gdParams({
    accountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
    messageID: req.params.id,
  })

  req.gdRequest('downloadGJMessage20', params, function (err, resp, body) {

    if (err) return res.status(400).send(`Error fetching message! Try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    else app.trackSuccess(req.id)

    let x = app.parseResponse(body)
    let msg = {}
    msg.id = x[1];
    msg.playerID = x[3]
    msg.accountID = x[2]
    msg.author = x[6]
    msg.subject = Buffer.from(x[4], "base64").toString().replace(/^Re: ☆/, "Re: ")
    msg.content = app.xor.decrypt(x[5], 14251)
    msg.date = x[7] + req.timestampSuffix
    if (msg.subject.endsWith("☆") || msg.subject.startsWith("☆")) {
      if (msg.subject.endsWith("☆")) msg.subject = msg.subject.slice(0, -1)
      else msg.subject = msg.subject.slice(1)
      msg.browserColor = true 
  }
    
    return res.status(200).send(msg)
  })

}
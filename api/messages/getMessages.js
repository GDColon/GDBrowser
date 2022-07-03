"use strict";
module.exports = async (app, req, res) => {
  const send = (msg, c=400) => res.status(c).send(msg)

  if (req.method !== 'POST') return send("Method not allowed.", 405)

  if (req.body.count) return app.run.countMessages(app, req, res)
  if (!req.body.accountID) return send("No account ID provided!")
  if (!req.body.password) return send("No password provided!")

  let params = req.gdParams({
    accountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
    page: req.body.page || 0,
    getSent: req.query.sent ? 1 : 0
  })

  req.gdRequest('getGJMessages20', params, function (err, resp, body) {

    if (err) return send(`Error fetching messages! Messages get blocked a lot so try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    else app.trackSuccess(req.id)

    let messages = body.split("|").map(msg => app.parseResponse(msg))
    let messageArray = []
    messages.forEach(x => {
      let subject = Buffer.from(x[4], "base64").toString().replace(/^Re: ☆/, "Re: ")
      let msg = {
        id: x[1],
        playerID: x[3],
        accountID: x[2],
        author: x[6],
        subject,
        date: x[7] + req.timestampSuffix,
        unread: x[8] != "1"
      }
      if (/^☆|☆$/.test(subject)) {
        msg.subject = subject.slice(...(subject.endsWith("☆") ? [0, -1] : [1]))
        msg.browserColor = true
      }

      app.userCache(req.id, msg.accountID, msg.playerID, msg.author)
      messageArray.push(msg)
    })
    return res.send(messageArray)
  })

}
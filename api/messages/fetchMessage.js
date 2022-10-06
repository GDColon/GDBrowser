"use strict";
module.exports = async (app, req, res) => {
  const send = (msg, c=400) => res.status(c).send(msg)

  if (req.method !== 'POST') return send("Method not allowed.", 405)

  if (!req.body.accountID) return send("No account ID provided!")
  if (!req.body.password) return send("No password provided!")

  let params = req.gdParams({
    accountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
    messageID: req.params.id,
  })

  req.gdRequest('downloadGJMessage20', params, function (err, resp, body) {

    if (err) return send(`Error fetching message! Try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    app.trackSuccess(req.id)

    let x = app.parseResponse(body)
    let subject = Buffer.from(x[4], "base64").toString().replace(/^Re: ☆/, "Re: ")
    let msg = {
      id: x[1],
      playerID: x[3],
      accountID: x[2],
      author: x[6],
      subject,
      content: app.xor.decrypt(x[5], 14251),
      date: x[7] + req.timestampSuffix
    }
    if (/^☆|☆$/.test(subject)) {
      msg.subject = subject.slice(...(subject.endsWith("☆") ? [0, -1] : [1]))
      msg.browserColor = true
    }

    return res.send(msg)
  })

}
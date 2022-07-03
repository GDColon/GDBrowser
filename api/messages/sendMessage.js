"use strict";
module.exports = async (app, req, res) => {
  const send = (msg, c=400) => res.status(c).send(msg)

  if (req.method !== 'POST') return send("Method not allowed.", 405)

  if (!req.body.targetID) return send("No target ID provided!")
  if (!req.body.message) return send("No message provided!")
  if (!req.body.accountID) return send("No account ID provided!")
  if (!req.body.password) return send("No password provided!")

  let subject = Buffer.from(
    (req.body.color ? "☆" : "") + (req.body.subject ? req.body.subject.slice(0, 50) : "No subject")
  ).toString('base64url')
  let body = app.xor.encrypt(req.body.message.slice(0, 300), 14251)

  let params = req.gdParams({
    accountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
    toAccountID: req.body.targetID,
    subject, body
  })

  req.gdRequest('uploadGJMessage20', params, function (err, resp, body) {
    if (body != 1) return send(
      `The Geometry Dash servers refused to send the message! `+
      `Try again later, or make sure your username and password are entered correctly. `+
      `Last worked: ${app.timeSince(req.id)} ago.`
    )
    res.send('Message sent!')
    app.trackSuccess(req.id)
  })

}
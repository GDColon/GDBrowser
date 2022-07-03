"use strict";
module.exports = async (app, req, res) => {
  const send = (msg, c=400) => res.status(c).send(msg)

  if (req.method !== 'POST') return send("Method not allowed.", 405)

  if (!req.body.accountID) return send("No account ID provided!")
  if (!req.body.password) return send("No password provided!")

  let params = {
    accountID: req.body.accountID,
    targetAccountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
  }

  req.gdRequest('getGJUserInfo20', params, function (err, resp, body) {

    if (err) return send(`Error counting messages! Messages get blocked a lot so try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    app.trackSuccess(req.id)
    let count = app.parseResponse(body)[38]
    if (!count) return send("Error fetching unread messages!")
    res.send(count)
  })

}
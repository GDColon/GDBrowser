"use strict";
module.exports = async (app, req, res) => {
  const send = (msg, c=400) => res.status(c).send(msg)

  if (req.method !== 'POST') return send("Method not allowed.", 405)

  if (!req.body.accountID) return send("No account ID provided!")
  if (!req.body.password) return send("No password provided!")
  if (!req.body.id) return send("No message ID(s) provided!")

  let params = {
    accountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
    // serialize to CSV if needed
    messages: Array.isArray(req.body.id) ? req.body.id.map(x => x.trim()).join(",") : req.body.id,
  }

  let deleted = params.messages.split(",").length // CSV record count

  req.gdRequest('deleteGJMessages20', params, function (err, resp, body) {

    if (body != 1) return send(`The Geometry Dash servers refused to delete the message! Try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    res.send(`${deleted} message${deleted == 1 ? "" : "s"} deleted!`)
    app.trackSuccess(req.id)
  })

}
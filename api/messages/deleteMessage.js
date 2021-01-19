module.exports = async (app, req, res, api) => {

  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")
  if (!req.body.id) return res.status(400).send("No message ID(s) provided!")

  let params = {
    accountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
    messages: Array.isArray(req.body.id) ? req.body.id.map(x => x.trim()).join(",") : req.body.id,
  }

  let deleted = params.messages.split(",").length

  req.gdRequest('deleteGJMessages20', params, function (err, resp, body) {

    if (body != 1) return res.status(400).send(`The Geometry Dash servers refused to delete the message! Try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    else res.status(200).send(`${deleted == 1 ? "1 message" : `${deleted} messages`} deleted!`)
    app.trackSuccess(req.id)
  })

}
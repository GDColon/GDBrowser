module.exports = async (app, req, res) => {

  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")

  let params = {
    accountID: req.body.accountID,
    targetAccountID: req.body.accountID,
    gjp: app.xor.encrypt(req.body.password, 37526),
  }

  req.gdRequest('getGJUserInfo20', params, function (err, resp, body) {

    if (err) return res.status(400).send(`Error counting messages! Messages get blocked a lot so try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    else app.trackSuccess(req.id)
    let count = app.parseResponse(body)[38]
    if (!count) return res.status(400).send("Error fetching unread messages!")
    else res.status(200).send(count)
  })

}
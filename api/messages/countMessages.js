const request = require('request')
const XOR = require('../../classes/XOR.js');
const xor = new XOR();

module.exports = async (app, req, res) => {

  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")

  let params = {
    accountID: req.body.accountID,
    targetAccountID: req.body.accountID,
    gjp: xor.encrypt(req.body.password, 37526),
    secret: app.secret,
    gameVersion: app.gameVersion,
    binaryVersion: app.binaryVersion,
  }

  request.post(app.endpoint + 'getGJUserInfo20.php', {
    form: params,
    headers: {'x-forwarded-for': req.headers['x-real-ip']}
  }, async function (err, resp, body) {

    if (err || body == '-1' || body == '-2' || !body) return res.status(400).send("Error fetching profile! Make sure your username and password are entered correctly.")
    let count = app.parseResponse(body)[38]
    if (!count) return res.status(400).send("Error fetching unread messages!")
    else res.status(200).send(count)
  })

}
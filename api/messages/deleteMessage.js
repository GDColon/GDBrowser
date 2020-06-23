const request = require('request')
const XOR = require('../../classes/XOR.js');
const xor = new XOR();

module.exports = async (app, req, res, api) => {

  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")
  if (!req.body.id) return res.status(400).send("No message ID(s) provided!")

  let params = {
    accountID: req.body.accountID,
    gjp: xor.encrypt(req.body.password, 37526),
    messages: Array.isArray(req.body.id) ? req.body.id.map(x => x.trim()).join(",") : req.body.id,
    secret: app.secret,
  }

  let deleted = params.messages.split(",").length

  request.post(app.endpoint + 'deleteGJMessages20.php', {
    form: params,
    headers: {'x-forwarded-for': req.headers['x-real-ip']}
  }, async function (err, resp, body) {

    if (body != 1) return res.status(400).send("The Geometry Dash servers refused to delete the message! Make sure your username and password are entered correctly.")
    else res.status(200).send(`${deleted == 1 ? "1 message" : `${deleted} messages`} deleted!`)

  })

}
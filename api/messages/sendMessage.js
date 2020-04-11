const request = require('request')
const XOR = require('../../classes/XOR.js');
const xor = new XOR();

module.exports = async (app, req, res, api) => {

  if (!req.body.targetID) return res.status(400).send("No target ID provided!")
  if (!req.body.message) return res.status(400).send("No message provided!")
  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")

  let subject = new Buffer(req.body.subject ? (req.body.color ? "☆" : "") + (req.body.subject.slice(0, 50)) : (req.body.color ? "☆" : "") + "No subject").toString('base64').replace(/\//g, '_').replace(/\+/g, "-")
  let body = xor.encrypt(req.body.message.slice(0, 300), 14251)

  let params = {
    accountID: req.body.accountID,
    gjp: xor.encrypt(req.body.password, 37526),
    toAccountID: req.body.targetID,
    subject, body,
    secret: app.secret,
  }

  request.post(app.endpoint + 'uploadGJMessage20.php', {
    form: params,
    headers: {'x-forwarded-for': req.headers['x-real-ip']}
  }, async function (err, resp, body) {

    if (body != 1) return res.status(400).send("The Geometry Dash servers refused to send the message! Make sure your username and password are entered correctly.")
    else res.status(200).send('Message sent!')

  })

}
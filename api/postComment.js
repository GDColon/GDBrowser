const request = require('request')
const XOR = require('../misc/XOR.js');
const xor = new XOR();
const crypto = require('crypto')
function sha1(data) { return crypto.createHash("sha1").update(data, "binary").digest("hex"); }

let rateLimit = {};
let cooldown = 10000

function getTime(time) {
  let seconds = Math.ceil(time / 1000);
  seconds = seconds % 60;
  return seconds}

module.exports = async (app, req, res) => {

  if (!req.body.comment) return res.status(400).send("No comment provided!")
  if (!req.body.username) return res.status(400).send("No username provided!")
  if (!req.body.levelID) return res.status(400).send("No level ID provided!")
  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")

  if (req.body.comment.includes('\n')) return res.status(400).send("Comments cannot contain line breaks!")

  if (rateLimit[req.body.username]) return res.status(400).send(`Please wait ${getTime(rateLimit[req.body.username] + cooldown - Date.now())} seconds before posting another comment!`)
  
  let params = {
    gameVersion: '21',
    binaryVersion: '35',
    secret: app.secret,
    percent: 0
  }

  params.comment = new Buffer(req.body.comment).toString('base64').replace(/\//g, '_').replace(/\+/g, "-")
  params.gjp = xor.encrypt(req.body.password, 37526)
  params.levelID = req.body.levelID.toString()
  params.accountID = req.body.accountID.toString()
  params.userName = req.body.username

  let percent = parseInt(req.body.percent)
  if (percent && percent > 0 && percent <= 100) params.percent = percent.toString()

  let chk = params.userName + params.comment + params.levelID + params.percent + "0xPT6iUrtws0J"
  chk = sha1(chk)
  chk = xor.encrypt(chk, 29481)
  params.chk = chk

  request.post('http://boomlings.com/database/uploadGJComment21.php', {
    form: params
  }, function (err, resp, body) {
    if (err) return res.status(400).send("The Geometry Dash servers returned an error! Perhaps they're down for maintenance")
    if (!body || body == "-1") return res.status(400).send("The Geometry Dash servers rejected your comment! Try again later, or make sure your username and password are entered correctly.")
    res.status(200).send(`Comment posted to level ${params.levelID} with ID ${body}`)
    rateLimit[req.body.username] = Date.now();
    setTimeout(() => {delete rateLimit[req.body.username]; }, cooldown);
  })
}
"use strict";
const crypto = require('crypto')
function sha1(data) { return crypto.createHash("sha1").update(data, "binary").digest("hex"); }

module.exports = async (app, req, res) => {

  if (req.method !== 'POST') return res.status(405).send("Method not allowed.")

  if (!req.body.ID) return res.status(400).send("No ID provided!")
  if (!req.body.accountID) return res.status(400).send("No account ID provided!")
  if (!req.body.password) return res.status(400).send("No password provided!")
  if (!req.body.like) return res.status(400).send("No like flag provided! (1=like, 0=dislike)")
  if (!req.body.type) return res.status(400).send("No type provided! (1=level, 2=comment, 3=profile")
  if (!req.body.extraID) return res.status(400).send("No extra ID provided! (this should be a level ID, account ID, or '0' for levels")
  /*
  // A compound error message is more helpful, but IDK if this may cause bugs,
  // so this is commented-out
  let errMsg = ""
  if (!req.body.ID) errMsg += "No ID provided!\n"
  if (!req.body.accountID) errMsg += "No account ID provided!\n"
  if (!req.body.password) errMsg += "No password provided!\n"
  if (!req.body.like) errMsg += "No like flag provided! (1=like, 0=dislike)\n"
  if (!req.body.type) errMsg += "No type provided! (1=level, 2=comment, 3=profile\n"
  if (!req.body.extraID) errMsg += "No extra ID provided! (this should be a level ID, account ID, or '0' for levels)\n"
  if (errMsg) return res.status(400).send(errMsg)
  */

  let params = {
    udid: '0',
    uuid: '0',
    rs: '8f0l0ClAN1'
  }

  params.itemID = req.body.ID.toString()
  params.gjp = app.xor.encrypt(req.body.password, 37526)
  params.accountID = req.body.accountID.toString()
  params.like = req.body.like.toString()
  params.special = req.body.extraID.toString()
  params.type = req.body.type.toString()

  let chk = "";
  ['special', 'itemID', 'like', 'type', 'rs', 'accountID', 'udid', 'uuid'].forEach(k => chk += params[k])
  chk += "ysg6pUrtjn0J"
  chk = sha1(chk)
  chk = app.xor.encrypt(chk, 58281)
  params.chk = chk

  req.gdRequest('likeGJItem211', params, function (err, resp, body) {
    if (err) return res.status(400).send(`The Geometry Dash servers rejected your vote! Try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    else app.trackSuccess(req.id)
    res.send((params.like == 1 ? 'Successfully liked!' : 'Successfully disliked!') + " (this will only take effect if this is your first time doing so)")
  })
}
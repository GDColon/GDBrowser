"use strict";
const crypto = require('crypto')
const sha1 = data => crypto.createHash("sha1").update(data, "binary").digest("hex")

module.exports = async (app, req, res) => {
  const send = (msg, c=400) => res.status(c).send(msg)

  if (req.method !== 'POST') return send("Method not allowed.", 405)

  if (!req.body.comment) return send("No comment provided!")
  if (!req.body.username) return send("No username provided!")
  if (!req.body.accountID) return send("No account ID provided!")
  if (!req.body.password) return send("No password provided!")
  /*
  // A compound error message is more helpful, but IDK if this may cause bugs,
  // so this is commented-out
  let errMsg = ""
  if (!req.body.comment) errMsg += "No comment provided!\n"
  if (!req.body.username) errMsg += "No username provided!\n"
  if (!req.body.accountID) errMsg += "No account ID provided!\n"
  if (!req.body.password) errMsg += "No password provided!\n"
  if (errMsg) return send(errMsg)
  */

  if (req.body.comment.includes('\n')) return send("Profile posts cannot contain line breaks!")

  let params = { cType: '1' }

  params.comment = Buffer.from(req.body.comment.slice(0, 190) + (req.body.color ? "☆" : "")).toString('base64url')
  params.gjp = app.xor.encrypt(req.body.password, 37526)
  params.accountID = req.body.accountID.toString()
  params.userName = req.body.username

  let chk = params.userName + params.comment + "1xPT6iUrtws0J"
  chk = sha1(chk)
  chk = app.xor.encrypt(chk, 29481)
  params.chk = chk

  req.gdRequest('uploadGJAccComment20', params, function (err, resp, body) {
    if (err) return send(`The Geometry Dash servers rejected your profile post! Try again later, or make sure your username and password are entered correctly. Try again later, or make sure your username and password are entered correctly. Last worked: ${app.timeSince(req.id)} ago.`)
    else if (body.startsWith("temp")) {
      let banStuff = body.split("_")
      return send(`You have been banned from commenting for ${(parseInt(banStuff[1]) / 86400).toFixed(0)} days. Reason: ${banStuff[2] || "None"}`)
    }
    else app.trackSuccess(req.id)
    res.send(`Comment posted to ${params.userName} with ID ${body}`)
  })
}
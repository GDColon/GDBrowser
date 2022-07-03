"use strict";
const crypto = require('crypto')
const sha1 = data => crypto.createHash("sha1").update(data, "binary").digest("hex")

let rateLimit = {}
let cooldown = 15000  // GD has a secret rate limit and doesn't return -1 when a comment is rejected, so this keeps track

// converts timestamp miliseconds to s (wrapped-around minutes)
function getTime(time) {
  let seconds = Math.ceil(time / 1000)
  seconds %= 60
  return seconds
}

module.exports = async (app, req, res) => {
  const send = (msg, c=400) => res.status(c).send(msg)

  if (req.method !== 'POST') return send("Method not allowed.", 405)

  if (!req.body.comment) return send("No comment provided!")
  if (!req.body.username) return send("No username provided!")
  if (!req.body.levelID) return send("No level ID provided!")
  if (!req.body.accountID) return send("No account ID provided!")
  if (!req.body.password) return send("No password provided!")
  /*
  // A compound error message is more helpful, but IDK if this may cause bugs,
  // so this is commented-out
  let errMsg = ""
  if (!req.body.comment) errMsg += "No comment provided!\n"
  if (!req.body.username) errMsg += "No username provided!\n"
  if (!req.body.levelID) errMsg += "No level ID provided!\n"
  if (!req.body.accountID) errMsg += "No account ID provided!\n"
  if (!req.body.password) errMsg += "No password provided!\n"
  if (errMsg) return send(errMsg)
  */

  if (req.body.comment.includes('\n')) return send("Comments cannot contain line breaks!")

  if (rateLimit[req.body.username]) return send(`Please wait ${getTime(rateLimit[req.body.username] + cooldown - Date.now())} seconds before posting another comment!`)

  let params = { percent: 0 }

  params.comment = Buffer.from(req.body.comment + (req.body.color ? "☆" : "")).toString('base64url')
  params.gjp = app.xor.encrypt(req.body.password, 37526)
  params.levelID = req.body.levelID.toString()
  params.accountID = req.body.accountID.toString()
  params.userName = req.body.username

  let percent = parseInt(req.body.percent)
  if (percent && percent > 0 && percent <= 100) params.percent = percent.toString()

  let chk = params.userName + params.comment + params.levelID + params.percent + "0xPT6iUrtws0J"
  chk = sha1(chk)
  chk = app.xor.encrypt(chk, 29481)
  params.chk = chk

  req.gdRequest('uploadGJComment21', params, function (err, resp, body) {
    if (err) return send(
      `The Geometry Dash servers rejected your comment! `+
      `Try again later, or make sure your username and password are entered correctly. `+
      `Last worked: ${app.timeSince(req.id)} ago.`
    )
    if (body.startsWith("temp")) {
      let banStuff = body.split("_")
      return send(
        `You have been banned from commenting for ${(parseInt(banStuff[1]) / 86400).toFixed(0)} days. `+
        `Reason: ${banStuff[2] || "None"}`
      )
    }

    res.send(`Comment posted to level ${params.levelID} with ID ${body}`)
    app.trackSuccess(req.id)
    rateLimit[req.body.username] = Date.now()
    setTimeout(() => {delete rateLimit[req.body.username]}, cooldown);
  })
}
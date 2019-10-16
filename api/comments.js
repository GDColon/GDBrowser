const request = require('request')

module.exports = async (app, req, res) => {

    let params = {
        userID : req.params.id, 
        accountID : req.params.id, 
        levelID: req.params.id,
        page: req.query.page || 0,
        secret: app.secret,
        mode: req.query.hasOwnProperty("top") ? "1" : "0",
    }  

    let path = "getGJComments21"
    if (req.query.type == "commentHistory") path = "getGJCommentHistory"
    else if (req.query.type == "profile") path = "getGJAccountComments20"

    request.post(`http://boomlings.com/database/${path}.php`, {
    form : params}, async function(err, resp, body) { 

      if (body == '-1' || !body) return res.send("-1")
      comments = body.split('|').map(x => "4" + x.replace(":", "~").replace(/~9~(\d+ \w+)/, "~69~$1").replace("~10~", "~420~"))
      if (req.query.type == "commentHistory") comments = comments.map(x => x.replace("~1~", "~666~"))
      comments = comments.map(x => app.parseResponse(x, "~"))
      if (!(comments.filter(x => x[42]).length)) return res.send("-1")

      comments.forEach(x => {

        let keys = Object.keys(x)
        x.content = Buffer.from(x[42], 'base64').toString();
        x.likes = x[4]
        x.date = (x[69] || "?") + " ago"
        if (req.query.type == "commentHistory") x.levelID = x[666]
        if (req.query.type != "profile") {
          x.username = x[1] || "Unknown"
          x.playerID = x[3]
          x.accountID = x[16]
          x.form = ['icon', 'ship', 'ball', 'ufo', 'wave', 'robot', 'spider'][Number(x[14])]
          if (x[420] > 0) x.percent = x[420]
          if (x[12] && x[12].includes(',')) x.modColor = true
        }
        keys.forEach(k => delete x[k])
      }) 

      return res.send(comments)

      })
}
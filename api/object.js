const Jimp = require('jimp')
const fs = require('fs')

module.exports = async (app, req, res) => {

  let objID = (req.params.text || "").split(/[^0-9]/)[0]
  let objPath = './assets/ids/' + objID + '.png'
  if (!fs.existsSync(objPath + objID)) objPath = './assets/ids/1607.png'

  let flipX = req.query.hasOwnProperty("flipX") || req.query.hasOwnProperty("flipx") || req.query.hasOwnProperty("fx")
  let flipY = req.query.hasOwnProperty("flipY") || req.query.hasOwnProperty("flipy") || req.query.hasOwnProperty("fy")

  let rotation = Number(req.query.rotation || req.query.rotate || req.query.r)

  Jimp.read(objPath).then(obj => {
    obj.mirror(flipX, flipY)
    if (rotation) {
      obj.invert()  // fix transparency, jimp is dumb
      obj.rotate(-rotation)
      obj.invert()
    }
    obj.getBuffer(Jimp.AUTO, (err, buffer) => {
      return res.contentType('image/png').end(buffer, 'base64')
    })
  })
}
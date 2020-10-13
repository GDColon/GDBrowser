const Jimp = require('jimp');
const objects = require('../misc/objects.json')
const sprites = require('../misc/sprites.json')

// pre-load this ONCE to drop loading time
let sheets = [1, 2, 3].map(x => `./assets/spritesheets/GJ_GameSheet0${x}.png`)

module.exports = async (app, req, res) => {

  let objID = req.params.text

  if (!objects[objID] || !sprites[objects[objID]]) objID = 1607  // question mark
  let sprite = sprites[objects[objID]]

  let rotateParams = req.query.rotation || req.query.rotate || req.query.r
  let rotation = sprite.rotation - (+rotateParams || 0)
  let spritesheet = sheets[sprite.spritesheet - 1]

  let crop = [sprite.x, sprite.y, sprite.width, sprite.height]
  if (sprite.rotation == 90) [crop[2], crop[3]] = [crop[3], crop[2]]

  Jimp.read(spritesheet).then(sheet => {
    if (typeof spritesheet == "string") sheets[sprite.spritesheet - 1] = new Jimp(sheet)
    sheet.crop(...crop)
    if (rotation) sheet.rotate(rotation)
    sheet.mirror(req.query.hasOwnProperty("flipX"), req.query.hasOwnProperty("flipY"))
    sheet.getBuffer(Jimp.AUTO, (err, buffer) => {
      return res.contentType('image/png').end(buffer, 'base64')
    })
  })
}
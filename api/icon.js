const sharp = require('sharp');
const Canvas = require('canvas')
const psd = require('ag-psd')
const fs = require('fs');
const mainPath = `../icons/`
const icons = require('../misc/icons/gameSheet.json');
const colors = require('../misc/icons/colors.json');
const forms = require('../misc/icons/forms.json')
const offsets = require('../misc/icons/offsets.json')
const legOffsets = require('../misc/icons/legOffsets.json')

let canvasSize = 300
let halfCanvas = canvasSize/2
let TRANSPARENT = {r: 0, g: 0, b: 0, alpha: 0}
let cache = {}

let partNames = {
  "1": "Primary",
  "2": "Secondary",
  "3": "UFO Dome",
  "glow": "Glow",
  "extra": "White",
}

// convert hex to RGB
let hexRegex = /^[A-Fa-f0-9]{6}$/
function hexConvert(hex) { hex = hex.replace('#', ''); return {val: hex, r: '0x' + hex[0] + hex[1] | 0, g: '0x' + hex[2] + hex[3] | 0, b: '0x' + hex[4] + hex[5] | 0}; }

// get path name from icon form and ID
function getIconPath(icon, formName) {
  return `${mainPath}${formName}_${icon < 10 ? "0" : ""}${icon}`
}

// get color from param input
function getColor(colInput, defaultCol) {
  colInput = String(colInput)
  let foundColor = colors[colInput]
  if (foundColor) {
    foundColor.val = colInput
    return foundColor
  }
  else if (colInput.match(hexRegex)) { // custom hex code
    let hexCol = hexConvert(colInput)
    colors[colInput.toLowerCase()] = hexCol
    return hexCol
  }
  else if (!foundColor && defaultCol)  {
    let def = colors[defaultCol]
    def.val = defaultCol
    return def
  }
}

module.exports = async (app, req, res) => {

async function buildIcon(account=[], userCode) { 

  let form = forms[req.query.form] || forms["icon"]

  let iconID = req.query.icon || account[form.index] || 1;
  let col1 = getColor(req.query.col1 || account[10], "0")
  let col2 = getColor(req.query.col2 || account[11], "3")
  let colG = getColor(req.query.colG || req.query.colg)
  let colW = getColor(req.query.colW || req.query.colw || req.query.col3)

  let useGlow = req.query.glow || account[28] || false;
  if (useGlow && ["false", "0"].includes(useGlow)) useGlow = false
  if (col1.r == 0 && col1.g == 0 && col1.b == 0 ) useGlow = true

  // bit of a hacky solution for glow color but whatev
  let glowColor = colG || col2
  if (glowColor.r == 0 && glowColor.g == 0 && glowColor.b == 0) glowColor = col1
  if (glowColor.r == 0 && glowColor.g == 0 && glowColor.b == 0) glowColor = {r: 255, g: 255, b: 255}

  let psdExport = req.query.psd || false
  let topless = form.name == "UFO" ? req.query.topless || false : false

  let customSize = req.query.size == "auto" ? "auto" : +req.query.size || null

  let iconPath = getIconPath(iconID, form.form)

  let iconCode = `${form.name}-${iconID}-${col1.val}-${col2.val}-${colG ? colG.val : "x"}-${colW ? colW.val : "x"}-${useGlow ? 1 : 0}` 
  let cachable = !topless && !customSize && !psdExport
  if (cachable && cache[iconCode]) return res.end(cache[iconCode].buffer)

  // default to 1 if icon ID does not exist
  if (!fs.existsSync(getPartName(1).slice(1))) { // slice 1 from filename since fs reads paths differently
    iconID = 1
    iconPath = getIconPath(1, form.form)
  }

  // get path of icon 'part' (1: primary, 2: secondary, 3: ufo top, extra: white, glow: glow, )
  function getPartName(part, robotPart) {
    let path = iconPath
    if (form.legs) path += `_0${robotPart || 1}`
    if (!part || part == "1") return `${path}_001.png`
    else return `${path}_${part}_001.png`
  }

  // recolor white parts of icon to specified color
  async function recolor(img, col) {
    let rawData = await img.raw().toBuffer({resolveWithObject: true})
    for (let i=0; i<rawData.data.length; i += 4) { // [R, G, B, A]
      if (rawData.data[i + 3] > 0) {
        rawData.data[i] = col.r / (255 / rawData.data[i]);
        rawData.data[i + 1] = col.g / (255 / rawData.data[i + 1]);
        rawData.data[i + 2] = col.b / (255 / rawData.data[i + 2]);
      }
    }
    return sharp(rawData.data, {raw: {width: rawData.info.width, height: rawData.info.height, channels: 4,  background: TRANSPARENT}}).png()
  }

  // color icon part and add to layer list
  async function addLayer(part, color, legSection) {

    let leg = legSection ? legSection.leg : null

    let partName = getPartName(part, leg)
    let offsetData = icons[partName.slice(mainPath.length)]
    let { spriteSize, spriteOffset } = offsetData

    let builtPart = sharp(partName.slice(1)) // slice 1 from filename since sharp also reads paths differently
    if (color) builtPart = await recolor(builtPart, color)

    let left = halfCanvas - Math.floor(spriteSize[0] / 2) + spriteOffset[0]
    let top = halfCanvas - Math.floor(spriteSize[1] / 2) - spriteOffset[1]

    if (legSection) {
      left += Math.floor(legSection.xPos)
      top -= Math.floor(legSection.yPos)
      // if (legSection.darken) builtPart.tint({r: 100, g: 100, b: 100})
      if (legSection.rotation) {
        builtPart.rotate(legSection.rotation, {background: TRANSPARENT})
        if (part == "glow") { left--; top--; }
      }
      if (legSection.yScale) builtPart.resize({width: spriteSize[0], height: Math.floor(spriteSize[1] * legSection.yScale), fit: "fill"})
      if (legSection.xFlip) builtPart.flop()
    }

    let layerData = {
      partName, spriteOffset, spriteSize, leg,
      layerName: partNames[part],
      behind: legSection && legSection.darken,
      isGlow: part == "glow",
      input: await builtPart.toBuffer(),
      left, top 
    }

    if (legSection) {
      if (!legLayers[legSection.leg]) legLayers[legSection.leg] = [layerData]
      else legLayers[legSection.leg].push(layerData)
    }

    else layers.push(layerData)
  }

  // build all layers of icon segment (col1, col2, glow, extra)
  async function buildFullLayer(legSection) {
    let hasExtra = fs.existsSync(getPartName("extra", legSection ? legSection.leg : null).slice(1))

    if (form.form == "bird" && !topless) await addLayer(3, null, legSection) // ufo top
    await addLayer(2, col2, legSection) // secondary color
    if (useGlow) await addLayer("glow", glowColor, legSection) // glow
    await addLayer(1, col1, legSection) // primary color
    if (hasExtra) await addLayer("extra", colW, legSection) // extra

    // if (legSection) {
    //   let foundLeg = legLayers[legSection.leg]
    //   foundLeg.forEach(x => layers.push(x))
    // }
  }

  let layers = []
  let legLayers = []
  let legData = form.legs ? legOffsets[form.form] || [] : []
  let parentSize = icons[getPartName(1).slice(mainPath.length)].spriteSize
  let canvas = sharp({create: {width: canvasSize, height: canvasSize, channels: 4, background: TRANSPARENT}})

  // if (legData.length) {
  //   for (let i=0; i<legData.length; i++) {
  //     await buildFullLayer(legData[i])
  //   }
  // }

  await buildFullLayer()

  // if (legData.length) layers = legLayers.flat().filter(x => x).sort((a, b) => !!b.behind - !!a.behind).sort((a, b) => !!b.isGlow - !!a.isGlow)

  canvas.composite(layers)

  let rawData = await canvas.toBuffer({resolveWithObject: true})
  let minX = canvasSize; let maxX = 0;
  let minY = canvasSize; let maxY = 0;
  for (let i=0; i<rawData.data.length; i += 4) { // [R, G, B, A]
    let pixelIndex = i/4
    let x = pixelIndex % canvasSize;
    let y = Math.floor(pixelIndex / canvasSize);
    let alpha = rawData.data[i + 3];
    if (alpha > 0) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y 
    }
  }

  // need to make a new sharp instance so everything is merged. bit hacky but it works
  let dimensions = [maxX - minX, maxY - minY]

  if (!psdExport) {
    let finalIcon = sharp(rawData.data, {raw: {width: canvasSize, height: canvasSize, channels: 4}})
    .extract({left: minX, top: minY, width: dimensions[0], height: dimensions[1]})

    if (customSize) {
      let isThicc = dimensions[0] > dimensions[1]
      let squareSize = req.query.size == "auto" ? (isThicc ? dimensions[0] : dimensions[1]) : Math.floor(req.query.size)
      if (squareSize < 32) squareSize = 32
      if (squareSize > 256) squareSize = 256

      // use longest side to make square
      if (isThicc) finalIcon.resize({
        width: dimensions[isThicc ? 0 : 1],
        height: dimensions[isThicc ? 0 : 1],
        fit: "contain",
        background: TRANSPARENT
      })
      finalIcon.resize({width: squareSize, height: squareSize, fit: "contain", background: TRANSPARENT})
    }
    finalIcon.png().toBuffer().then(x => {
      res.end(x) // send file
      if (cachable) { // cache for a bit
        cache[iconCode] = { buffer: x, timeoutID: setTimeout(function() {delete cache[iconCode]}, 10000000) } // cache file for 3 hours
        if (userCode) cache[userCode] = { buffer: x, timeoutID: setTimeout(function() {delete cache[userCode]}, 300000) }  // 5 min cache for player icons
      }
     })
  }

  else {
    let psdLayers = layers.map(x => {
      let Image = Canvas.Image
      let canvas = Canvas.createCanvas(...dimensions)
      let ctx = canvas.getContext('2d');
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0 + x.left - minX, 0 + x.top - minY)
      } 
      img.onerror = err => { throw err }
      img.src = x.input
      return {name: x.layerName, canvas, leg: x.leg}
    })

    if (form.legs) {
      let legLayers = []
      for (let i=1; i<=form.legs + 1; i++) legLayers.push({name: i == 1 ? "Base" : `Leg ${i}`, opened: true, children: []})
      psdLayers.forEach(x => {
        legLayers[x.leg-1].children.push(x)
      })
      psdLayers = legLayers.reverse()
    }
  
    const photoshop = {
      width: dimensions[0],
      height: dimensions[1],
      children: psdLayers
    };
  
    const buffer = psd.writePsdBuffer(photoshop);
    return res.end(buffer)
  }
  
}


// ==================================== //

// OLD CODE IS BEING USED FOR ROBOTS AND SPIDERS
let formCheck = forms[req.query.form]
if (formCheck && formCheck.legs) return app.run.icon_old(app, req, res)

let username = req.params.text
let userCode;
res.contentType('image/png');

if (req.offline || req.query.hasOwnProperty("noUser") || req.query.hasOwnProperty("nouser") || username == "icon") return buildIcon()

else if (app.config.cachePlayerIcons && !Object.keys(req.query).filter(x => !["form", "forceGD"].includes(x)).length) {
  userCode = `${req.id}u-${username.toLowerCase()}-${forms[req.query.form] ? req.query.form : 'cube'}`
  if (cache[userCode]) return res.end(cache[userCode].value)
}

let accountMode = !req.query.hasOwnProperty("player") && Number(req.params.id)
let foundID = app.userCache(req.id, username)
let skipRequest = accountMode || foundID
let forceGD = req.query.hasOwnProperty("forceGD")

// skip request by causing fake error lmao
req.gdRequest(skipRequest ? "" : 'getGJUsers20', skipRequest ? {} : req.gdParams({ str: username, forceGD }, !forceGD), function (err1, res1, body1) {

  let result = foundID ? foundID[0] : (accountMode || err1) ? username : app.parseResponse(body1)[16];

  req.gdRequest('getGJUserInfo20', req.gdParams({ targetAccountID: result, forceGD }, !forceGD), function (err2, res2, body2) {

    if (err2) return buildIcon();
    let iconData = app.parseResponse(body2)
    if (!foundID && !forceGD) app.userCache(req.id, iconData[16], iconData[2], iconData[1])
    return buildIcon(iconData, userCode);

  })
});

}
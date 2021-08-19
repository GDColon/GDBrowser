// this file is a potential candidate for worst code on github
// i advise you to turn back now
// seriously, it's not too late

const Jimp = require('jimp');
const fs = require('fs');
const icons = require('../icons/gameSheet.json');
const colors = require('../icons/colors.json');
const forms = require('../icons/forms.json')
const offsets = require('../icons/offsets.json');

let hexRegex = /^[A-Fa-f0-9]{6}$/
function hexConvert(hex) { hex = hex.replace('#', ''); return {r: '0x' + hex[0] + hex[1] | 0, g: '0x' + hex[2] + hex[3] | 0, b: '0x' + hex[4] + hex[5] | 0}; }
function recolor(img, col) {
  return img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    if (img.bitmap.data.slice(idx, idx+3).every(function(val) {return val >= 20 && val <= 255})) { // If it's not "black, i.e. we want to recolor it"
      this.bitmap.data[idx] = colors[col].r / (255 / this.bitmap.data[idx]);
      this.bitmap.data[idx + 1] = colors[col].g / (255 / this.bitmap.data[idx + 1]);
      this.bitmap.data[idx + 2] = colors[col].b / (255 / this.bitmap.data[idx + 2]);
    }
  })
}

/* Caveat of genFileName is that if there are any falsey values in the arguments they are ignored. 
This is usually a good thing though - avoid issues by not putting something like 0 instead of '0' */
function genFileName(...args) { return args.filter(function(val) {return val}).join('_') +'_001.png' }
function fromIcons(filename) { return `./icons/${filename}` }
let cache = {};

module.exports = async (app, req, res) => {

  function buildIcon(account=[], usercode) {

      let { form, ind } = forms[req.query.form] || {};
      form = form || 'player';
      ind = ind || 21;

      let iconID = req.query.icon || account[ind] || 1;
      let col1 = req.query.col1 || account[10] || 0;
      let col2 = req.query.col2 || account[11] || 3;
      let colG = req.query.colG || req.query.colg
      let colW = req.query.colW || req.query.colw || req.query.col3
      let outline = req.query.glow || account[28] || "0";

      let topless = form == "bird" && req.query.topless
      let drawLegs = !(req.query.noLegs > 0)
      let autoSize = req.query.size == "auto"
      let sizeParam = autoSize || (req.query.size && !isNaN(req.query.size))
      if (outline == "0" || outline == "false") outline = false;

      if (iconID && iconID.toString().length == 1) iconID = "0" + iconID;

      function genImageName(...args) { return genFileName(form, iconID, ...args) }

      let icon, glow, extra;
      function setBaseIcons() {
        icon = genImageName(isSpecial && '01');
        glow = genImageName(isSpecial && '01', '2');
        extra = genImageName(isSpecial && '01', 'extra');
      }
      let isSpecial = ['robot', 'spider'].includes(form);
      setBaseIcons();

      if (!fs.existsSync(fromIcons(icon)) || (isSpecial && !fs.existsSync(fromIcons(genImageName('02'))))) {
        iconID = '01';
        setBaseIcons();
      }

      let ex = fromIcons(extra)
      let hasExtra = fs.existsSync(ex)

      let cols = [col1, col2, colG, colW]
      cols.forEach(col => {
        if (!col) return
        col = col.toString()
        if (col.match(hexRegex)) colors[col.toLowerCase()] = hexConvert(col)
      })

      if (!colors[col1] || isNaN(colors[col1].r)) col1 = colors[+col1] ? +col1 : 0
      if (!colors[col2] || isNaN(colors[col2].r)) col2 = colors[+col2] ? +col2 : 3
      if (!colors[colG] || isNaN(colors[colG].r)) colG = colors[+colG] ? +colG : null
      if (!colors[colW] || isNaN(colors[colW].r)) colW = colors[+colW] ? +colW : null
      if (colW && (!hasExtra || colW == 12)) colW = null

      if (col1 == 15 || col1 === "000000") outline = true;

      let iconCode = `${req.query.form == "cursed" ? "cursed" : form}${topless ? "top" : ""}-${iconID}-${col1}-${col2}-${colG || "x"}-${colW || "x"}-${outline ? 1 : 0}` 

      if (!sizeParam && (!isSpecial || drawLegs) && cache[iconCode]) return res.end(cache[iconCode].value)

      let useExtra = false
      let originalOffset = icons[icon].spriteOffset;
      let minusOrigOffset = function(x, y) { return x - originalOffset[y] }
      let offset = icons[glow].spriteOffset.map(minusOrigOffset);
      let robotLeg1, robotLeg2, robotLeg3, robotLeg3b, robotLeg2b, robotLeg1b, robotLeg1c;
      let robotOffset1, robotOffset2, robotOffset3, robotOffset1b, robotOffset2b, robotOffset3b;
      let robotGlow1, robotGlow2, robotGlow3, glowOffset
      let ufoTop, ufoOffset, ufoCoords, ufoSprite
      let extrabit, offset2, size2;

      if (isSpecial) {
        const legs = [1,2,3].map(function(val) {return genImageName(`0${val+1}`)});
        const glows = [1,2,3].map(function(val) {return genImageName(`0${val+1}`, '2')});
        robotOffset1 = icons[legs[0]].spriteOffset.map(minusOrigOffset).concat(icons[legs[0]].spriteSize);
        robotOffset2 = icons[legs[1]].spriteOffset.map(minusOrigOffset).concat(icons[legs[1]].spriteSize);
        robotOffset3 = icons[legs[2]].spriteOffset.map(minusOrigOffset).concat(icons[legs[2]].spriteSize);

        robotOffset1b = icons[glows[0]].spriteOffset.map(minusOrigOffset).concat(icons[glows[0]].spriteSize);
        robotOffset2b = icons[glows[1]].spriteOffset.map(minusOrigOffset).concat(icons[glows[1]].spriteSize);
        robotOffset3b = icons[glows[2]].spriteOffset.map(minusOrigOffset).concat(icons[glows[2]].spriteSize);

        robotLeg1 = new Jimp(fromIcons(legs[0])); robotGlow1 = new Jimp(fromIcons(glows[0]))
        robotLeg2 = new Jimp(fromIcons(legs[1])); robotGlow2 = new Jimp(fromIcons(glows[1]))
        robotLeg3 = new Jimp(fromIcons(legs[2])); robotGlow3 = new Jimp(fromIcons(glows[2]))

        glowOffset = offsets[form][+iconID] || []
      }

      Jimp.read(fromIcons(glow)).then(async function (image) {

        let size = [image.bitmap.width, image.bitmap.height]
        let glow = recolor(image, col2)
        let imgOff = isSpecial ? 100 : 0

        let eb = fromIcons(extra)
        if (fs.existsSync(eb)) {
          extrabit = icons[extra]
          offset2 = extrabit.spriteOffset.map(minusOrigOffset);
          size2 = extrabit.spriteSize;
          extra = new Jimp(eb);
          if (colW) await Jimp.read(eb).then(e => { extra = recolor(e, colW) })
          useExtra = true
        }

        Jimp.read(fromIcons(icon)).then(async function (ic) {

          let iconSize = [ic.bitmap.width, ic.bitmap.height]
          recolor(ic, col1)
          ic.composite(glow, (iconSize[0] / 2) - (size[0] / 2) + offset[0], (iconSize[1] / 2) - (size[1] / 2) - offset[1], { mode: Jimp.BLEND_DESTINATION_OVER })

          if (form == "bird" && !topless) {
            ufoTop = genImageName('3')
            ufoOffset = icons[ufoTop].spriteOffset.map(minusOrigOffset).concat(icons[ufoTop].spriteSize);
            ufoCoords = [imgOff + (iconSize[0] / 2) - (ufoOffset[2] / 2) + ufoOffset[0], (iconSize[1] / 2) - (ufoOffset[3] / 2) - ufoOffset[1] + 300 - iconSize[1]]
            ufoSprite = fromIcons(ufoTop)
            ic.contain(iconSize[0], 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_BOTTOM)
            // Only add dome if there's no glow, otherwise the dome will be outlined as well
            if (!outline) ic.composite(await Jimp.read(ufoSprite), ufoCoords[0], ufoCoords[1], {mode: Jimp.BLEND_DESTINATION_OVER})
          }

          if (drawLegs && (form == "robot" || req.query.form == "cursed")) {

            ic.contain(iconSize[0], 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_TOP)
            ic.contain(iconSize[0] + 200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_TOP)

            await Jimp.read(new Jimp(robotGlow1)).then(rob => {
              rob.rotate(-45)
              robotGlow1 = recolor(rob, col2)
            })

            await Jimp.read(new Jimp(robotGlow2)).then(rob => {
              rob.rotate(45)
              robotGlow2 = recolor(rob, col2)
            })

            await Jimp.read(new Jimp(robotGlow3)).then(rob => {
              robotGlow3 = recolor(rob, col2)
            })

            await Jimp.read(new Jimp(robotLeg1)).then(rob => {
              rob.rotate(-45)
              recolor(rob, col1)
              rob.composite(robotGlow1, (robotOffset1[2] - robotOffset1b[2]) + (glowOffset[0] || 1), ((robotOffset1[3] - robotOffset1b[3]) / 2) + (glowOffset[1] || 0), { mode: Jimp.BLEND_DESTINATION_OVER })
              robotLeg1 = rob
            })

            await Jimp.read(new Jimp(robotLeg2)).then(rob => {
              rob.rotate(45)
              recolor(rob, col1)
              rob.composite(robotGlow2, ((robotOffset2[2] - robotOffset2b[2]) / 4) + (glowOffset[4] || 0), ((robotOffset2[3] - robotOffset2b[3]) / 2) + (glowOffset[5] || 0), { mode: Jimp.BLEND_DESTINATION_OVER })
              robotLeg2 = rob
            })

            await Jimp.read(new Jimp(robotLeg2)).then(rob => {
              robotLeg2b = rob.color([{ apply: 'darken', params: [20] }]).rotate(-5)
            })

            await Jimp.read(new Jimp(robotLeg3)).then(rob => {
              recolor(rob, col1)
              rob.composite(robotGlow3, ((robotOffset3[2] - robotOffset3b[2]) / 2) + (glowOffset[2] || 0), ((robotOffset3[3] - robotOffset3b[3]) / 2) + (glowOffset[3] || 0), { mode: Jimp.BLEND_DESTINATION_OVER })
              robotLeg3 = rob
            })

            await Jimp.read(new Jimp(robotLeg3)).then(rob => {
              robotLeg3b = rob.color([{ apply: 'darken', params: [10] }])
            })

            ic.composite(robotLeg2b, 100 + (iconSize[0] / 2) - (robotOffset2[2]) + robotOffset2[0] - 31, (iconSize[1] / 2) - (robotOffset2[3]) - robotOffset2[1] + 73)
            ic.composite(robotLeg3b, 100 + (iconSize[0] / 2) - (robotOffset3[2]) + robotOffset3[0] + 20, (iconSize[1] / 2) - (robotOffset3[3]) - robotOffset3[1] + 78)
            ic.composite(robotLeg2, 100 + (iconSize[0] / 2) - (robotOffset2[2]) + robotOffset2[0] - 20, (iconSize[1] / 2) - (robotOffset2[3]) - robotOffset2[1] + 73)
            ic.composite(robotLeg3, 100 + (iconSize[0] / 2) - (robotOffset3[2]) + robotOffset3[0] + 40, (iconSize[1] / 2) - (robotOffset3[3]) - robotOffset3[1] + 78)
            ic.composite(robotLeg1, 100 + (iconSize[0] / 2) - (robotOffset1[2]) + robotOffset1[0] - 20, (iconSize[1] / 2) - (robotOffset1[3]) - robotOffset1[1] + 50)

          }

          else if (drawLegs && form == "spider") {

            let spiderBody;
            ic.contain(iconSize[0], 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_TOP)
            ic.contain(iconSize[0] + 200, 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_TOP)

            if (iconID == "07") {
              robotOffset2[2] -= 10
              robotOffset2[1] += 12
              robotOffset1b[3] -= 105
              robotOffset2b[3] -= 150
              robotOffset2b[2] -= 60
            }

            if (iconID == "16") {
              robotOffset1b[3] -= 100
              robotOffset2b[3] -= 200
              robotOffset2b[2] -= 30
            }

            await Jimp.read(new Jimp(robotGlow1)).then(rob => {
              if (robotGlow1.bitmap.width < 10) robotGlow1.opacity(0)
              else robotGlow1 = recolor(rob, col2)
            })

            await Jimp.read(new Jimp(robotGlow2)).then(rob => {
              robotGlow2 = recolor(rob, col2)
            })

            await Jimp.read(new Jimp(robotGlow3)).then(rob => {
              robotGlow3 = recolor(rob, col2)
            })

            await Jimp.read(new Jimp(robotLeg1)).then(rob => {
              recolor(rob, col1)
              rob.composite(robotGlow1, ((robotOffset1[2] - robotOffset1b[2]) / 2) + (glowOffset[2] || 0), ((robotOffset1[3] - robotOffset1b[3]) / 4) + (glowOffset[3] || 0), { mode: Jimp.BLEND_DESTINATION_OVER })
              robotLeg1 = rob
            })

            await Jimp.read(new Jimp(robotLeg2)).then(rob => {
              recolor(rob, col1)
              rob.composite(robotGlow2, ((robotOffset2[2] - robotOffset2b[2]) / 6) + (glowOffset[0] || 0), ((robotOffset2[3] - robotOffset2b[3]) / 6) + (glowOffset[1] || 0), { mode: Jimp.BLEND_DESTINATION_OVER })
              rob.rotate(-40)
              robotLeg2 = rob
            })

            await Jimp.read(new Jimp(robotLeg1)).then(rob => {
              robotLeg1b = rob.color([{ apply: 'darken', params: [20] }])
            })

            await Jimp.read(new Jimp(robotLeg1b)).then(rob => {
              robotLeg1c = rob.mirror(true, false)
            })

            await Jimp.read(new Jimp(robotLeg3)).then(rob => {
              recolor(rob, col1)
              rob.composite(robotGlow3, ((robotOffset3[2] - robotOffset3b[2]) / 2) + (glowOffset[4] || 0), ((robotOffset3[3] - robotOffset3b[3]) / 2) + (glowOffset[5] || 0), { mode: Jimp.BLEND_DESTINATION_OVER })
              robotLeg3 = rob
            })

            await Jimp.read(new Jimp(ic)).then(rob => {
              spiderBody = rob
            })

            ic.composite(robotLeg3, 100 + (iconSize[0] / 2) - (robotOffset3[2]) + (robotOffset3[0]), (iconSize[1] / 2) - (robotOffset2[3]) - robotOffset2[1] + 77)
            ic.composite(robotLeg1b, 100 + (iconSize[0] / 2) - (robotOffset1[2]) + robotOffset1[0] + 35, (iconSize[1] / 2) - (robotOffset1[3]) - robotOffset1[1] + 70)
            ic.composite(robotLeg1c, 100 + (iconSize[0] / 2) - (robotOffset1[2]) + robotOffset1[0] + 75, (iconSize[1] / 2) - (robotOffset1[3]) - robotOffset1[1] + 70)
            // ^ BELOW
            ic.composite(spiderBody, 0, 0)
            // v ABOVE
            ic.composite(robotLeg2, 100 + (iconSize[0] / 2) - (robotOffset2[2]) + robotOffset2[0] - 60, (iconSize[1] / 2) - (robotOffset2[3]) - robotOffset2[1] + 75)
            ic.composite(robotLeg1, 100 + (iconSize[0] / 2) - (robotOffset1[2]) + robotOffset1[0] + 7, (iconSize[1] / 2) - (robotOffset1[3]) - robotOffset1[1] + 70)
          }

          // every now and then jimp does a fucky wucky uwu and this line errors. seems to be an issue with the lib itself :v
          try { if (useExtra) ic.composite(extra, imgOff + (iconSize[0] / 2) - (size2[0] / 2) + offset2[0], (iconSize[1] / 2) - (size2[1] / 2) - offset2[1] + (form == "bird" && !req.query.topless ? 300 - iconSize[1] : 0)) }
          catch(e) {}

          let finalSize = [ic.bitmap.width, ic.bitmap.height]

          function finish(img) {
            img.autocrop(0.01, false)
            if (form == "swing") img.resize(120, 111)
            if (img.bitmap.height == 300) ic.autocrop(1, false)
            if (sizeParam) {
              let thicc = img.bitmap.width > img.bitmap.height
              let imgSize = req.query.size == "auto" ? (thicc ? img.bitmap.width : img.bitmap.height) : Math.round(req.query.size)
              if (imgSize < 32) imgSize = 32
              if (imgSize > 512) imgSize = 512
              if (thicc) img.contain(img.bitmap.width, img.bitmap.width, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
              else img.contain(img.bitmap.height, img.bitmap.height, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE)
              img.resize(imgSize, Jimp.AUTO)
            }
            img.getBuffer(Jimp.AUTO, (err, buffer) => {
              if (!sizeParam && drawLegs) {
                cache[iconCode] = { value: buffer, timeoutID: setTimeout(function() {delete cache[iconCode]}, 10000000) }   // 3 hour cache
                if (usercode) cache[usercode] = { value: buffer, timeoutID: setTimeout(function() {delete cache[usercode]}, 300000) }  // 5 min cache for player icons
              }
              return res.end(buffer, 'base64')
            })
          }

          if (!outline) return finish(ic)

          else {

            ic.getBuffer(Jimp.AUTO, function (err, buff) {

              const Canvas = require('canvas')
                , Image = Canvas.Image
                , canvas = Canvas.createCanvas(finalSize[0] + 10, finalSize[1] + 10)
                , ctx = canvas.getContext('2d');

              if (!colG) colG = (col2 == 15 || col2 == "000000" ? col1 : col2)
              if (colG == 15 || colG == "000000") colG = 12

              const img = new Image()
              img.onload = () => {
                var dArr = [-1, -1, 0, -1, 1, -1, -1, 0, 1, 0, -1, 1, 0, 1, 1, 1], // offset array
                  s = 2, i = 0, x = canvas.width / 2 - finalSize[0] / 2, y = canvas.height / 2 - finalSize[1] / 2;

                for (; i < dArr.length; i += 2) ctx.drawImage(img, x + dArr[i] * s, y + dArr[i + 1] * s);

                ctx.globalCompositeOperation = "source-in";
                ctx.fillStyle = `rgba(${colors[colG].r}, ${colors[colG].g}, ${colors[colG].b}, 1})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = "source-over";
                ctx.imageSmoothingEnabled = false;

                // Add UFO top last so it doesn't get glow'd
                if (form == "bird" && !topless) {
                  const dome = new Image()
                  dome.src = ufoSprite
                  ctx.drawImage(dome, ufoCoords[0]+5, ufoCoords[1]+5)
                }

                ctx.drawImage(img, x, y)

              }

              img.onerror = err => { throw err }
              img.src = buff

              Jimp.read(canvas.toBuffer()).then(b => {
                return finish(b)
              })
            })
          }
        })
      })
    }

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

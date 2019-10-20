const request = require('request')
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const icons = require('../icons/gameSheet.json');
const colors = require('../misc/colors.json');
const queryMapper = {
  ship: {
    form: 'ship',
    ind: 22
  },
  ball: {
    form: 'player_ball',
    ind: 23
  },
  ufo: {
    form: 'bird',
    ind: 24
  },
  wave: {
    form: 'dart',
    ind: 25
  },
  robot: {
    form: 'robot',
    ind: 26
  },
  spider: {
    form: 'spider',
    ind: 43
  },
  cursed: {
    form: 'spider',
    ind: 43
  }
}
function recolor(img, col) {
  return img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
    if (img.bitmap.data.slice(idx, idx+3).every(function(val) {return val >= 20 && val <= 255})) { // If it's not "black, i.e. we want to recolor it"
      this.bitmap.data[idx] = colors[col].r / (255 / this.bitmap.data[idx]);
      this.bitmap.data[idx + 1] = colors[col].g / (255 / this.bitmap.data[idx + 1]);
      this.bitmap.data[idx + 2] = colors[col].b / (255 / this.bitmap.data[idx + 2]);
    }
  })
}
/*
Caveat of genFileName is that if there are any falsey values in the arguments they are ignored. 
This is usually a good thing though - avoid issues by not putting something like 0 instead of '0'
*/
function genFileName(...args) {
  return args.filter(function(val) {return val}).join('_')+'_001.png';
}
function fromIcons(filename) {
  return `./icons/${filename}`;
}
let cache = {};
module.exports = async (app, req, res) => {

  let username = req.params.text

  request.post('http://boomlings.com/database/getGJUsers20.php', {
    form: {
      str: username,
      secret: 'Wmfd2893gb7'
    }
  }, function (err1, res1, body1) {
    let response = body1.split('#')[0].split(':');
    let result = {};
    for (let i = 0; i < response.length; i += 2) {
      result[response[i]] = response[i + 1]
    }

    request.post('http://boomlings.com/database/getGJUserInfo20.php', {
      form: {
        targetAccountID: result[16],
        secret: 'Wmfd2893gb7'
      }
    }, function (err2, res2, body2) {

      let response2 = body2 == "-1" ? '' : body2.split('#')[0].split(':');
      let account = {};
      for (let i = 0; i < response2.length; i += 2) {
        account[response2[i]] = response2[i + 1]
      }

      let { form, ind } = queryMapper[req.query.form] || {};
      form = form || 'player';
      ind = ind || 21;

      let iconID = req.query.icon || account[ind] || 1;
      let col1 = req.query.col1 || account[10] || 1;
      let col2 = req.query.col2 || account[11] || 3;
      let outline = req.query.glow || account[28] || "0";

      if (outline == "0") outline = false;

      if (iconID && iconID.toString().length == 1) iconID = "0" + iconID;

      if (col1 == 15) outline = true;
      function genImageName(...args) {
        return genFileName(form, iconID, ...args);
      }
      let icon, glow, extra;
      function setBaseIcons() {
        icon = genImageName(isSpecial && '01');
        glow = genImageName(isSpecial && '01', '2');
        extra = genImageName(isSpecial && '01', 'extra');
      }
      const isSpecial = ['robot', 'spider'].includes(form);
      setBaseIcons();

      if (!fs.existsSync(fromIcons(icon)) || (isSpecial && !fs.existsSync(fromIcons(genImageName('02'))))) {
        iconID = '01';
        setBaseIcons();
        // Condition on next line should never be satisfied but you never know!
        if (!fs.existsSync(fromIcons(icon))) return res.sendFile(path.join(__dirname, '../assets/unknownIcon.png'))
      }

      if (!colors[col1]) col1 = 1
      if (!colors[col2]) col2 = 3

      let iconCode = `${form}-${iconID}-${col1}-${col2}-${outline ? 1 : 0}` 
      
      if (cache[iconCode]) {
        clearTimeout(cache[iconCode].timeoutID);
        cache[iconCode].timeoutID = setTimeout(function() {delete cache[iconCode]}, 600000);
        return res.end(cache[iconCode].value);
      }

      let useExtra = false

      let originalOffset = icons[icon].spriteOffset;
      const minusOrigOffset = function(x, y) { return x - originalOffset[y] }
      let offset = icons[glow].spriteOffset.map(minusOrigOffset);
      let robotLeg1, robotLeg2, robotLeg3, robotLeg3b, robotLeg2b, robotLeg1b, robotLeg1c;
      let robotOffset1, robotOffset2, robotOffset3, robotOffset1b, robotOffset2b, robotOffset3b;
      let robotGlow1, robotGlow2, robotGlow3;
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
      }

      res.contentType('image/png');
      let extrabit, offset2, size2;
      if (fs.existsSync(extra)) {
        extrabit = icons[extra]
        offset2 = extrabit.spriteOffset.map(minusOrigOffset);
        size2 = extrabit.spriteSize;

        extra = new Jimp(extra);
        useExtra = true
      }

      Jimp.read(fromIcons(glow)).then(async function (image) {

        let size = [image.bitmap.width, image.bitmap.height]
        let glow = recolor(image, col2)
        let imgOff = isSpecial ? 100 : 0

        Jimp.read(fromIcons(icon)).then(async function (ic) {

          let iconSize = [ic.bitmap.width, ic.bitmap.height]
          recolor(ic, col1)
          ic.composite(glow, (iconSize[0] / 2) - (size[0] / 2) + offset[0], (iconSize[1] / 2) - (size[1] / 2) - offset[1], { mode: Jimp.BLEND_DESTINATION_OVER })

          if (form == "ufo") {
            ic.contain(iconSize[0], iconSize[1] * 1.1, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_CENTER)
            //ic.contain(iconSize[0], 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_BOTTOM)
            //ic.composite(ufoTop, (iconSize[0] / 2) - (size[0] / 2) + 7, iconSize[1] + topOffset[3] + 30, {mode: Jimp.BLEND_DESTINATION_OVER})
          }

          if (form == "robot") {

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
              rob.composite(robotGlow1, (robotOffset1[2] - robotOffset1b[2]) + 1, (robotOffset1[3] - robotOffset1b[3]) / 2, { mode: Jimp.BLEND_DESTINATION_OVER })
              robotLeg1 = rob
            })

            await Jimp.read(new Jimp(robotLeg2)).then(rob => {
              rob.rotate(45)
              recolor(rob, col1)
              rob.composite(robotGlow2, (robotOffset2[2] - robotOffset2b[2]) / 2, (robotOffset2[3] - robotOffset2b[3]) / 2, { mode: Jimp.BLEND_DESTINATION_OVER })
              robotLeg2 = rob
            })

            await Jimp.read(new Jimp(robotLeg2)).then(rob => {
              robotLeg2b = rob.color([{ apply: 'darken', params: [20] }]).rotate(-5)
            })

            await Jimp.read(new Jimp(robotLeg3)).then(rob => {
              recolor(rob, col1)
              rob.composite(robotGlow3, (robotOffset3[2] - robotOffset3b[2]) / 2 - 2, (robotOffset3[3] - robotOffset3b[3]) / 2, { mode: Jimp.BLEND_DESTINATION_OVER })
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


          if (form == "spider") {

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
              rob.composite(robotGlow1, (robotOffset1[2] - robotOffset1b[2]) / 2, (robotOffset1[3] - robotOffset1b[3]) / 4, { mode: Jimp.BLEND_DESTINATION_OVER })
              robotLeg1 = rob
            })

            await Jimp.read(new Jimp(robotLeg2)).then(rob => {
              recolor(rob, col1)
              rob.composite(robotGlow2, (robotOffset2[2] - robotOffset2b[2]) / 6, (robotOffset2[3] - robotOffset2b[3]) / 6, { mode: Jimp.BLEND_DESTINATION_OVER })
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
              rob.composite(robotGlow3, (robotOffset3[2] - robotOffset3b[2]) / 2, (robotOffset3[3] - robotOffset3b[3]) / 2, { mode: Jimp.BLEND_DESTINATION_OVER })
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

          if (useExtra) ic.composite(extra, imgOff + (iconSize[0] / 2) - (size2[0] / 2) + offset2[0], (iconSize[1] / 2) - (size2[1] / 2) - offset2[1])
          if (form != "ufo") ic.autocrop(0.01, false)
          else if (ic.bitmap.height == '300') ic.autocrop(1, false)

          let finalSize = [ic.bitmap.width, ic.bitmap.height]

          ic.getBuffer(Jimp.AUTO, function (err, buff) {

            if (!outline) { 
              cache[iconCode] = {
                value: buff,
                timeoutID: setTimeout(function() {delete cache[iconCode]}, 600000)
              }
              return res.end(buff)
            }

            //else if (ufoMode) {
            //  return res.end(buff)
            //}

            else {

              const Canvas = require('canvas')
                , Image = Canvas.Image
                , canvas = Canvas.createCanvas(finalSize[0] + 10, finalSize[1] + 10)
                , ctx = canvas.getContext('2d');

              if (col2 == 15) col2 = col1;
              if (col1 == 15 && col2 == 15) col2 = 12;

              const img = new Image()
              img.onload = () => {
                var dArr = [-1, -1, 0, -1, 1, -1, -1, 0, 1, 0, -1, 1, 0, 1, 1, 1], // offset array
                  s = 2, i = 0, x = canvas.width / 2 - finalSize[0] / 2, y = canvas.height / 2 - finalSize[1] / 2;

                for (; i < dArr.length; i += 2)
                  ctx.drawImage(img, x + dArr[i] * s, y + dArr[i + 1] * s);

                ctx.globalCompositeOperation = "source-in";
                ctx.fillStyle = `rgba(${colors[col2].r}, ${colors[col2].g}, ${colors[col2].b}, 1})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = "source-over";
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, x, y)
              }

              img.onerror = err => { throw err }
              img.src = buff;
              const buffer = canvas.toBuffer();
              cache[iconCode] = {
                value: buffer,
                timeoutID: setTimeout(function() {delete cache[iconCode]}, 600000)
              }
              return res.end(buffer, 'base64');

            }
          })
        })
      })

    })
  });

}

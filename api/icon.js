const request = require('request')
const Jimp = require('jimp');
const plist = require('plist');
const fs = require('fs');
const path = require('path');
const icons = plist.parse(fs.readFileSync("./icons/GJ_GameSheet02-uhd.plist", 'utf8')).frames
const colors = require('../misc/colors.json')
let cache = {};
module.exports = async (app, req, res) => {

  let username = req.params.text
  let form = 'player'

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

      let response2 = body2.split('#')[0].split(':');
      let account = {};
      for (let i = 0; i < response2.length; i += 2) {
        account[response2[i]] = response2[i + 1]
      }

      let iconID = account[21]
      let col1 = account[10]
      let col2 = account[11]
      let outline = account[28]

      if (body2 == "-1") {
        iconID = "1"
        col1 = "1"
        col2 = "3"
        outline = "0"
      }

      if (req.query.form == 'ship') { form = 'ship'; iconID = account[22] }
      if (req.query.form == 'ball') { form = 'player_ball'; iconID = account[23] }
      if (req.query.form == 'ufo') { form = 'bird'; iconID = account[24] }
      if (req.query.form == 'wave') { form = 'dart'; iconID = account[25] }
      if (req.query.form == 'robot') { form = 'robot'; iconID = account[26] }
      if (req.query.form == 'spider' || req.query.form == 'cursed') { form = 'spider'; iconID = account[43] }

      if (req.query.icon) iconID = req.query.icon
      if (req.query.col1) col1 = req.query.col1
      if (req.query.col2) col2 = req.query.col2
      if (req.query.glow) outline = req.query.glow

      if (!iconID) iconID = 1;

      if (outline == "0") outline = false;

      if (iconID && iconID.toString().length == 1) iconID = "0" + iconID

      if (col1 == 15) outline = true

      let robotHead = ""; let robotMode = false; let spiderMode = false; 
      if (form == "robot" || req.query.form == "cursed") { robotHead = "01_"; robotMode = true }
      else if (form == "spider") { robotHead = "01_"; spiderMode = true }

      if ((robotMode || spiderMode) && !fs.existsSync(`./icons/${form}_${iconID}_02_001.png`)) iconID = "01"

      let robotLeg1 = `${form}_${iconID}_02_001.png`; let robotOffset1; let robotGlow1 = `${form}_${iconID}_02_2_001.png`;
      let robotLeg2 = `${form}_${iconID}_03_001.png`; let robotOffset2; let robotGlow2 = `${form}_${iconID}_03_2_001.png`;
      let robotLeg3 = `${form}_${iconID}_04_001.png`; let robotOffset3; let robotGlow3 = `${form}_${iconID}_04_2_001.png`;
      let robotLeg3b; let robotLeg2b; let robotLeg1b; let robotLeg1c;

      let icon = `./icons/${form}_${iconID}_${robotHead}001.png`
      let glow = `./icons/${form}_${iconID}_${robotHead}2_001.png`
      let extra = `./icons/${form}_${iconID}_${robotHead}extra_001.png`

      if (!fs.existsSync(icon)) {
        iconID = '01'
        icon = `./icons/${form}_01_${robotHead}001.png`;
        glow = `./icons/${form}_01_${robotHead}2_001.png`;
      }

      if (!fs.existsSync(icon)) return res.sendFile(path.join(__dirname, '../assets/unknownIcon.png'))

      if (!colors[col1]) col1 = 1
      if (!colors[col2]) col2 = 3

      let iconCode = `${form}-${iconID}-${col1}-${col2}-${outline ? 1 : 0}` 
      
      if (cache[iconCode]) {
        clearTimeout(cache[iconCode].timeoutID);
        cache[iconCode].timeoutID = setTimeout(function() {delete cache[iconCode]}, 600000);
        return res.end(cache[iconCode].value);
      }

      let ufoMode = false
      let useExtra = false

      let originalOffset = icons[`${form}_${iconID}_${robotHead}001.png`].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim()))
      let offset = icons[`${form}_${iconID}_${robotHead}2_001.png`].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function (x, y) { return x - originalOffset[y] })

      if (robotMode || spiderMode) {

        robotOffset1 = icons[robotLeg1].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function (x, y) { return x - originalOffset[y] }).concat(icons[robotLeg1].spriteSize.slice(1, -1).split(",").map(x => parseInt(x.trim())))
        robotOffset2 = icons[robotLeg2].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function (x, y) { return x - originalOffset[y] }).concat(icons[robotLeg2].spriteSize.slice(1, -1).split(",").map(x => parseInt(x.trim())))
        robotOffset3 = icons[robotLeg3].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function (x, y) { return x - originalOffset[y] }).concat(icons[robotLeg3].spriteSize.slice(1, -1).split(",").map(x => parseInt(x.trim())))

        robotOffset1b = icons[robotGlow1].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function (x, y) { return x - originalOffset[y] }).concat(icons[robotGlow1].spriteSize.slice(1, -1).split(",").map(x => parseInt(x.trim())))
        robotOffset2b = icons[robotGlow2].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function (x, y) { return x - originalOffset[y] }).concat(icons[robotGlow2].spriteSize.slice(1, -1).split(",").map(x => parseInt(x.trim())))
        robotOffset3b = icons[robotGlow3].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function (x, y) { return x - originalOffset[y] }).concat(icons[robotGlow3].spriteSize.slice(1, -1).split(",").map(x => parseInt(x.trim())))

        robotLeg1 = new Jimp(`./icons/${robotLeg1}`); robotGlow1 = new Jimp(`./icons/${robotGlow1}`)
        robotLeg2 = new Jimp(`./icons/${robotLeg2}`); robotGlow2 = new Jimp(`./icons/${robotGlow2}`)
        robotLeg3 = new Jimp(`./icons/${robotLeg3}`); robotGlow3 = new Jimp(`./icons/${robotGlow3}`)
      }

      res.contentType('image/png');

      function recolor(img, col) {

        return img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
          if (img.bitmap.data.slice(idx, idx+3).every(function(val) {return val >= 20 && val <= 255})) { // If it's not "black, i.e. we want to recolor it"
            this.bitmap.data[idx] = colors[col].r / (255 / this.bitmap.data[idx]);
            this.bitmap.data[idx + 1] = colors[col].g / (255 / this.bitmap.data[idx + 1]);
            this.bitmap.data[idx + 2] = colors[col].b / (255 / this.bitmap.data[idx + 2]);
          }
        })
      }

      if (fs.existsSync(extra)) {
        var extrabit = icons[`${form}_${iconID}_${robotHead}extra_001.png`]
        var offset2 = extrabit.spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function (x, y) { return x - originalOffset[y] })
        var size2 = extrabit.spriteSize.slice(1, -1).split(",").map(x => parseInt(x.trim()))

        extra = new Jimp(extra);
        useExtra = true
      }

      if (form == "bird") {
        //   var ufoName = `bird_${iconID}_3_001.png`
        //   var ufoTop = new Jimp(`./icons/${ufoName}`);
        //   var topOffset = icons[ufoName].spriteOffset.slice(1, -1).split(",").map(x => parseInt(x.trim())).map(function(x, y) {return x - originalOffset[y]}).concat(icons[ufoName].spriteSize.slice(1, -1).split(",").map(x => parseInt(x.trim())))
        //   var ufGlow = new Jimp(`./icons/bird_${iconID}_glow_001.png`);
        //   console.log(topOffset)
        ufoMode = true;
      }

      Jimp.read(glow).then(async function (image) {

        let size = [image.bitmap.width, image.bitmap.height]
        let glow = recolor(image, col2)
        let imgOff = (robotMode || spiderMode) ? 100 : 0

        Jimp.read(icon).then(async function (ic) {

          let iconSize = [ic.bitmap.width, ic.bitmap.height]
          recolor(ic, col1)
          ic.composite(glow, (iconSize[0] / 2) - (size[0] / 2) + offset[0], (iconSize[1] / 2) - (size[1] / 2) - offset[1], { mode: Jimp.BLEND_DESTINATION_OVER })

          if (ufoMode) {
            ic.contain(iconSize[0], iconSize[1] * 1.1, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_CENTER)
            //ic.contain(iconSize[0], 300, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_BOTTOM)
            //ic.composite(ufoTop, (iconSize[0] / 2) - (size[0] / 2) + 7, iconSize[1] + topOffset[3] + 30, {mode: Jimp.BLEND_DESTINATION_OVER})
          }

          if (robotMode) {

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


          if (spiderMode) {

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
          if (!ufoMode) ic.autocrop(0.01, false)
          else if (ic.bitmap.height == '300') ic.autocrop(1, false)

          let finalSize = [ic.bitmap.width, ic.bitmap.height]

          ic.getBuffer(Jimp.AUTO, function (err, buff) {

            if (!outline) { 
              ic.write(`./icons/cache/${iconCode}.png`)
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

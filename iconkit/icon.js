const WHITE = 0xffffff
const colorNames = { "1": "Color 1", "2": "Color 2", "g": "Glow", "w": "White", "u": "UFO Dome" }
const formNames = { "player": "icon", "player_ball": "ball", "bird": "ufo", "dart": "wave" }
const loader = PIXI.Loader.shared

const loadedNewIcons = {}

let positionMultiplier = 4
function positionPart(part, partIndex, layer, formName, isNew, isGlow) {
    layer.position.x += (part.pos[0] * positionMultiplier * (isNew ? 0.5 : 1))
    layer.position.y -= (part.pos[1] * positionMultiplier * (isNew ? 0.5 : 1))
    layer.scale.x = part.scale[0]
    layer.scale.y = part.scale[1]
    if (part.flipped[0]) layer.scale.x *= -1
    if (part.flipped[1]) layer.scale.y *= -1
    layer.angle = part.rotation
    layer.zIndex = part.z

    if (!isGlow) {
        let tintInfo = iconData.robotAnimations.info[formName].tints
        let foundTint = tintInfo[partIndex]
        if (foundTint > 0) {
            let darkenFilter = new PIXI.filters.ColorMatrixFilter();
            darkenFilter.brightness(0)
            darkenFilter.alpha = (255 - foundTint) / 255
            layer.filters = [darkenFilter]
        }
    }
}

function validNum(val, defaultVal) {
    let colVal = +val
    return isNaN(colVal) ? defaultVal : colVal
}

function getGlowColor(colors) {
    let glowCol = colors["g"] || (colors[2] === 0 ? colors[1] : colors[2])
    if (glowCol === 0) glowCol = WHITE // white glow if both colors are black
    return glowCol
}

function validateIconID(id, form) {
    let realID = Math.min(iconData.newIconCounts[form], Math.abs(validNum(id, 1)))
    if (realID == 0 && !["player", "player_ball"].includes(form)) realID = 1
    return realID
}

function parseIconColor(col) {
    if (!col) return WHITE
    else if (typeof col == "string" && col.length >= 6) return parseInt(col, 16)
    let rgb = iconData.colors[col]
    return rgb ? rgbToDecimal(rgb) : WHITE;
}

function parseIconForm(form) {
    let foundForm = iconData.forms[form]
    return foundForm ? foundForm.form : "player"
}

function loadIconLayers(form, id, cb) {
    let iconStr = `${form}_${padZero(validateIconID(id, form))}`
    let texturesToLoad = Object.keys(iconData.gameSheet).filter(x => x.startsWith(iconStr + "_"))

    if (loadedNewIcons[texturesToLoad[0]]) return cb(loader, loader.resources, true)

    else if (!texturesToLoad.length) {
        if (iconData.newIcons.includes(iconStr)) return loadNewIcon(iconStr, cb)
    }

    loader.add(texturesToLoad.filter(x => !loader.resources[x]).map(x => ({ name: x, url: `/iconkit/icons/${x}` })))
    loader.load(cb) // no params
}

// 2.2 icon spritesheets
function loadNewIcon(iconStr, cb) {
    fetch(`/iconkit/newicons/${iconStr}-hd.plist`).then(pl => pl.text()).then(plist => {

        let data = parseNewPlist(plist)
        let sheetName = iconStr + "-sheet"
        loader.add({ name: sheetName, url: `/iconkit/newicons/${iconStr}-hd.png` })
        loader.load((l, resources) => {
            let texture = resources[sheetName].texture
            Object.keys(data).forEach(x => {
                let bounds = data[x]
                let textureRect = new PIXI.Rectangle(bounds.pos[0], bounds.pos[1], bounds.size[0], bounds.size[1])
                let partTexture = new PIXI.Texture(texture, textureRect)
                loadedNewIcons[x] = partTexture
            })
            cb(l, resources, true)
        })

    })
}

let dom_parser = new DOMParser()
function parseNewPlist(data) {
    let plist = dom_parser.parseFromString(data, "text/xml")
    let iconFrames = plist.children[0].children[0].children[1].children
    let positionData = {}
    for (let i=0; i < iconFrames.length; i += 2) {
        let frameName = iconFrames[i].innerHTML
        let frameData = iconFrames[i + 1].children
        let isRotated = false
        iconData.gameSheet[frameName] = {}
        positionData[frameName] = {}

        for (let n=0; n < frameData.length; n += 2) {
            let keyName = frameData[n].innerHTML
            let keyData = frameData[n + 1].innerHTML
            if (["spriteOffset", "spriteSize", "spriteSourceSize"].includes(keyName)) {
                iconData.gameSheet[frameName][keyName] = parseWeirdArray(keyData)
            }

            else if (keyName == "textureRotated") {
                isRotated = frameData[n + 1].outerHTML.includes("true")
                iconData.gameSheet[frameName][keyName] = isRotated
            }

            else if (keyName == "textureRect") {
                let textureArr = keyData.slice(1, -1).split("},{").map(x => parseWeirdArray(x))
                positionData[frameName].pos = textureArr[0]
                positionData[frameName].size = textureArr[1]
            }  
        }

        if (isRotated) positionData[frameName].size.reverse()

    }
    return positionData
}

function parseWeirdArray(data) {
    return data.replace(/[^0-9,-]/g, "").split(",").map(x => +x)
}

function padZero(num) {
    let numStr = num.toString()
    if (num < 10) numStr = "0" + numStr
    return numStr
}

function rgbToDecimal(rgb) {
    return (rgb.r << 16) + (rgb.g << 8) + rgb.b;
}

class Icon {
    constructor(data={}, cb) {
        this.app = data.app
        this.sprite = new PIXI.Container();
        this.form = data.form || "player"
        this.id = validateIconID(data.id, this.form)
        this.new = !!data.new
        this.colors = {
            "1": validNum(data.col1, 0xafafaf),    // primary
            "2": validNum(data.col2, WHITE),       // secondary
            "g": validNum(data.colG, validNum(+data.colg, null)), // glow
            "w": validNum(data.colW, validNum(+data.colw, WHITE)), // white
            "u": validNum(data.colU, validNum(+data.colu, WHITE)), // ufo
        }
                
        this.glow = !!data.glow
        this.layers = []
        this.glowLayers = []
        this.complex = ["spider", "robot"].includes(this.form)

        // most forms
        if (!this.complex) {
            let extraSettings = { new: this.new }
            if (data.noUFODome) extraSettings.noDome = true
            let basicIcon = new IconPart(this.form, this.id, this.colors, this.glow, extraSettings)
            this.sprite.addChild(basicIcon.sprite)
            this.layers.push(basicIcon)
            this.glowLayers.push(basicIcon.sections.find(x => x.colorType == "g"))
        }

        // spider + robot
        else {
            let idlePosition = this.getAnimation(data.animation, data.animationForm).frames[0]
            idlePosition.forEach((x, y) => {
                x.name = iconData.robotAnimations.info[this.form].names[y]
                let part = new IconPart(this.form, this.id, this.colors, false, { part: x, skipGlow: true, new: this.new })
                positionPart(x, y, part.sprite, this.form, this.new)
    
                let glowPart = new IconPart(this.form, this.id, this.colors, true, { part: x, onlyGlow: true, new: this.new })
                positionPart(x, y, glowPart.sprite, this.form, this.new, true)
                glowPart.sprite.visible = this.glow
                this.glowLayers.push(glowPart)
    
                this.layers.push(part)
                this.sprite.addChild(part.sprite)
            })
    
            let fullGlow = new PIXI.Container();
            this.glowLayers.forEach(x => fullGlow.addChild(x.sprite))
            this.sprite.addChildAt(fullGlow, 0)
            if (typeof Ease !== "undefined") this.ease = new Ease.Ease()
            this.animationSpeed = Math.abs(Number(data.animationSpeed) || 1)
            if (data.animation) this.setAnimation(data.animation, data.animationForm)
        }

        if (this.new) this.sprite.scale.set(2)

        this.app.stage.removeChildren()
        this.app.stage.addChild(this.sprite)

        if (cb) cb(this)

    }

    getAllLayers() {
        let allLayers = [];
        (this.complex ? this.glowLayers : []).concat(this.layers).forEach(x => x.sections.forEach(s => allLayers.push(s)))
        return allLayers
    }

    setColor(colorType, newColor, extra={}) {
        let colorStr = String(colorType).toLowerCase()
        if (!colorType || !Object.keys(this.colors).includes(colorStr)) return
        else this.colors[colorStr] = newColor
        let newGlow = getGlowColor(this.colors)
        this.getAllLayers().forEach(x => {
            if (colorType != "g" && x.colorType == colorStr) x.setColor(newColor)
            if (!extra.ignoreGlow && x.colorType == "g") x.setColor(newGlow)
        })
        if (!this.glow && colorStr == "1") {
            let shouldGlow = newColor == 0
            this.glowLayers.forEach(x => x.sprite.visible = shouldGlow)
        }
    }

    formName() {
        return formNames[this.form] || this.form
    }

    isGlowing() {
        return this.glowLayers[0].sprite.visible
    }

    setGlow(toggle) {
        this.glow = !!toggle
        this.glowLayers.forEach(x => x.sprite.visible = (this.colors["1"] == 0 || this.glow))
    }

    getAnimation(name, animForm) {
        let animationList = iconData.robotAnimations.animations[animForm || this.form]
        return animationList[name || "idle"] || animationList["idle"]
    }

    setAnimation(data, animForm) {
        let animData = this.getAnimation(data, animForm) || this.getAnimation("idle")
        this.ease.removeAll()
        this.animationFrame = 0
        this.animationName = data
        this.runAnimation(animData, data)
    }

    runAnimation(animData, animName, duration) {
        animData.frames[this.animationFrame].forEach((newPart, index) => {
            let section = this.layers[index]
            let glowSection = this.glowLayers[index]
            let truePosMultiplier = this.new ? positionMultiplier * 0.5 : positionMultiplier
            if (!section) return

            // gd is weird with negative rotations
            let realRot = newPart.rotation
            if (realRot < -180) realRot += 360

            let movementData = {
                x: newPart.pos[0] * truePosMultiplier,
                y: newPart.pos[1] * truePosMultiplier * -1,
                scaleX: newPart.scale[0],
                scaleY: newPart.scale[1],
                rotation: realRot * (Math.PI / 180) // radians
            }
            if (newPart.flipped[0]) movementData.scaleX *= -1
            if (newPart.flipped[1]) movementData.scaleY *= -1

            let bothSections = [section, glowSection]
            bothSections.forEach((x, y) => {
                let easing = this.ease.add(x.sprite, movementData, { duration: duration || 1, ease: 'linear' })
                let continueAfterEase = animData.frames.length > 1 && y == 0 && index == 0 && animName == this.animationName
                if (continueAfterEase) easing.on('complete', () => {
                    this.animationFrame++
                    if (this.animationFrame >= animData.frames.length) {
                        if (animData.info.loop) this.animationFrame = 0
                    }
                    if (this.animationFrame < animData.frames.length) this.runAnimation(animData, animName, !duration ? 1 : (animData.info.duration / (this.animationSpeed || 1)))
                })
            })
        })
    }

    autocrop() {
        // find actual icon size by reading pixel data (otherwise there's whitespace and shit)
        if (this.new) this.sprite.scale.set(1)
        let spriteSize = [Math.round(this.sprite.width), Math.round(this.sprite.height)]
        let pixels = this.app.renderer.plugins.extract.pixels(this.sprite);
        let xRange = [spriteSize[0], 0]
        let yRange = [spriteSize[1], 0]

        this.preCrop = { pos: [this.sprite.position.x, this.sprite.position.y], canvas: [this.app.renderer.width, this.app.renderer.height] }

        for (let i=3; i < pixels.length; i += 4) {
            let alpha = pixels[i]
            let realIndex = (i-3) / 4
            let pos = [realIndex % spriteSize[0], Math.floor(realIndex / spriteSize[0])]

            if (alpha > 10) { // if pixel is not blank...
                if (pos[0] < xRange[0]) xRange[0] = pos[0]      // if x pos is < the lowest x pos so far
                else if (pos[0] > xRange[1]) xRange[1] = pos[0] // if x pos is > the highest x pos so far
                if (pos[1] < yRange[0]) yRange[0] = pos[1]      // if y pos is < the lowest y pos so far
                else if (pos[1] > yRange[1]) yRange[1] = pos[1] // if y pos is > the highest y pos so far
            }
        }

        // this took hours to figure out. i fucking hate my life
        xRange[1]++
        yRange[1]++
        
        let realWidth = xRange[1] - xRange[0]
        let realHeight = yRange[1] - yRange[0]

        this.app.renderer.resize(realWidth, realHeight)
        let bounds = this.sprite.getBounds()
        this.sprite.position.x -= bounds.x
        this.sprite.position.y -= bounds.y

        this.sprite.position.x += (spriteSize[0] - xRange[1]) - xRange[0]
    }

    revertCrop() {
        this.app.renderer.resize(...this.preCrop.canvas)
        this.sprite.position.set(...this.preCrop.pos)
        if (this.new) this.sprite.scale.set(2)
    }

    toDataURL(dataType="image/png") {
        this.autocrop()
        this.app.renderer.render(this.app.stage);
        let b64data = this.app.view.toDataURL(dataType);
        this.revertCrop()
        return b64data
    }

    pngExport() {
        let b64data = this.toDataURL()
        let downloader = document.createElement('a');
        downloader.href = b64data
        downloader.setAttribute("download", `${this.formName()}_${this.id}.png`);
        document.body.appendChild(downloader);
        downloader.click();
        document.body.removeChild(downloader);
    }

    copyToClipboard() {
        this.autocrop()
        this.app.renderer.render(app.stage);
        this.app.view.toBlob(blob => {
            let item = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([item]); 
        });
        this.revertCrop()

    }

    psdExport() {
        if (typeof agPsd === "undefined") throw new Error("ag-psd not imported!")
        let glowing = this.isGlowing()
        this.setGlow(true)

        let psd = { width: this.app.stage.width, height: this.app.stage.height, children: [] }
        let allLayers = this.getAllLayers()
        let renderer = this.app.renderer
        let complex = this.complex

        function addPSDLayer(layer, parent, sprite) {
            allLayers.forEach(x => x.sprite.alpha = 0)
            layer.sprite.alpha = 255
        
            let layerChild = { name: layer.colorName, canvas: renderer.plugins.extract.canvas(sprite) }
            if (layer.colorType == "g") {
                if (parent.part) layerChild.name = parent.part.name + " glow"
                else layerChild.blendMode = "linear dodge"
                if (!complex && !glowing) layerChild.hidden = true
            }
            return layerChild
        }

        this.layers.forEach(x => {
            let partName = x.part ? x.part.name : "Icon"
            let folder = {
                name: partName,
                children: x.sections.map(layer => addPSDLayer(layer, x, this.sprite)),
                opened: true
            }
            psd.children.push(folder)
        })

        if (complex) {
            let glowFolder = { name: "Glow", children: [], opened: true, hidden: !glowing }
            glowFolder.children = this.glowLayers.map(x => addPSDLayer(x.sections[0], x, this.sprite))
            psd.children.unshift(glowFolder)
        }

        allLayers.forEach(x => x.sprite.alpha = 255)
        let output = agPsd.writePsd(psd)
        let blob = new Blob([output]);
        let downloader = document.createElement('a');
        downloader.href = URL.createObjectURL(blob);
        downloader.setAttribute("download", `${this.formName()}_${this.id}.psd`);
        document.body.appendChild(downloader);
        downloader.click();
        document.body.removeChild(downloader); 
        this.setGlow(glowing)
    }
}

class IconPart {
    constructor(form, id, colors, glow, misc={}) {

        if (colors[1] == 0 && !misc.skipGlow) glow = true // add glow if p1 is black

        let iconPath = `${form}_${padZero(id)}`
        let partString = misc.part ? "_" + padZero(misc.part.part) : ""
        let sections = {}
        if (misc.part) this.part = misc.part

        this.sprite = new PIXI.Container();
        this.sections = []

        if (!misc.skipGlow) {
            let glowCol = getGlowColor(colors)
            sections.glow = new IconLayer(`${iconPath}${partString}_glow_001.png`, glowCol, "g", misc.new)
            if (!glow) sections.glow.sprite.visible = false
        }

        if (!misc.onlyGlow) {
            if (form == "bird" && !misc.noDome) { // ufo top
                sections.ufo = new IconLayer(`${iconPath}_3_001.png`, WHITE, "u", misc.new)
            }

            sections.col1 = new IconLayer(`${iconPath}${partString}_001.png`, colors["1"], "1", misc.new)
            sections.col2 = new IconLayer(`${iconPath}${partString}_2_001.png`, colors["2"], "2", misc.new)

            let extraPath = `${iconPath}${partString}_extra_001.png`
            if (iconData.gameSheet[extraPath]) {
                sections.white = new IconLayer(extraPath, colors["w"], "w", misc.new)
            }
        }

        let layerOrder = ["glow", "ufo", "col2", "col1", "white"].map(x => sections[x]).filter(x => x)
        layerOrder.forEach(x => {
            this.sections.push(x)
            this.sprite.addChild(x.sprite)
        })
    }
}

class IconLayer {
    constructor(path, color, colorType, isNew) {
        let loadedTexture = isNew ? loadedNewIcons[path] : loader.resources[path]
        this.offsets = iconData.gameSheet[path] || { spriteOffset: [0, 0] }
        this.sprite = new PIXI.Sprite(loadedTexture ? isNew ? loadedTexture : loadedTexture.texture : PIXI.Texture.EMPTY)

        this.colorType = colorType
        this.colorName = colorNames[colorType]
        this.setColor(color)

        this.sprite.position.x += this.offsets.spriteOffset[0]
        this.sprite.position.y -= this.offsets.spriteOffset[1]


        if (this.offsets.textureRotated) {
            this.sprite.angle = -90
        }
        this.angleOffset = this.sprite.angle

        this.sprite.anchor.set(0.5)
    }

    setColor(color) {
        this.color = validNum(color, WHITE)
        this.sprite.tint = this.color
    }
}
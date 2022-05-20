const plist = require('plist');
const fs = require('fs');
const gdPath = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources\\'
const animationPlists = ["Robot_AnimDesc.plist", "Spider_AnimDesc.plist"]
const objectDefinitions = "objectDefinitions.plist"
const info = {
  "robot": {
    names: ["Back leg", "Back connector", "Left foot", "Head", "Front leg", "Front connector", "Front foot"],
    tints: { 0: 178, 1: 178, 2: 178 }
  },
  "spider": {
    names: ["Leg 3", "Leg 4", "Connector", "Head", "Leg 1", "Leg 2"],
    tints: { 0: 127, 1: 127 }
  }
}

function parseSet(str) {
  return str.slice(1, -1).split(", ").map(x => cleanFloat(x))
}

function cleanFloat(str) {
  return Number(Number(str).toFixed(4))
}

let fullAnimationData = {}
let plistData = animationPlists.map(x => plist.parse(fs.readFileSync(gdPath + x, 'utf8')))
let timings = plist.parse(fs.readFileSync(gdPath + objectDefinitions, 'utf8'))
plistData.forEach(x => {
  Object.keys(x.animationContainer).forEach(a => fullAnimationData[a] = x.animationContainer[a])
})

let animations = { "robot": {}, "spider": {} }

for (let animation in fullAnimationData) {
  let animationName = animation.split(".")[0].split("_")
  let animationForm = animationName.shift()
  let animationIndex = Number(animationName.pop()) - 1
  animationName = animationName.join("_")

  let animationList = Object.values(fullAnimationData[animation])
  let formName = animation.split("_")[0].toLowerCase()
  let animationData = animationList.map(anim => {
    let textureInfo = anim.texture.split("_")
    let flips = parseSet(anim.flipped)
    return {
      part: +textureInfo[2],
      pos: parseSet(anim.position),
      scale: parseSet(anim.scale),
      rotation: cleanFloat(anim.rotation),
      flipped: [flips[0] > 0, flips[1] > 0],
      z: Number(anim.zValue)
    }
  })

  if (!animations[formName][animationName]) {
    let timingDefs = timings[animationForm].animations[animationName] || {}
    let animationInfo = { duration: cleanFloat(Number(timingDefs.delay || 0.05) * 1000) }
    if (timingDefs.looped == '1' || (!timingDefs.looped && animationName.includes("loop"))) animationInfo.loop = true
    if (timingDefs.singleFrame) animationInfo.single = true
    animations[formName][animationName] = { info: animationInfo, frames: [] }
  }
  animations[formName][animationName].frames[animationIndex] = animationData
}

let cleanJSON = JSON.stringify({info, animations}, null, 2)
.replace(/: \[\n\s+([0-9a-z.-]+),\n\s+([0-9a-z.-]+)\n\s+],/g, ": [$1, $2],") // keep sets on one line
.replace(/],\n(\s+)"(.+?)": \[\n/g, '],\n\n$1"$2": [\n') // blank line between animations
.replace('  "animations"', '\n  "animations"') // blank line before animation list

fs.writeFileSync('./parsed/robotAnimations.json', cleanJSON); // regex to make it easier to read 
console.log("Successfully parsed!")
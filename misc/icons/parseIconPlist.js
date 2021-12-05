let gdPath = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Geometry Dash\\Resources\\'

const plist = require('plist');
const fs = require('fs');
const forms = require('./forms.json')
const data = plist.parse(fs.readFileSync(gdPath + 'GJ_GameSheet02-uhd.plist', 'utf8'));
const glowSheet = plist.parse(fs.readFileSync(gdPath + 'GJ_GameSheetGlow-uhd.plist', 'utf8'));
let formList = Object.values(forms).map(x => x.form)

let frames = {}

function addIcons(data) {
  Object.keys(data).filter(x => formList.includes(x.split("_")[0])).forEach(x => frames[x] = data[x])
}

addIcons(data.frames)
addIcons(glowSheet.frames)

for (let key in frames) {
  if (key.startsWith(".")) delete frames[key]
  else { let fileData = frames[key];
  for (let innerKey in fileData) {
    if (typeof fileData[innerKey]) {
      if (!["spriteSize", "spriteOffset"].includes(innerKey)) delete fileData[innerKey]  // remove useless stuff
      else fileData[innerKey] = JSON.parse(fileData[innerKey].replace(/{/g, '[').replace(/}/g, ']'));
    }
  }
}}
fs.writeFileSync('./gameSheet.json', JSON.stringify(frames, null, 2).replace(/\[\n.+?(-?\d+),\n.+?(-?\d+)\n.+]/g, "[$1, $2]")); // regex to make it easier to read 
console.log("Successfully converted!")
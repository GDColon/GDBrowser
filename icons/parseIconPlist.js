const plist = require('plist');
const fs = require('fs');
const data = plist.parse(fs.readFileSync('C:/Users/Craig/Downloads/sz/assets/GJ_GameSheet02-hd.plist', 'utf8'));
for (let key in data.frames) {
  if (key.startsWith(".")) delete data.frames[key]
  else { let fileData = data.frames[key];
  for (let innerKey in fileData) {
    if (typeof fileData[innerKey]) {
      if (!["spriteSize", "spriteOffset"].includes(innerKey)) delete fileData[innerKey]  // remove useless stuff
      else fileData[innerKey] = JSON.parse(fileData[innerKey].replace(/{/g, '[').replace(/}/g, ']'));
    }
  }
}}
fs.writeFileSync('./gameSheet.json', JSON.stringify(data.frames, null, 2).replace(/\[\n.+?(-?\d+),\n.+?(-?\d+)\n.+]/g, "[$1, $2]")); // regex to make it easier to read 
console.log("Successfully converted!")
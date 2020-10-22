const plist = require('plist');
const { readFileSync, writeFileSync } = require('fs');
const data = plist.parse(readFileSync('./GJ_GameSheet02-uhd.plist', 'utf8'));
for (let key in data.frames) {
  let fileData = data.frames[key];
  for (let innerKey in fileData) {
    if (typeof fileData[innerKey]) {
      if (innerKey != "spriteSize" && innerKey != "spriteOffset") delete fileData[innerKey]  // remove useless stuff
      else fileData[innerKey] = JSON.parse(fileData[innerKey].replace(/{/g, '[').replace(/}/g, ']'));
    }
  }
}
writeFileSync('./gameSheet.json', JSON.stringify(data.frames, null, 2).replace(/\[\n.+?(-?\d+),\n.+?(-?\d+)\n.+]/g, "[$1, $2]")); // regex to make it easier to read
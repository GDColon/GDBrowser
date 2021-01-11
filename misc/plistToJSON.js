let path = "C:/Program Files (x86)/Steam/steamapps/common/Geometry Dash/Resources/"

let files = ["AchievementsDesc", "AchievementsDescMD"]
let values = ["achievedDescription", "title", "icon", "unachievedDescription"]
let innerKey = null
let jsonValues = false
let exportName = "achievements"

// let files = ["GJ_GameSheet02-uhd"]
// let values = ["spriteSize", "spriteOffset"]
// let innerKey = "frames"
// let jsonValues = true

const plist = require('plist');
const fs = require('fs');

let final = {}

files.forEach(file => {
  let data = plist.parse(fs.readFileSync(path + file + '.plist', 'utf8'));
  if (innerKey) data = data[innerKey]
  
  console.log(`Converting ${file}.plist...`)
  
  for (let key in data) {
    let fileData = data[key];
    for (let innerKey in fileData) {
      if (fileData[innerKey] && values.includes(innerKey)) {
        if (!final[key]) final[key] = {}
        if (jsonValues) final[key][innerKey] = JSON.parse(fileData[innerKey].replace(/{/g, '[').replace(/}/g, ']')); // for icon sheet
        else final[key][innerKey] = fileData[innerKey]
      }
    }
  }
})

console.log("Finishing up...")

if (exportName == "achievements") {  // hardcoded shit starts here!

  let achString = "geometry.ach."
  let rewardTypes = {color: "color1", icon: "cube", bird: "ufo", dart: "wave", special: "trail", death: "deathEffect"}
  let games = {"md": "meltdown", "world.": "world"}

  let achArray = []
  for (let k in final) {
    let reward = final[k].icon ? final[k].icon.split("_") : []
    let achObj = {
      id: k.slice(achString.length),
      game: "gd",
      name: final[k].title,
      rewardType: rewardTypes[reward[0]] || reward[0] || "misc",
      rewardID: +reward[1] || -1,
      description: final[k].unachievedDescription,
      achievedDescription: final[k].achievedDescription,
      trueID: k
    }
    Object.keys(games).forEach(x => {
      if (k.startsWith(achString + x)) achObj.game = games[x]
      if (k == achString + "rate") achObj.id = "rating"
      if (achObj.id.includes("demoncoin")) achObj.id = achObj.id.replace("demoncoin", "ultimatedemon")
    })
    achArray.push(achObj)
  }
  data = achArray.filter(x => !x.id.startsWith("lite"))
  data = data.filter(x => x.game == "gd").concat(data.filter(x => x.game != "gd"))
}

fs.writeFileSync(exportName + '.json', JSON.stringify(data, null, 2).replace(/\[\n.+?(-?\d+),\n.+?(-?\d+)\n.+]/g, "[$1, $2]")); // regex to make it easier to read

console.log("Successfully converted!")
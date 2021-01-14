let path = "../extra/"

let files = ["AchievementsDesc", "AchievementsDescMD", null, "AchievementsDescSZ"]
let gameNames = ["gd", "meltdown", "world", "subzero"]
let achString = "geometry.ach."
let rewardTypes = { color: "color1", icon: "cube", bird: "ufo", dart: "wave", special: "trail", death: "deathEffect" }
let games = { "md": "meltdown", "world.": "world", "subzero.": "subzero" }

const plist = require('plist');
const fs = require('fs');

let achArray = []

files.forEach((file, fileNum) => {
  if (!file) return
  let data = plist.parse(fs.readFileSync(path + file + '.plist', 'utf8'));

  console.log(`Converting ${file}.plist...`)

  for (let key in data) {
    if (!achArray.find(x => x.trueID == key)) {
    let fileData = data[key];
    let reward = fileData.icon ? fileData.icon.split("_") : []
    let achObj = {
      id: key.slice(achString.length),
      game: gameNames[fileNum],
      name: fileData.title,
      rewardType: rewardTypes[reward[0]] || reward[0] || "misc",
      rewardID: +reward[1] || -1,
      description: fileData.unachievedDescription,
      achievedDescription: fileData.achievedDescription,
      trueID: key
    }
    Object.keys(games).forEach(x => { if (key.startsWith(achString + x)) achObj.game = games[x] })
    if (key == achString + "rate") achObj.id = "rating"
    if (achObj.id.startsWith("subzero.coins")) achObj.id = achObj.id.replace("subzero.coins", "szcoin")
    if (achObj.id.includes("demoncoin")) achObj.id = achObj.id.replace("demoncoin", "ultimatedemon")
    achArray.push(achObj)
  }}
})

achArray = achArray.filter(x => !x.id.startsWith("lite"))
let final = achArray.filter(x => x.game == "gd")
gameNames.slice(1).forEach(g => final = final.concat(achArray.filter(x => x.game == g)))

fs.writeFileSync('achievements.json', JSON.stringify(final, null, 2).replace(/\[\n.+?(-?\d+),\n.+?(-?\d+)\n.+]/g, "[$1, $2]")); // regex to make it easier to read
console.log("Successfully converted!")
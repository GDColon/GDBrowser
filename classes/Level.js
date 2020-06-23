const XOR = require(__dirname + "/../classes/XOR");
const config = require(__dirname + "/../misc/gdpsConfig");

let orbs = [0, 0, 50, 75, 125, 175, 225, 275, 350, 425, 500]
let length = ['Tiny', 'Short', 'Medium', 'Long', 'XL']
let difficulty = { 0: 'Unrated', 10: 'Easy', 20: 'Normal', 30: 'Hard', 40: 'Harder', 50: 'Insane' }

class Level {
    constructor(levelInfo, author = []) {
        if (!levelInfo[2]) return;
        this.name = levelInfo[2];
        this.id = levelInfo[1];
        this.description = (config.base64descriptions ? Buffer.from(levelInfo[3], "base64").toString() : levelInfo[3]) || "(No description provided)";
        this.author = author[1] || "-"
        this.authorID = levelInfo[6]
        this.accountID = author[2] || 0
        this.difficulty = difficulty[levelInfo[9]]
        this.downloads = levelInfo[10]
        this.likes = levelInfo[14]
        this.disliked = levelInfo[14] < 0
        this.length = length[levelInfo[15]] || "XL"
        this.stars = levelInfo[18]
        this.orbs = orbs[levelInfo[18]]
        this.diamonds = levelInfo[18] < 2 ? 0 : parseInt(levelInfo[18]) + 2
        this.featured = levelInfo[19] > 0
        this.epic = levelInfo[42] == 1
        this.gameVersion = levelInfo[13] > 17 ? (levelInfo[13] / 10).toFixed(1) : levelInfo[13] == 11 ? "1.8" : levelInfo[13] == 10 ? "1.7" : "Pre-1.7"
        if (levelInfo[28]) this.uploaded = levelInfo[28] + config.timestampSuffix
        if (levelInfo[29]) this.updated = levelInfo[29] + config.timestampSuffix
        this.version = levelInfo[5];
        if (levelInfo[27]) this.password = levelInfo[27];
        this.copiedID = levelInfo[30]
        this.officialSong = levelInfo[12] != 0 ? parseInt(levelInfo[12]) + 1 : 0
        this.customSong = levelInfo[35]
        this.coins = levelInfo[37]
        this.verifiedCoins = levelInfo[38] == 1
        this.starsRequested = levelInfo[39]
        this.ldm = levelInfo[40] == 1
        this.objects = levelInfo[45]
        this.large = levelInfo[45] > 40000;
        this.cp = (this.stars > 0) + this.featured + this.epic

        if (levelInfo[17] == 1) this.difficulty += ' Demon'
        if (this.difficulty == "Insane Demon") this.difficulty = "Extreme Demon"
        else if (this.difficulty == "Harder Demon") this.difficulty = "Insane Demon"
        else if (this.difficulty == "Normal Demon") this.difficulty = "Medium Demon"
        else if (levelInfo[25] == 1) this.difficulty = 'Auto';
        this.difficultyFace = `${levelInfo[17] != 1 ? this.difficulty.toLowerCase() : `demon-${this.difficulty.toLowerCase().split(' ')[0]}`}${this.epic ? '-epic' : `${this.featured ? '-featured' : ''}`}`

        if (this.password && this.password != 0) {
            let xor = new XOR();
            let pass = config.xorPasswords ? xor.decrypt(this.password, 26364) : this.password;
            if (pass.length > 1) this.password = pass.slice(1);
            else this.password = pass;
        }
    }
}

module.exports = Level;
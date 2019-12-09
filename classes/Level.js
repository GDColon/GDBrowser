class Level {
    constructor(levelInfo) {
        this.name = levelInfo[2];
        this.id = levelInfo[1];
        this.description = Buffer.from(levelInfo[3], "base64") || "No description provided...";
        this.author = author[1] || "-"
        this.authorID = levelInfo[6]
        this.accountID = author[2] || 0
        this.difficulty = difficulty[levelInfo[9]]
        this.downloads = levelInfo[10]
        this.likes = levelInfo[14]
        this.disliked = levelInfo[14] < 0
        this.length = length[levelInfo[15]] || "?"
        this.stars = levelInfo[18]
        this.orbs = orbs[levelInfo[18]]
        this.diamonds = levelInfo[18] < 2 ? 0 : parseInt(levelInfo[18]) + 2
        this.featured = levelInfo[19] > 0
        this.epic = levelInfo[42] == 1
        //this.uploaded = levelInfo[28] + ' ago'
        //this.updated = levelInfo[29] + ' ago'
        this.version = levelInfo[5]
        this.copiedID = levelInfo[30]
        this.officialSong = levelInfo[12] != 0 ? parseInt(levelInfo[12]) + 1 : 0
        this.customSong = levelInfo[35]
        this.coins = levelInfo[37]
        this.verifiedCoins = levelInfo[38] == 1
        this.starsRequested = levelInfo[39]
        //this.ldm = levelInfo[40] == 1, //not given in search
        this.objects = levelInfo[45] == "65535" ? "65000+" : levelInfo[45]
        this.large =  levelInfo[45] > 40000
    }
}

module.exports = Level;
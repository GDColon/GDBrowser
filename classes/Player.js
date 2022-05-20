const colors = require('../iconkit/sacredtexts/colors.json');

class Player {
    constructor(account) {
        this.username = account[1] || "-",
        this.playerID = account[2],
        this.accountID = account[16],
        this.rank = +account[6] || +account[30],
        this.stars = +account[3],
        this.diamonds = +account[46],
        this.coins = +account[13],
        this.userCoins = +account[17],
        this.demons = +account[4],
        this.cp = +account[8],
        this.icon = +account[21]

        if (!+account[22]) { // partial profile, used for leaderboards and stuff
            this.icon = {
                form: ['icon', 'ship', 'ball', 'ufo', 'wave', 'robot', 'spider'][+account[14]],
                icon: +account[9] || 1,
                col1: +account[10],
                col2: +account[11],
                glow: +account[15] > 1 || account[28] == "1"
            }
            delete this.col1; delete this.col2; delete this.glow; delete this.col1RGB; delete this.col2RGB
        }

        else {
            this.friendRequests = account[19] == "0",
            this.messages = account[18] == "0" ? "all" : account[18] == "1" ? "friends" : "off",
            this.commentHistory = account[50] == "0" ? "all" : account[50] == "1" ? "friends" : "off",
            this.moderator = +account[49],
            this.youtube = account[20] || null,
            this.twitter = account[44] || null,
            this.twitch = account[45] || null,
            this.ship = +account[22],
            this.ball = +account[23],
            this.ufo = +account[24],
            this.wave = +account[25],
            this.robot = +account[26],
            this.spider = +account[43],
            this.col1 = +account[10],
            this.col2 = +account[11],
            this.deathEffect = +account[48] || 1,
            this.glow = account[15] > 1 || account[28] == "1"
        }

        this.col1RGB = colors[account[10]] || colors["0"],
        this.col2RGB = colors[account[11]] || colors["3"]
    }
}

module.exports = Player;

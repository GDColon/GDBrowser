// In case you wanna use a fork of GDBrowser for a GDPS or something, here are some settings you can tweak to save you some precious time
// Main endpoint (e.g. boomlings.com) should be edited in index.js
// This isn't a JSON because you can't leave comments on them, ew

module.exports = {

    base64descriptions: true, // Are level descriptions encoded in Base64?
    xorPasswords: true, // Are level passwords XOR encrypted?
    timestampSuffix: " ago", // Suffix to add after timestamps, if any.

    // more settings soon
    // feel free to drop a PR if you're able to make gdbrowser work better with gdps'es <3

}

/* 
STUFF THAT'S BROKEN
- Comments, because of how profiles are handled
- Leaderboards
- Level descriptions, if a mix of Base64 and plain text is used
- Map packs and gauntlets


STUFF THAT I HAVEN'T TESTED
- Level leaderboards
- All POST requests (commenting, liking, etc)
*/
// In case you wanna use a fork of GDBrowser locally or for a GDPS or something, here are some settings you can tweak to save you some precious time
// This isn't a JSON because you can't leave comments on them, ew

module.exports = {
    
    port: 2000, // Port to host website on
    endpoint: "http://boomlings.com/database/", // Server endpoint to send requests to

    params: {   // Always send this stuff to the servers
        secret: 'Wmfd2893gb7',
        gameVersion: '21',
        binaryVersion: '35',
    },

    cacheMapPacks: true, // Caches map packs to speed up loading. Useful if they're rarely updated.
    cacheAccountIDs: true, // Caches account IDs in order to shave off an extra request to the servers.
    cachePlayerIcons: true, // Caches player icons to speed up loading. Changing your icon in-game may take time to update on the site.
    rateLimiting: true, // Enables rate limiting to avoid api spam, feel free to disable for private use.
    ipForwarding: true, // Forwards 'x-real-ip' to the servers. (requested by robtop)

    // GDPS Related (feel free to drop a PR if you're able to make gdbrowser work better with gdps'es <3)
    base64descriptions: true, // Are level descriptions encoded in Base64?
    xorPasswords: true, // Are level passwords XOR encrypted?
    timestampSuffix: " ago", // Suffix to add after timestamps, if any.

}
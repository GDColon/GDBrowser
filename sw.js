const staticGDBrowser = "gdbrowserv1"
const assets = [
    "/",
    "/html/",
    "/api/",
    "/assets/",
    "/classes/",
    "/iconkit/",
    "/misc/",
    "/misc/achievements.json",
    "/misc/achievementTypes.json",
    "/misc/credits.json",
    "/misc/dragscroll.js",
    "/misc/global.js",
    "/misc/music.json",
    "/misc/sampleIcons.json",
    "/misc/secretStuff.json",
    "/misc/analysis/blocks.json",
    "/misc/analysis/colorProperties.json",
    "/misc/analysis/initialProperties.json",
    "/misc/analysis/objectProperties.json",
    "/misc/analysis/objects.json",
    "/misc/manual parsers/parseAchievementPlist.js",
    "/misc/manual parsers/parseIconPlist.js",
    "/misc/manual parsers/parseRobotPlist.js",
    "/index.js",
    "/settings.js",
    "/servers.json",
    "/iconkit/extradata/colorOrder.json",
    "/iconkit/extradata/hardcodedUnlocks.json",
    "/iconkit/extradata/iconCredits.json",
    "/iconkit/extradata/shops.json",
    "/iconkit/libs/ag-psd.js",
    "/iconkit/libs/imagesloaded.js",
    "/iconkit/libs/pixi-ease.js",
    "/iconkit/sacredtexts/colors.json",
    "/iconkit/sacredtexts/forms.json",
    "/iconkit/sacredtexts/gameSheet.json",
    "/iconkit/sacredtexts/robotAnimations.json",
    "/iconkit/icon.js",
    "/classes/Level.js",
    "/classes/Player.js",
    "/classes/XOR.js",
    "/api/leaderboards/accurate.js",
    "/api/leaderboards/boomlings.js",
    "/api/leaderboards/leaderboardLevel.js",
    "/api/leaderboards/scores.js",
    "/api/messages/countMessages.js",
    "/api/messages/deleteMessage.js",
    "/api/messages/fetchMessage.js",
    "/api/messages/getMessage.js",
    "/api/post/like.js",
    "/api/post/postComment.js",
    "/api/post/postProfileComment.js",
    "/api/analyze.js",
    "/api/comments.js",
    "/api/download.js",
    "/api/gauntlets.js",
    "/api/level.js",
    "/api/mappacks.js",
    "/api/profile.js",
    "/api/search.js",
    "/api/song.js",
    "/html/achievements.html",
    "/html/analyze.html",
    "/html/api_old.html",
    "/html/api.html",
    "/html/assets.html",
    "/html/boomlings.html",
    "/html/comingsoon.html",
    "/html/comments.html",
    "/html/demon.html",
    "/html/filters.html",
    "/html/gauntlets.html",
    "/html/gdps.html",
    "/html/home.html",
    "/html/iconkit.html",
    "/html/leaderboard.html",
    "/html/level.html",
    "/html/levelboard.html",
    "/html/mappacks.html",
    "/html/messages.html",
    "/html/offline.html",
    "/html/profile.html",
    "/html/search.html"
]

self.addEventListener("install", installEvent => {
  installEvent.waitUntil(
    caches.open(staticGDBrowser).then(cache => {
      cache.addAll(assets)
    })
  )
})

self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
      caches.match(fetchEvent.request).then(res => {
        return res || fetch(fetchEvent.request)
      })
    )
  })
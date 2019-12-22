# GDBrowser

Uh... so I've never actually used GitHub before this. But I'll try to explain everything going on here.

Sorry for my messy code. It's why I was skeptical about making this open source, but you know what, the code runs fine in the end.

## Using this for a GDPS?
I mean, sure. Why not.

Just make sure to give credit, obviously. Via the bottom of the homepage, the credits button, or maybe even both if you're feeling extra nice.

Obviously, GDBrowser isn't perfect when it comes to GD private servers, since both requests and responses might be a bit different. Or a LOT, as I learned.

You can tweak the endpoint (e.g. boomlings.com) in index.js

You can also check out `/misc/gdpsConfig.js` to tweak some additional GDPS settings such as whether to decrypt level descriptions or if timestamps should end with "ago"

GDPS compatibility is still a HUGE work in progress, so pull requests would be greatly appreciated if you manage to make any improvements! 

# Folders

GDBrowser has a lot of folders. I like to keep things neat.

Most folders contain exactly what you'd expect, but here's some in-depth info in case you're in the dark.

## API
This is where all the backend stuff happens! Yipee!

They're all fairly similar. Fetch something from boomlings.com, parse the response, and serve it in a crisp and non-intimidating JSON. This is probably what you came for.

The odd one out is icon.js, which is for generating GD icons. The code here is horrendous, so apologies in advance. Improvements to it (especially UFO and robot generation) would be greatly appreciated! (and i will love you forever)

## Assets
Assets! Assets everywhere!

All the GD stuff was ripped straight from the GD spritesheets via [Absolute's texture splitter hack](https://youtu.be/pYQgIyNhow8). If you want a nice categorized version, [I've done all the dirty work for you.](https://www.mediafire.com/file/4d99bw1zhwcl507/textures.zip/file)

/blocks, /objects and /initial are used for the analysis page. I just put them in seperate folders for extra neatness.

/gdfaces holds all the difficulty faces

/css has the CSS stuff. They're in a special folder so browsers won't cache them (in case of updates)

Figure out what /gauntlets and /iconkitbuttons have.

## Classes
What's a class you ask? I still have no idea.

Seriously, these things are *confusing*

I guess the best way to put it is uh... super fancy functions???

Level.js parses the server's disgusting response and sends back a nice object with all the level info

XOR.js encrypts/decrypts stuff like GD passwords. I stole the code from somewhere so uh if you wrote it, please don't hunt me down

## HTML
The HTML files! Nothing too fancy, since it can all be seen directly from gdbrowser. Note that profile.html and level.html have [[VARIABLES]] (name, id, etc) replaced by the server when they're sent.

comingsoon.html was used while the site was still in development, I just left it in there as a nice little throwback

## Icons
It's GJ_Gamesheet02 but split into a much more intimidating cluster of a million files. These icons are put together and colored in the monstrosity that is icon.js 

parsePlist.js reads GJ_GameSheet02-uhd.plist and magically transforms it into gameSheet.json. Props to 101arrowz for making this

forms.json is a list of the different icon forms, their ingame filenames, and their index in responses from the GD servers

/iconkit is a folder for the little grey preview icons on the icon kit

## Misc
Inevitable misc folder

**For level analysis**

blocks.json - The object IDs in the different 'families' of blocks

colorProperties.json - Color channel cheatsheet

initialProperties.json - Level settings cheatsheet

objectProperties.json - Object property cheatsheet. Low budget version of [AlFas' one](https://github.com/gd-edit/GDAPI/blob/5a338c317b10ba0cb30d6175360c997a8a72502f/GDAPI/GDAPI/Enumerations/GeometryDash/ObjectParameter.cs)

objects.json - IDs for portals, orbs, triggers, and misc stuff

**Not for level analysis**

colors.json - The colors for generating icons

credits.json - Credits! (shown on the homepage)

gdpsConfig.js - Tweak small settings for GDPS'es here, such as whether to decrypt level descriptions or if timestamps should end with "ago"

level.json - An array of the official GD tracks, and also difficulty face stuff for level searching

mapPacks.json - The IDs for the levels in map packs. I can't believe I have to hardcode this

secretStuff.json - GJP goes here, needed for level leaderboards. Not included in the repo for obvious reasons

sizecheck.js - Excecuted on most pages, used for the 'page isn't wide enough' message, back button, and a few other things

---

happy painting and god bless.
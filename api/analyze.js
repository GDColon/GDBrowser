const pako = require('pako')
const properties = require('../misc/objectProperties.json')
const init = require('../misc/initialProperties.json')
const colorStuff = require('../misc/colorProperties.json')
const ids = require('../misc/objects.json')
const blocks = require('../misc/blocks.json')

module.exports = async (app, req, res, level) => {

let levelString = Buffer.from(level.data, 'base64')
let buffer;
let response = {};

try { buffer = pako.inflate(levelString, {to:"string"}) }
catch(e) { return res.send("-1") }

let rawData = buffer.toString('utf8')
let data = rawData

let blockNames = Object.keys(blocks)
let miscNames = Object.keys(ids.misc)
let blockCounts = {}
let miscCounts = {}

data = data.split(";")

function sortObj(obj, sortBy) {
var sorted = {}
var keys = !sortBy ? Object.keys(obj).sort((a,b) => obj[b] - obj[a]) : Object.keys(obj).sort((a,b) => obj[b][sortBy] - obj[a][sortBy])
keys.forEach(x => {sorted[x] = obj[x]})
return sorted
}

data.forEach((x, y) => {
    obj = app.parseResponse(x, ",")

    let keys = Object.keys(obj)
    keys.forEach((k, i) => {
        if (init.values[k]) k = obj[k][0]
        else if (properties[k]) obj[properties[k]] = obj[k]
        delete obj[k]
    })

    let id = obj.id
    if (ids.portals[id]) obj.portal = ids.portals[id]
    if (ids.orbs[id]) obj.orb = ids.orbs[id]
    if (ids.triggers[id]) obj.trigger = ids.triggers[id]

    blockNames.forEach(b => {
        if (blocks[b].includes(id)) {
            if (!blockCounts[b]) blockCounts[b] = 1
            else blockCounts[b] += 1
        }
    })

    miscNames.forEach(b => {
        if (ids.misc[b].includes(Number(id))) {
            if (!miscCounts[b]) miscCounts[b] = [1, ids.misc[b][0]]
            else miscCounts[b][0] += 1
        }
    })

    data[y] = obj;
})

let last = 0;
let xArr = data.map(x => Number(x.x))
let dl = data.length
while (dl--) {last = xArr[dl] > last ? xArr[dl] : last}

response.level = {
    name: level.name, id: level.id, author: level.author, authorID: level.authorID, accountID: level.accountID, large: level.large
}

response.objects = data.length - 2
response.settings = {}

response.portals = data.filter(x => x.portal).sort(function (a, b) {return parseInt(a.x) - parseInt(b.x)}).map(x => x.portal + " " + Math.round(x.x / last * 99) + "%").join(", ")

response.orbs = {}
orbArray = data.filter(x => x.orb).reduce( (a,b) => { //stolen from https://stackoverflow.com/questions/45064107/how-do-i-group-duplicate-objects-in-an-array
    var i = a.findIndex(x => x.orb === b.orb);
    return i === -1 ? a.push({ orb : b.orb, count : 1 }) : a[i].count++, a;
}, []).sort(function (a, b) {return parseInt(b.count) - parseInt(a.count)})
orbArray.forEach(x => response.orbs[x.orb] = x.count)
response.orbs.total = data.filter(x => x.orb).length

response.triggers = {}
triggerArray = data.filter(x => x.trigger).reduce( (a,b) => {
    var i = a.findIndex(x => x.trigger === b.trigger);
    return i === -1 ? a.push({ trigger : b.trigger, count : 1 }) : a[i].count++, a;
}, []).sort(function (a, b) {return parseInt(b.count) - parseInt(a.count)})
triggerArray.forEach(x => response.triggers[x.trigger] = x.count)
response.triggers.total = data.filter(x => x.trigger).length

response.blocks = sortObj(blockCounts)
response.misc = sortObj(miscCounts, '0')
response.colors = []

Object.keys(data[0]).forEach(x => {
    let val = init.values[x]
    let name = val[0]
    let property = data[0][x]
    if (val[1] == "list") val = init[(val[0] + "s")][property]
    else if (val[1] == "number") val = Number(property)
    else if (val[1] == "bump") val = Number(property) + 1
    else if (val[1] == "bool") val = property != "0"

    // you can only imagine my fear when i discovered this was a thing
    // these literally are keys set the value, and to convert this to the color list we have to do this fun messy thing that shouldn't exist
    else if (val[1] == 'extra-legacy-color') {
        // since i wrote the 1.9 color before this, a lot of explaination will be there instead
        const colorInfo = name.split('-');
        const color = colorInfo[2]; // r,g,b
        const channel = colorInfo[1];

        if (color == 'r') {
            // first we create the color object
            response.colors.push({"channel": channel, "opacity": 1});
        }
        // from here we touch the color object
        let currentChannel = response.colors.find(k => k.channel == channel);
        if (color == 'blend') {
            currentChannel.blending = true; // only one color has blending though lol
        } else if (color == 'pcol' && property != 0) {
            currentChannel.pColor = property;
        }
        currentChannel[color] = property;
    }

    // if a level has a legacy color, we can assume that it does not have a kS38 at all
    else if (val[1] == "legacy-color") {
        color = app.parseResponse(property, "_");

        const keys = Object.keys(color)
        let colorObj = {}

        // so here we parse the color to something understandable by the rest
        // slightly smart naming but it is also pretty gross
        // in a sense - the name would be something like legacy-G -> G
        const colorVal = name.split('-').pop()

        keys.forEach(k => {if (colorStuff.properties[k]) colorObj[colorStuff.properties[k]] = color[k]})

        // if color value is not a number, then it goes through the list of channels to find the channel for the special color
        colorObj.channel = (parseInt(colorVal)) ? colorVal : Object.keys(colorStuff.channels).find(k => colorStuff.channels[k] == colorVal);

        // from here stuff can continue as normal, ish
        if (colorStuff.channels[colorObj.channel]) colorObj.channel = colorStuff.channels[colorObj.channel];
        if (colorObj.channel > 1000) return;
        if (colorObj.pColor == "-1") delete colorObj.pColor;
        colorObj.opacity = 1; // 1.9 colors don't have this!
        if (colorObj.blending && colorObj.blending == '1') colorObj.blending = true; // 1.9 colors manage to always think they're blending - they're not
        else delete colorObj.blending;

        switch (colorVal) {
            /* case 'G': (removed - this lets it fit on a single row for me and that matters more)
                response.colors.push(colorObj);
                // javascript likes to link arrays, but we don't want that
                const g2channel = Object.assign({}, colorObj); // fake ground 2 to make it look nice
                g2channel.channel = 'G2';
                response.colors.push(g2channel);
                break;
            */
            case '3DL':
                // hardcode the position of 3DL, it typically goes at the end due to how RobTop make the headers
                response.colors.splice(5, 0, colorObj);
                break;
            case 'Line':
                colorObj.blending = true; // in line with 2.1 behavior
            default:
                response.colors.push(colorObj); // bruh whatever was done to make the color list originally was long
                break;
        }
    }

    else if (val[1] == "colors") {
        let colorList = property.split("|")
        colorList.forEach((x, y) => {
            color = app.parseResponse(x, "_")
            let keys = Object.keys(color)
            let colorObj = {}
            if (!color['6']) return colorList = colorList.filter((h, i) => y != i)
        
            keys.forEach(k => {if (colorStuff.properties[k]) colorObj[colorStuff.properties[k]] = color[k]})
            if (colorStuff.channels[colorObj.channel]) colorObj.channel = colorStuff.channels[colorObj.channel]
            if (colorObj.channel > 1000) return;
            if (colorStuff.channels[colorObj.copiedChannel]) colorObj.copiedChannel = colorStuff.channels[colorObj.copiedChannel]
            if (colorObj.copiedChannel > 1000) delete colorObj.copiedChannel;
            if (colorObj.pColor == "-1") delete colorObj.pColor
            if (colorObj.blending) colorObj.blending = true
            colorObj.opacity = +Number(colorObj.opacity).toFixed(2)
            colorList[y] = colorObj

            colorList = colorList.filter(x => typeof x == "object")
            if (!colorList.find(x => x.channel == "Obj")) colorList.push({"r": "255", "g": "255", "b": "255", "channel": "Obj", "opacity": "1"})

            let specialSort = ["BG", "G", "G2", "Line", "Obj", "3DL"]
            let specialColors = colorList.filter(x => isNaN(x.channel)).sort(function (a, b) {return specialSort.indexOf( a.channel ) > specialSort.indexOf( b.channel ) } )
            let regularColors = colorList.filter(x => !isNaN(x.channel)).sort(function(a, b) {return (+a.channel) - (+b.channel) } );
            response.colors = specialColors.concat(regularColors)
        })
    }

    response.settings[name] = val
})

if (response.settings.ground == 0 || !response.settings.ground) response.settings.ground = 1
if (response.settings.background == 0 || !response.settings.background) response.settings.background = 1
if (!response.settings.font) response.settings.font = 1

if (response.settings.alternateLine == 2) response.settings.alternateLine = true
else response.settings.alternateLine = false

Object.keys(response.settings).filter(k => {
    // this should be parsed into color list instead
    if (k.includes('legacy')) delete response.settings[k];
});

delete response.settings['colors']
response.text = data.filter(x => x.message).sort(function (a, b) {return parseInt(a.x) - parseInt(b.x)}).map(x => [Buffer.from(x.message, 'base64').toString(), Math.round(x.x / last * 99) + "%"])
response.dataLength = rawData.length
response.data = rawData

return res.send(response)

}
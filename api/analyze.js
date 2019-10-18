const pako = require('pako')
const properties = require('../misc/objectProperties.json')
const init = require('../misc/initialProperties.json')
const colorStuff = require('../misc/colorProperties.json')
const ids = require('../misc/objects.json')
const blocks = require('../misc/blocks.json')

module.exports = async (app, req, res, level) => {

let levelString = new Buffer(level.data, 'base64')
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

response.level = {
    name: level.name, id: level.id, author: level.author, authorID: level.authorID, accountID: level.accountID, large: level.large
}

response.objects = data.length - 2

response.portals = data.filter(x => x.portal).sort(function (a, b) {return parseInt(a.x) - parseInt(b.x)}).map(x => x.portal).join(", ")

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
response.settings = {}
response.colors = []

Object.keys(data[0]).forEach(x => {
    let val = init.values[x]
    let name = val[0]
    let property = data[0][x]
    if (val[1] == "list") val = init[(val[0] + "s")][property]
    else if (val[1] == "number") val = Number(property)
    else if (val[1] == "bump") val = Number(property) + 1
    else if (val[1] == "bool") val = property != "0"

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


delete response.settings['colors']
response.dataLength = rawData.length
response.data = rawData

return res.send(response)

}
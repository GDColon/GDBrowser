const zlib = require('zlib')
const blocks = require('../misc/analysis/blocks.json')
const colorStuff = require('../misc/analysis/colorProperties.json')
const init = require('../misc/analysis/initialProperties.json')
const properties = require('../misc/analysis/objectProperties.json')
const ids = require('../misc/analysis/objects.json')

module.exports = async (app, req, res, level) => {
    let unencrypted = level.data.startsWith('kS') // some gdps'es don't encrypt level data
    let levelString = unencrypted ? level.data : Buffer.from(level.data, 'base64')

    if (unencrypted) {
        const raw_data = level.data;

        const response_data = analyze_level(level, raw_data);
        return res.send(response_data);
    } else {
        zlib.unzip(levelString, (err, buffer) => {
            if (err) { return res.send("-2"); }

            const raw_data = buffer.toString();
            const response_data = analyze_level(level, raw_data);
            return res.send(response_data);
        });
    }
}

function sortObj(obj, sortBy) {
    var sorted = {}
    var keys = !sortBy ? Object.keys(obj).sort((a,b) => obj[b] - obj[a]) : Object.keys(obj).sort((a,b) => obj[b][sortBy] - obj[a][sortBy])
    keys.forEach(x => {sorted[x] = obj[x]})
    return sorted
}

function parse_obj(obj, splitter, name_arr, valid_only) {
    const s_obj = obj.split(splitter);
    let robtop_obj = {};

    // semi-useless optimization depending on where at node js you're at
    for (let i = 0, obj_l = s_obj.length; i < obj_l; i += 2) {
        let k_name = s_obj[i];
        if (s_obj[i] in name_arr) {
            if (!valid_only) {
                k_name = name_arr[s_obj[i]];
            }
            robtop_obj[k_name] = s_obj[i + 1];
        }
    }
    return robtop_obj;
}

function analyze_level(level, rawData) {
    let response = {};

    let blockCounts = {}
    let miscCounts = {}
    let triggerGroups = []
    let highDetail = 0
    let alphaTriggers = []

    let misc_objects = {};
    let block_ids = {};

    for (const [name, object_ids] of Object.entries(ids.misc)) {
        const copied_ids = object_ids.slice(1);
        // funny enough, shift effects the original id list
        copied_ids.forEach((object_id) => {
            misc_objects[object_id] = name;
        });
    }

    for (const [name, object_ids] of Object.entries(blocks)) {
        object_ids.forEach((object_id) => {
            block_ids[object_id] = name;
        });
    }

    const data = rawData.split(";");
    const header = data.shift();

    let level_portals = [];
    let level_coins = [];
    let level_text = [];

    let orb_array = {};
    let trigger_array = {};

    let last = 0;

    const obj_length = data.length;
    for (let i = 0; i < obj_length; ++i) {
        obj = parse_obj(data[i], ',', properties);

        let id = obj.id

        if (id in ids.portals) {
            obj.portal = ids.portals[id];
            level_portals.push(obj);
        } else if (id in ids.coins) {
            obj.coin = ids.coins[id];
            level_coins.push(obj);
        } else if (id in ids.orbs) {
            obj.orb = ids.orbs[id];

            if (obj.orb in orb_array) {
                orb_array[obj.orb]++;
            } else {
                orb_array[obj.orb] = 1;
            }
        } else if (id in ids.triggers) {
            obj.trigger = ids.triggers[id];

            if (obj.trigger in trigger_array) {
                trigger_array[obj.trigger]++;
            } else {
                trigger_array[obj.trigger] = 1;
            }
        }

        if (obj.message) {
            level_text.push(obj)
        }

        if (obj.triggerGroups) obj.triggerGroups.split('.').forEach(x => triggerGroups.push(x))
        if (obj.highDetail == 1) highDetail += 1

        if (id in misc_objects) {
            const name = misc_objects[id];
            if (name in miscCounts) {
                miscCounts[name][0] += 1;
            } else {
                miscCounts[name] = [1, ids.misc[name][0]];
            }
        }

        if (id in block_ids) {
            const name = block_ids[id];
            if (name in blockCounts) {
                blockCounts[name] += 1;
            } else {
                blockCounts[name] = 1;
            }
        }

        if (obj.x) { // sometimes the field doesn't exist
            last = Math.max(last, obj.x);
        }

        if (obj.trigger == "Alpha") { // invisible triggers
            alphaTriggers.push(obj)
        }

        data[i] = obj;
    }

    let invisTriggers = []
    alphaTriggers.forEach(tr => {
        if (tr.x < 500 && !tr.touchTriggered && !tr.spawnTriggered && tr.opacity == 0 && tr.duration == 0
            && alphaTriggers.filter(x => x.targetGroupID == tr.targetGroupID).length == 1) invisTriggers.push(Number(tr.targetGroupID))
    })

    response.level = {
        name: level.name, id: level.id, author: level.author, playerID: level.playerID, accountID: level.accountID, large: level.large
    }

    response.objects = data.length - 2
    response.highDetail = highDetail
    response.settings = {}

    response.portals = level_portals.sort(function (a, b) {return parseInt(a.x) - parseInt(b.x)}).map(x => x.portal + " " + Math.floor(x.x / (Math.max(last, 529.0) + 340.0) * 100) + "%").join(", ")
    response.coins = level_coins.sort(function (a, b) {return parseInt(a.x) - parseInt(b.x)}).map(x => Math.floor(x.x / (Math.max(last, 529.0) + 340.0) * 100))
    response.coinsVerified = level.verifiedCoins

    response.orbs = orb_array
    response.orbs.total = Object.values(orb_array).reduce((a, x) => a + x, 0); // we already have an array of objects, use it

    response.triggers = trigger_array
    response.triggers.total = Object.values(trigger_array).reduce((a, x) => a + x, 0);

    response.triggerGroups = {}
    response.blocks = sortObj(blockCounts)
    response.misc = sortObj(miscCounts, '0')
    response.colors = []

    triggerGroups.forEach(x => {
        if (response.triggerGroups['Group ' + x]) response.triggerGroups['Group ' + x] += 1
        else response.triggerGroups['Group ' + x] = 1
    })

    response.triggerGroups = sortObj(response.triggerGroups)
    let triggerKeys = Object.keys(response.triggerGroups).map(x => Number(x.slice(6)))
    response.triggerGroups.total = triggerKeys.length

    // find alpha group with the most objects
    response.invisibleGroup = triggerKeys.find(x => invisTriggers.includes(x))

    response.text = level_text.sort(function (a, b) {return parseInt(a.x) - parseInt(b.x)}).map(x => [Buffer.from(x.message, 'base64').toString(), Math.round(x.x / last * 99) + "%"])

    const header_response = parse_header(header);
    response.settings = header_response.settings;
    response.colors = header_response.colors;

    response.dataLength = rawData.length
    response.data = rawData

    return response;
}

function parse_header(header) {
    let response = {};
    response.settings = {};
    response.colors = [];

    const header_keyed = parse_obj(header, ',', init.values, true);

    Object.keys(header_keyed).forEach(x => {
        let val = init.values[x]
        let name = val[0]
        let property = header_keyed[x]
        switch (val[1]) {
            case 'list':
                val = init[(val[0] + "s")][property];
                break;
            case 'number':
                val = Number(property);
                break;
            case 'bump':
                val = Number(property) + 1;
                break;
            case 'bool':
                val = property != "0";
                break;
            case 'extra-legacy-color': { // scope?
                // you can only imagine my fear when i discovered this was a thing
                // these literally are keys set the value, and to convert this to the color list we have to do this fun messy thing that shouldn't exist
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
                break;
            }
            case 'legacy-color': {
                // if a level has a legacy color, we can assume that it does not have a kS38 at all
                const color = parse_obj(property, "_", colorStuff.properties);

                let colorObj = color

                // so here we parse the color to something understandable by the rest
                // slightly smart naming but it is also pretty gross
                // in a sense - the name would be something like legacy-G -> G
                const colorVal = name.split('-').pop()

                colorObj.channel = colorVal

                // from here stuff can continue as normal, ish
                if (colorObj.pColor == "-1" || colorObj.pColor == "0") delete colorObj.pColor;
                colorObj.opacity = 1; // 1.9 colors don't have this!
                if (colorObj.blending && colorObj.blending == '1') colorObj.blending = true; // 1.9 colors manage to always think they're blending - they're not
                else delete colorObj.blending;

                if (colorVal == '3DL') { response.colors.splice(4, 0, colorObj); } // hardcode the position of 3DL, it typically goes at the end due to how RobTop make the headers
                else if (colorVal == 'Line') { colorObj.blending = true; response.colors.push(colorObj); }  // in line with 2.1 behavior
                else { response.colors.push(colorObj); } // bruh whatever was done to make the color list originally was long
                break;
            }
            case 'colors': {
                let colorList = property.split("|")
                colorList.forEach((x, y) => {
                    const color = parse_obj(x, "_", colorStuff.properties)
                    let colorObj = color
                    if (!color.channel) return colorList = colorList.filter((h, i) => y != i)

                    if (colorStuff.channels[colorObj.channel]) colorObj.channel = colorStuff.channels[colorObj.channel]
                    if (colorObj.channel > 1000) return;
                    if (colorStuff.channels[colorObj.copiedChannel]) colorObj.copiedChannel = colorStuff.channels[colorObj.copiedChannel]
                    if (colorObj.copiedChannel > 1000) delete colorObj.copiedChannel;
                    if (colorObj.pColor == "-1") delete colorObj.pColor
                    if (colorObj.blending) colorObj.blending = true
                    if (colorObj.copiedHSV) {
                        let hsv = colorObj.copiedHSV.split("a")
                        colorObj.copiedHSV = {}
                        hsv.forEach((x, y) => { colorObj.copiedHSV[colorStuff.hsv[y]] = x })
                        colorObj.copiedHSV['s-checked'] = colorObj.copiedHSV['s-checked'] == 1
                        colorObj.copiedHSV['v-checked'] = colorObj.copiedHSV['v-checked'] == 1
                    if (colorObj.copyOpacity == 1) colorObj.copyOpacity = true
                    }
                    colorObj.opacity = +Number(colorObj.opacity).toFixed(2)
                    colorList[y] = colorObj
                });
                // we assume this is only going to be run once so... some stuff can go here
                colorList = colorList.filter(x => typeof x == "object")
                if (!colorList.find(x => x.channel == "Obj")) colorList.push({"r": "255", "g": "255", "b": "255", "channel": "Obj", "opacity": "1"})

                const specialSort = ["BG", "G", "G2", "Line", "Obj", "3DL"]
                let specialColors = colorList.filter(x => isNaN(x.channel)).sort(function (a, b) {return specialSort.indexOf( a.channel ) > specialSort.indexOf( b.channel ) } )
                let regularColors = colorList.filter(x => !isNaN(x.channel)).sort(function(a, b) {return (+a.channel) - (+b.channel) } );
                response.colors = specialColors.concat(regularColors)
                break;
            }
        }
        response.settings[name] = val
    })

    if (!response.settings.ground || response.settings.ground > 17) response.settings.ground = 1
    if (!response.settings.background || response.settings.background > 20) response.settings.background = 1
    if (!response.settings.font) response.settings.font = 1

    if (response.settings.alternateLine == 2) response.settings.alternateLine = true
    else response.settings.alternateLine = false

    Object.keys(response.settings).filter(k => {
        // this should be parsed into color list instead
        if (k.includes('legacy')) delete response.settings[k];
    });

    delete response.settings['colors'];
    return response;
}

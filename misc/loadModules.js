// Loads all the modules in /api
module.exports = () => {
    const readdir = require("directory-tree");

    let buildModules = src => {

        let data = {};

        src = src.children || src;

        src.forEach(f => {
            if (!f.name.includes("!")) {
                if ((f.type === "file") && (f.extension === ".js")) data[f.name.replace(/\.js/g, "")] = require(`../${f.path}`);
                else if (f.type === "directory") data[f.name] = buildModules(f);
            }
        });

        return data;
    }

    let tree = readdir("./api").children;
    return buildModules(tree);
}